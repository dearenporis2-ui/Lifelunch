// World assets load only when the user opens World. The room model stays lazy
// until they choose to step inside.
import * as THREE from '../../assets/vendor/three/three.module.js';
import { GLTFLoader } from '../../assets/vendor/three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../assets/vendor/three/addons/utils/BufferGeometryUtils.js';

let activeWorld = null;
const INTRO_KEY = 'lifelaunch.worldIntro.v1';
const MIN_WORLD_ZOOM = .32;
const MAX_WORLD_ZOOM = 2.8;
const introSeen = () => { try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } };
const MODEL_URLS = {
  exterior: new URL('../../assets/world/models/medieval_fantasy_tavern.glb', import.meta.url).href,
  interior: new URL('../../assets/world/models/tiny_isometric_room.glb', import.meta.url).href,
};
const SPEC_GLOSS = 'KHR_materials_pbrSpecularGlossiness';

function createLoader() {
  const loader = new GLTFLoader();
  // Sketchfab exported the tavern with the older specular/glossiness workflow.
  // Convert its diffuse color/texture into Three.js' current standard material.
  loader.register(parser => ({
    name: SPEC_GLOSS,
    getMaterialType(index) {
      return parser.json.materials[index]?.extensions?.[SPEC_GLOSS] ? THREE.MeshStandardMaterial : null;
    },
    extendMaterialParams(index, params) {
      const ext = parser.json.materials[index]?.extensions?.[SPEC_GLOSS];
      if (!ext) return Promise.resolve();
      if (ext.diffuseFactor) params.color = new THREE.Color().setRGB(...ext.diffuseFactor.slice(0, 3), THREE.LinearSRGBColorSpace);
      params.roughness = THREE.MathUtils.clamp(1 - (ext.glossinessFactor ?? 0), .08, 1);
      params.metalness = 0;
      return ext.diffuseTexture
        ? parser.assignTexture(params, 'map', ext.diffuseTexture, THREE.SRGBColorSpace)
        : Promise.resolve();
    },
  }));
  return loader;
}

// The tavern is exported as 1,302 tiny meshes. Batch static pieces that share
// a material and vertex layout to cut mobile draw calls while preserving looks.
function batchStaticModel(source, { batch = true } = {}) {
  source.updateMatrixWorld(true);
  const batches = new Map(), loose = [], oldGeometry = new Set();
  source.traverse(node => {
    if (!node.isMesh) return;
    oldGeometry.add(node.geometry);
    const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    const attrs = Object.keys(geometry.attributes).sort().map(key => `${key}:${geometry.attributes[key].itemSize}`).join('|');
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    // Blending relies on per-object depth sorting. Combining transparent pieces
    // into one large mesh can make nearby room surfaces draw in the wrong order.
    const hasSpecialRenderState = materials.some(material => material.transparent || material.opacity < 1 || material.alphaTest > 0 || material.depthWrite === false || material.blending !== THREE.NormalBlending);
    if (!batch || node.isSkinnedMesh || node.morphTargetInfluences || materials.length !== 1 || hasSpecialRenderState) {
      loose.push({ geometry, material: node.material });
      return;
    }
    const material = materials[0], key = `${material.uuid}|${attrs}|${Boolean(geometry.index)}`;
    if (!batches.has(key)) batches.set(key, { material, geometries: [] });
    batches.get(key).geometries.push(geometry);
  });

  const mergedRoot = new THREE.Group();
  let batchedCount = 0;
  for (const { material, geometries } of batches.values()) {
    const merged = geometries.length > 1 ? mergeGeometries(geometries, false) : geometries[0];
    if (merged) {
      mergedRoot.add(new THREE.Mesh(merged, material));
      batchedCount++;
      if (geometries.length > 1) geometries.forEach(geometry => geometry.dispose());
    } else {
      geometries.forEach(geometry => mergedRoot.add(new THREE.Mesh(geometry, material)));
    }
  }
  loose.forEach(item => mergedRoot.add(new THREE.Mesh(item.geometry, item.material)));
  oldGeometry.forEach(geometry => geometry.dispose());
  return { root: mergedRoot, batches: batchedCount };
}

function disposeModel(root) {
  if (!root) return;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => texture.dispose());
}

function placeModel(model, camera, aspect, framingZoom = 1) {
  model.position.set(0, 0, 0); model.scale.setScalar(1); model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const visibleWidth = (14.8 * aspect) / framingZoom, visibleHeight = 14.8 / framingZoom;
  const desired = Math.min(visibleWidth * .82, visibleHeight * .72);
  const modelSpan = Math.max(size.x, size.z, size.y * .86, .01);
  const scale = desired / modelSpan;
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale + .08, -center.z * scale);
  const framedHeight = Math.max(size.y * scale, desired * .34);
  const target = new THREE.Vector3(0, framedHeight * .46, 0);
  return { target, height: framedHeight };
}

function makeContactShadowTexture() {
  const image = document.createElement('canvas'); image.width = image.height = 128;
  const paint = image.getContext('2d'), glow = paint.createRadialGradient(64, 64, 3, 64, 64, 63);
  glow.addColorStop(0, 'rgba(34, 25, 17, 0.42)');
  glow.addColorStop(.32, 'rgba(34, 25, 17, 0.25)');
  glow.addColorStop(.72, 'rgba(34, 25, 17, 0.07)');
  glow.addColorStop(1, 'rgba(22, 34, 29, 0)');
  paint.fillStyle = glow; paint.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(image);
}

function makeSmokeTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
  const context = canvas.getContext('2d'), gradient = context.createRadialGradient(48, 48, 4, 48, 48, 46);
  gradient.addColorStop(0, 'rgba(255,255,255,.62)'); gradient.addColorStop(.38, 'rgba(255,255,255,.36)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function makeOutdoorLife(scene, asset, camera, reducedMotion) {
  if (reducedMotion) return null;
  const bounds = new THREE.Box3().setFromObject(asset), size = bounds.getSize(new THREE.Vector3());
  const anchor = asset.userData.chimneyAnchor ? asset.localToWorld(asset.userData.chimneyAnchor.clone()) : new THREE.Vector3(bounds.min.x + size.x * .68, bounds.max.y - size.y * .12, bounds.min.z + size.z * .36);
  const smokeTexture = makeSmokeTexture(), smokeMaterial = new THREE.SpriteMaterial({ map: smokeTexture, color: '#71877e', transparent: true, opacity: 0, depthWrite: false, fog: true });
  const puffs = Array.from({ length: 13 }, (_, i) => {
    const sprite = new THREE.Sprite(smokeMaterial.clone()); sprite.position.copy(anchor); sprite.scale.setScalar(.2); sprite.renderOrder = 4; scene.add(sprite);
    return { sprite, age: i / 13 * 2.6, drift: (Math.random() - .5) * .2, sway: Math.random() * Math.PI * 2 };
  });
  const birdMaterial = new THREE.LineBasicMaterial({ color: '#557c72', transparent: true, opacity: .72, depthWrite: false });
  const birds = Array.from({ length: 3 }, (_, index) => {
    const bird = new THREE.Group(), wing = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.19, .08, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(.19, .08, 0)]);
    bird.add(new THREE.Line(wing, birdMaterial));
    bird.position.set(bounds.min.x - 1.2 - index * 2.2, bounds.max.y + 1.3 + index * .42, bounds.min.z + size.z * (.3 + index * .16));
    bird.userData = { startX: bird.position.x, endX: bounds.max.x + 2.5, baseY: bird.position.y, speed: .52 + index * .12, phase: index * 1.9 }; scene.add(bird); return bird;
  });
  let elapsed = 0;
  return {
    update(dt) {
      elapsed += dt;
      for (const puff of puffs) {
        puff.age = (puff.age + dt) % 2.6; const t = puff.age / 2.6, rise = t * 1.8;
        puff.sprite.position.set(anchor.x + puff.drift + Math.sin(elapsed * .8 + puff.sway) * (.06 + t * .12), anchor.y + rise, anchor.z + Math.cos(elapsed * .55 + puff.sway) * .07);
        puff.sprite.material.opacity = Math.min(1, t * 5, (1 - t) * 3.2) * .5; puff.sprite.scale.setScalar(.22 + t * .55);
      }
      for (const bird of birds) {
        const data = bird.userData; bird.position.x += data.speed * dt;
        if (bird.position.x > data.endX) bird.position.x = data.startX;
        bird.position.y = data.baseY + Math.sin(elapsed * 1.8 + data.phase) * .08; bird.quaternion.copy(camera.quaternion);
      }
    },
    dispose() {
      puffs.forEach(({ sprite }) => { scene.remove(sprite); sprite.material.dispose(); });
      birds.forEach(bird => { scene.remove(bird); bird.children.forEach(child => child.geometry.dispose()); });
      smokeTexture.dispose(); smokeMaterial.dispose(); birdMaterial.dispose();
    }
  };
}

function createRoomInteractable(asset, names, label, sound, shadowTexture) {
  const objects = names.map(name => asset.getObjectByName(name)).filter(Boolean);
  if (!objects.length) return null;
  asset.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  objects.forEach(object => bounds.expandByObject(object));
  const worldCenter = bounds.getCenter(new THREE.Vector3());
  const center = asset.worldToLocal(worldCenter.clone());
  const size = bounds.getSize(new THREE.Vector3());
  const floor = asset.worldToLocal(new THREE.Vector3(worldCenter.x, bounds.min.y + .008, worldCenter.z));
  const shadowWidth = Math.max(size.x, size.z, .04) * (label === 'pouf' ? 1.65 : 1.4);
  const shadowDepth = Math.max(size.x, size.z, .04) * (label === 'pouf' ? 1.18 : 1.05);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, color: '#342920', transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, toneMapped: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
  shadow.name = `contact_shadow_${label}`; shadow.rotation.x = -Math.PI / 2; shadow.position.copy(floor);
  shadow.scale.set(shadowWidth, shadowDepth, 1); shadow.renderOrder = 2; asset.add(shadow);
  shadow.userData.baseOpacity = .2; shadow.userData.baseScaleX = shadowWidth; shadow.userData.baseScaleY = shadowDepth;
  const pivot = new THREE.Group();
  pivot.name = `interaction_${label}`;
  asset.add(pivot); pivot.position.copy(center); asset.updateMatrixWorld(true);
  objects.forEach(object => pivot.attach(object));
  return { pivot, objects, shadow, shadowPosition: shadow.position.clone(), label, sound, size, basePosition: pivot.position.clone(), baseX: pivot.rotation.x, baseZ: pivot.rotation.z, baseScale: pivot.scale.clone(), effect: null };
}

export function renderWorld(root, ctx = {}) {
  if (activeWorld) activeWorld();
  root.innerHTML = `<section class="world-page">
    <div class="world-topline"><a class="world-back" href="#/dashboard" aria-label="Back to Home">← <span>Home</span></a><div class="world-heading"><span class="world-kicker">A LITTLE PLACE TO GROW</span><h1>Your World</h1><p>Your home, ready to grow with you.</p></div><div class="world-progress"><span class="world-progress-icon">✦</span><span><b data-world-mode-title>Your home</b><small data-world-mode-subtitle>Outside view</small></span></div></div>
    <div class="world-stage" aria-label="Interactive 3D home">
      <div class="world-loading"><span class="world-loader"></span><b data-world-load-title>Preparing your home…</b><small data-world-load-copy>The 3D model loads the first time you visit.</small></div>
      <canvas class="world-canvas" aria-label="3D view of your home. Drag to look around, or tap the home to step inside."></canvas>
      <div class="world-scene-label"><span class="world-label-dot"></span><span data-world-model-label>Your home</span><small data-world-model-subtitle>Exterior preview</small></div>
      <div class="world-controls" aria-label="World controls"><button type="button" data-world-zoom="in" aria-label="Zoom in">+</button><button type="button" data-world-zoom="out" aria-label="Zoom out">−</button><button type="button" data-world-reset aria-label="Reset view">↻</button></div>
      <button type="button" class="world-ambience-toggle" data-world-ambience aria-label="Turn outdoor ambience on" aria-pressed="false" title="Turn outdoor ambience on">♪</button>
      <button class="world-enter-home" type="button" data-world-enter disabled>Loading home… <span aria-hidden="true">↗</span></button>
      <div class="world-drag-hint"><span>↔</span><span data-world-hint>Drag to look around · tap home to enter</span></div>
    </div>
    <div class="world-bottomline"><div><span class="world-kicker">YOUR STORY STARTS SMALL</span><h2 data-world-caption>Room to dream. Space to grow.</h2><p data-world-description>Upgrade your home as your journey grows. Tap it to take a look inside.</p></div><a class="btn world-return" href="#/dashboard">Back to your launchpad <span aria-hidden="true">→</span></a></div>
    <p class="world-credits">3D models: <a href="https://sketchfab.com/3d-models/medieval-fantasy-tavern-eea5d10fea01404587a1b5703784bb0b" target="_blank" rel="noopener">Medieval Fantasy Tavern</a> by EddyNL and <a href="https://sketchfab.com/3d-models/tiny-isometric-room-6db0b351424141099e30834c6115f40a" target="_blank" rel="noopener">Tiny Isometric Room</a> by 3DECraft, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</p>
  </section>`;
  const canvas = root.querySelector('.world-canvas'), loading = root.querySelector('.world-loading'), enterButton = root.querySelector('[data-world-enter]');
  const modeTitle = root.querySelector('[data-world-mode-title]'), modeSubtitle = root.querySelector('[data-world-mode-subtitle]');
  const modelLabel = root.querySelector('[data-world-model-label]'), modelSubtitle = root.querySelector('[data-world-model-subtitle]');
  const loadTitle = root.querySelector('[data-world-load-title]'), loadCopy = root.querySelector('[data-world-load-copy]');
  const caption = root.querySelector('[data-world-caption]'), description = root.querySelector('[data-world-description]');
  let renderer, observer, disposed = false, introTimer = 0, introOverlay = null, transitionRaf = 0, interactionRaf = 0, outdoorRaf = 0, outdoorLife = null, outdoorLast = 0, ambienceWanted = false, transitioning = false;
  let theta = Math.PI / 4, phi = .94, zoom = matchMedia('(max-width: 720px)').matches ? .68 : 1;
  let cameraDistance = 22;
  const defaultZoom = zoom;
  let target = new THREE.Vector3(0, 1.6, 0), exterior = null, interior = null, activeAsset = null, mode = 'outside', loadingInterior = false;
  let dragging = false, downX = 0, downY = 0, lastX = 0, lastY = 0, roomInteractables = [];
  const roomShadowTexture = makeContactShadowTexture();
  const worldHint = root.querySelector('[data-world-hint]');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#d7f4e8'); scene.fog = new THREE.Fog('#d7f4e8', 30, 60);
  const camera = new THREE.OrthographicCamera(-9, 9, 7.4, -7.4, .1, 100);
  const updateCamera = () => {
    const radius = cameraDistance, sinPhi = Math.sin(phi);
    camera.position.set(target.x + radius * sinPhi * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * sinPhi * Math.cos(theta));
    camera.lookAt(target); camera.zoom = zoom; camera.updateProjectionMatrix();
  };
  updateCamera();
  scene.add(new THREE.HemisphereLight('#e9fff7', '#9c744c', 2.2));
  const sun = new THREE.DirectionalLight('#fff1cf', 3.2); sun.position.set(-7, 13, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14; sun.shadow.bias = -.0004; scene.add(sun);

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true; renderer.shadowMap.autoUpdate = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch (err) {
    console.error('Unable to initialize the LifeLaunch world:', err);
    loading.innerHTML = '<b>This device could not open the 3D home.</b><small>Try a newer browser or another device.</small>'; loading.classList.add('world-load-error');
    return;
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const aspect = rect.width / rect.height, h = 7.4;
    camera.left = -h * aspect; camera.right = h * aspect; camera.top = h; camera.bottom = -h; camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height, false);
    if (activeAsset) {
      const framed = placeModel(activeAsset, camera, aspect, defaultZoom); target.copy(framed.target); updateCamera();
    }
  };
  observer = new ResizeObserver(resize); observer.observe(canvas); resize();

  const loader = createLoader();
  const loadAsset = async (kind) => {
    loadTitle.textContent = kind === 'exterior' ? 'Loading your home…' : 'Opening your room…';
    loadCopy.textContent = kind === 'exterior' ? 'Your home loads only when you visit World.' : 'The room model downloads only when you step inside.';
    loading.hidden = false;
    try {
      const gltf = await loader.loadAsync(MODEL_URLS[kind], event => {
        if (event.total) loadCopy.textContent = `Loading 3D model · ${Math.round(event.loaded / event.total * 100)}%`;
      });
      let chimneyAnchor = null;
      if (kind === 'exterior') {
        gltf.scene.updateMatrixWorld(true); let chimneyTop = -Infinity;
        gltf.scene.traverse(node => {
          if (!node.isMesh || !/chimney/i.test(node.name)) return;
          const bounds = new THREE.Box3().setFromObject(node);
          if (!bounds.isEmpty() && bounds.max.y > chimneyTop) {
            chimneyTop = bounds.max.y;
            chimneyAnchor = new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, bounds.max.y + .12, (bounds.min.z + bounds.max.z) / 2);
          }
        });
      }
      if (kind === 'interior') {
        // The furniture texture is almost entirely opaque, with only sparse
        // transparent pixels for cutout edges. Treat it as alpha-tested so the
        // blanket/laptop do not get sorted as translucent layers while orbiting.
        const roomMaterials = new Set();
        gltf.scene.traverse(node => {
          if (!node.isMesh) return;
          for (const material of (Array.isArray(node.material) ? node.material : [node.material])) roomMaterials.add(material);
          if (/ray/i.test(node.name)) {
            node.receiveShadow = false;
            for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
              if (material.transparent || material.opacity < 1) material.depthWrite = false;
            }
            node.castShadow = false;
          } else {
            // Use the soft animated contact shadows below instead of realtime
            // shadow maps: this GLB's overlapping cutaway meshes produce hard,
            // nearly black contact artifacts under directional shadow maps.
            node.castShadow = false;
            node.receiveShadow = false;
          }
        });
        for (const material of roomMaterials) {
          if (material.name === 'equipment_material') {
            material.transparent = false; material.alphaTest = .5; material.depthWrite = true; material.needsUpdate = true;
          }
        }
      }
      // Preserve the room's named hierarchy so props can be selected and
      // animated around their own centers. The room is light; only the large
      // exterior needs static mesh batching.
      const optimized = kind === 'interior' ? { root: gltf.scene, batches: 0 } : batchStaticModel(gltf.scene);
      if (disposed) { disposeModel(optimized.root); return null; }
      optimized.root.userData.batches = optimized.batches;
      if (chimneyAnchor) optimized.root.userData.chimneyAnchor = chimneyAnchor;
      return optimized.root;
    } catch (err) {
      console.error(`Unable to load the LifeLaunch ${kind} model:`, err);
      loadTitle.textContent = kind === 'exterior' ? 'Could not load your home' : 'Could not open this room';
      loadCopy.textContent = 'Check the model file and refresh to try again.';
      return null;
    }
  };
  const activate = (asset, nextMode) => {
    if (!asset || disposed) return;
    if (activeAsset) scene.remove(activeAsset);
    activeAsset = asset; mode = nextMode; scene.add(asset);
    if (outdoorRaf) { cancelAnimationFrame(outdoorRaf); outdoorRaf = 0; }
    outdoorLife?.dispose(); outdoorLife = null; outdoorLast = 0;
    ctx.audio?.stopWorldAmbience?.();
    // This room is an open-front cutaway. Orbiting around to the closed back
    // makes its solid exterior walls cover the bed and desk, so keep the room
    // camera in the two open-front viewing quadrants.
    theta = Math.PI / 4; phi = .94; cameraDistance = 22;
    const rect = canvas.getBoundingClientRect(), framed = placeModel(asset, camera, rect.width / Math.max(rect.height, 1), defaultZoom);
    target.copy(framed.target); updateCamera();
    const isRoom = mode === 'inside';
    ambienceButton.hidden = isRoom;
    if (!isRoom) {
      roomInteractables.forEach(item => {
        item.effect = null;
        item.pivot.position.copy(item.basePosition);
        item.pivot.rotation.set(item.baseX, 0, item.baseZ);
        item.pivot.scale.copy(item.baseScale);
        item.shadow.position.copy(item.shadowPosition); item.shadow.material.opacity = item.shadow.userData.baseOpacity;
        item.shadow.scale.set(item.shadow.userData.baseScaleX, item.shadow.userData.baseScaleY, 1);
      });
      if (interactionRaf) { cancelAnimationFrame(interactionRaf); interactionRaf = 0; }
    }
    modeTitle.textContent = isRoom ? 'Inside your home' : 'Your home';
    modeSubtitle.textContent = isRoom ? 'Room view' : 'Outside view';
    modelLabel.textContent = isRoom ? 'Your room' : 'Your home';
    modelSubtitle.textContent = isRoom ? 'Interior preview' : 'Exterior preview';
    caption.textContent = isRoom ? 'A little room of your own.' : 'Room to dream. Space to grow.';
    description.textContent = isRoom ? 'Take a look around. More home spaces can be added as LifeLaunch grows.' : 'Upgrade your home as your journey grows. Tap it to take a look inside.';
    if (isRoom && !roomInteractables.length) {
      roomInteractables = [
        createRoomInteractable(asset, ['laptop_lowpoly'], 'laptop', 'worldLaptop', roomShadowTexture),
        createRoomInteractable(asset, ['pouf_legs_lowpoly', 'pouf_seat_lowpoly'], 'pouf', 'worldPouf', roomShadowTexture)
      ].filter(Boolean);
    }
    if (isRoom) {
      worldHint.textContent = 'Drag to look around · tap the laptop or pouf';
      description.textContent = 'Tap the laptop or pouf for a little surprise. More room interactions are on the way.';
      canvas.setAttribute('aria-label', 'Your room. Drag to look around, or tap the laptop or pouf to animate it.');
    } else {
      worldHint.textContent = 'Drag to look around · tap home to enter';
      canvas.setAttribute('aria-label', '3D view of your home. Drag to look around, or tap the home to step inside.');
    }
    enterButton.innerHTML = isRoom ? 'Back outside <span aria-hidden="true">↙</span>' : 'Step inside <span aria-hidden="true">↗</span>';
    enterButton.disabled = false; loading.hidden = true; renderer.render(scene, camera);
    if (!isRoom && !document.hidden) { startOutdoorLife(); if (ambienceWanted) ctx.audio?.startWorldAmbience?.(); }
  };
  function animateOutdoorLife(now) {
    outdoorRaf = 0;
    if (disposed || mode !== 'outside' || document.hidden || !outdoorLife) return;
    const dt = outdoorLast ? Math.min((now - outdoorLast) / 1000, .05) : 1 / 60;
    outdoorLast = now; outdoorLife.update(dt); renderer.render(scene, camera);
    outdoorRaf = requestAnimationFrame(animateOutdoorLife);
  }
  function startOutdoorLife() {
    if (!exterior || mode !== 'outside' || disposed) return;
    if (!outdoorLife) outdoorLife = makeOutdoorLife(scene, exterior, camera, matchMedia('(prefers-reduced-motion: reduce)').matches);
    outdoorLast = 0;
    if (outdoorLife && !outdoorRaf) outdoorRaf = requestAnimationFrame(animateOutdoorLife);
  }
  const transitionTo = async nextMode => {
    if (transitioning || disposed) return;
    const nextAsset = nextMode === 'inside' ? interior : exterior;
    if (!nextAsset) return;
    transitioning = true; enterButton.disabled = true; canvas.classList.add('is-transitioning');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startZoom = zoom, transitionZoom = Math.min(MAX_WORLD_ZOOM, startZoom * 1.12);
    if (!reduceMotion) {
      const start = performance.now(), duration = 660;
      await new Promise(resolve => {
        const tick = now => {
          if (disposed) { resolve(); return; }
          const progress = Math.min(1, (now - start) / duration);
          const eased = progress * progress * (3 - 2 * progress);
          cameraDistance = THREE.MathUtils.lerp(22, 7.5, eased);
          zoom = THREE.MathUtils.lerp(startZoom, transitionZoom, eased);
          const veil = THREE.MathUtils.clamp((progress - .58) / .42, 0, 1);
          canvas.style.opacity = String(1 - veil);
          canvas.style.filter = `blur(${veil * 8}px)`;
          canvas.style.transform = `scale(${1 + veil * .035})`;
          updateCamera(); renderer.render(scene, camera);
          if (progress < 1) transitionRaf = requestAnimationFrame(tick); else resolve();
        };
        transitionRaf = requestAnimationFrame(tick);
      });
    }
    if (disposed) return;
    loading.hidden = true;
    activate(nextAsset, nextMode);
    enterButton.disabled = true;
    if (!reduceMotion) {
      const start = performance.now(), duration = 440;
      await new Promise(resolve => {
        const tick = now => {
          if (disposed) { resolve(); return; }
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          canvas.style.opacity = String(eased);
          canvas.style.filter = `blur(${(1 - eased) * 8}px)`;
          canvas.style.transform = `scale(${1 + (1 - eased) * .035})`;
          zoom = THREE.MathUtils.lerp(transitionZoom, startZoom, eased); updateCamera(); renderer.render(scene, camera);
          if (progress < 1) transitionRaf = requestAnimationFrame(tick); else resolve();
        };
        transitionRaf = requestAnimationFrame(tick);
      });
    }
    zoom = startZoom; updateCamera();
    canvas.style.opacity = ''; canvas.style.filter = ''; canvas.style.transform = '';
    canvas.classList.remove('is-transitioning');
    transitioning = false; enterButton.disabled = false;
    renderer.render(scene, camera);
  };
  const enterInterior = async () => {
    if (transitioning || loadingInterior) return;
    if (mode === 'inside') { await transitionTo('outside'); return; }
    loadingInterior = true; enterButton.disabled = true;
    if (!interior) interior = await loadAsset('interior');
    loadingInterior = false;
    if (interior) { loading.hidden = true; await transitionTo('inside'); }
    else { loading.hidden = true; enterButton.disabled = false; }
  };
  enterButton.addEventListener('click', enterInterior);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const triggerRoomProp = target => {
    if (!target || disposed) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = Math.max(target.size.y, .01);
    target.effect = {
      elapsed: 0, duration: reducedMotion ? .38 : 1.34,
      vy: scale * (reducedMotion ? 2.1 : 7.4), gravity: scale * (reducedMotion ? 28 : 22),
      y: Math.max(0, target.pivot.position.y - target.basePosition.y), bounces: 0, impactAt: -1,
      dx: target.pivot.position.x - target.basePosition.x, dz: target.pivot.position.z - target.basePosition.z,
      vx: scale * (reducedMotion ? 0 : target.label === 'laptop' ? .75 : -.58), vz: scale * (reducedMotion ? 0 : target.label === 'laptop' ? -.38 : .48),
      yaw: target.pivot.rotation.y, spin: reducedMotion ? Math.PI / 6 : Math.PI * 2,
      scale, last: 0
    };
    ctx.audio?.play(target.sound);
    if (!interactionRaf) interactionRaf = requestAnimationFrame(animateRoomProps);
  };
  const animateRoomProps = now => {
    interactionRaf = 0;
    if (disposed) return;
    let active = false;
    for (const target of roomInteractables) {
      const effect = target.effect;
      if (!effect) continue;
      const dt = effect.last ? Math.min((now - effect.last) / 1000, .04) : 1 / 60;
      effect.last = now; effect.elapsed += dt;
      effect.vy -= effect.gravity * dt;
      effect.y += effect.vy * dt;
      const glide = Math.exp(-4.5 * dt);
      effect.vx -= effect.dx * 24 * dt; effect.vz -= effect.dz * 24 * dt;
      effect.dx += effect.vx * dt; effect.dz += effect.vz * dt;
      effect.vx *= glide; effect.vz *= glide;
      if (effect.y < 0) {
        effect.y = 0;
        if (effect.vy < -effect.scale * .38 && effect.bounces < 2) {
          effect.impactAt = effect.elapsed;
          effect.vy = -effect.vy * (effect.bounces === 0 ? .34 : .2);
          effect.bounces++;
        } else effect.vy = 0;
      }
      const t = Math.min(1, effect.elapsed / effect.duration);
      const ease = 1 - Math.pow(1 - t, 3);
      target.pivot.position.set(target.basePosition.x + effect.dx, target.basePosition.y + effect.y, target.basePosition.z + effect.dz);
      target.pivot.rotation.y = effect.yaw + effect.spin * ease;
      const wobble = Math.sin(Math.PI * t) * (target.label === 'pouf' ? .1 : .045);
      target.pivot.rotation.x = target.baseX + wobble;
      target.pivot.rotation.z = target.baseZ + wobble * .45;
      const landingSquash = effect.impactAt < 0 ? 0 : Math.max(0, 1 - (effect.elapsed - effect.impactAt) / .14);
      target.pivot.scale.set(target.baseScale.x * (1 + landingSquash * .1), target.baseScale.y * (1 - landingSquash * .14), target.baseScale.z * (1 + landingSquash * .1));
      const lift = effect.y / effect.scale, spread = 1 + lift * .34;
      target.shadow.position.set(target.shadowPosition.x - effect.dx * .42 + lift * effect.scale * .1, target.shadowPosition.y, target.shadowPosition.z - effect.dz * .42 - lift * effect.scale * .1);
      target.shadow.scale.set(target.shadow.userData.baseScaleX * spread, target.shadow.userData.baseScaleY * spread, 1);
      target.shadow.material.opacity = target.shadow.userData.baseOpacity / (1 + lift * 1.25);
      if (t >= 1 && effect.y === 0 && effect.vy === 0) {
        target.pivot.position.copy(target.basePosition);
        target.pivot.rotation.set(target.baseX, effect.yaw + effect.spin, target.baseZ);
        target.pivot.rotation.y = THREE.MathUtils.euclideanModulo(target.pivot.rotation.y, Math.PI * 2);
        target.pivot.scale.copy(target.baseScale);
        target.shadow.position.copy(target.shadowPosition); target.shadow.material.opacity = target.shadow.userData.baseOpacity;
        target.shadow.scale.set(target.shadow.userData.baseScaleX, target.shadow.userData.baseScaleY, 1);
        target.effect = null;
      } else active = true;
    }
    renderer.render(scene, camera);
    if (active) interactionRaf = requestAnimationFrame(animateRoomProps);
  };
  const interactableFor = object => {
    for (let node = object; node; node = node.parent) {
      const target = roomInteractables.find(item => item.pivot === node);
      if (target) return target;
    }
    return null;
  };
  const onClickCanvas = e => {
    if (transitioning || dragging || !activeAsset) return;
    const rect = canvas.getBoundingClientRect(); pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (mode === 'outside') {
      if (exterior && raycaster.intersectObject(exterior, true).length) enterInterior();
      return;
    }
    const target = raycaster.intersectObject(activeAsset, true).map(hit => interactableFor(hit.object)).find(Boolean);
    if (target) triggerRoomProp(target);
  };
  const hoverCanvas = e => {
    if (mode !== 'inside' || dragging || transitioning || !activeAsset) { canvas.style.cursor = 'grab'; return; }
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const target = raycaster.intersectObject(activeAsset, true).map(hit => interactableFor(hit.object)).find(Boolean);
    canvas.style.cursor = target ? 'pointer' : 'grab';
  };
  const pointerDown = e => { if (transitioning) return; dragging = false; downX = lastX = e.clientX; downY = lastY = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); };
  const pointerMove = e => {
    if (!canvas.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) dragging = true;
    if (dragging) {
      theta -= dx * .007;
      if (mode === 'inside') theta = THREE.MathUtils.clamp(theta, Math.PI / 4 - .34, Math.PI / 4 + .34);
      phi = THREE.MathUtils.clamp(phi - dy * .005, .62, 1.25); updateCamera(); renderer.render(scene, camera);
    }
    lastX = e.clientX; lastY = e.clientY;
  };
  const pointerUp = e => { if (!dragging) onClickCanvas(e); dragging = false; canvas.classList.remove('is-dragging'); };
  const wheel = e => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom * (e.deltaY > 0 ? .92 : 1.08), MIN_WORLD_ZOOM, MAX_WORLD_ZOOM); updateCamera(); renderer.render(scene, camera); };
  const controlClick = e => {
    if (transitioning) return;
    const button = e.target.closest('[data-world-zoom],[data-world-reset]'); if (!button) return;
    if (button.hasAttribute('data-world-reset')) { theta = Math.PI / 4; phi = .94; zoom = defaultZoom; }
    else zoom = THREE.MathUtils.clamp(zoom * (button.dataset.worldZoom === 'in' ? 1.14 : .88), MIN_WORLD_ZOOM, MAX_WORLD_ZOOM);
    updateCamera(); renderer.render(scene, camera);
  };
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointermove', hoverCanvas); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp); canvas.addEventListener('wheel', wheel, { passive: false });
  root.querySelector('.world-controls').addEventListener('click', controlClick);
  const ambienceButton = root.querySelector('[data-world-ambience]');
  const toggleAmbience = async () => {
    ambienceWanted = !ambienceWanted;
    ambienceButton.setAttribute('aria-pressed', String(ambienceWanted));
    ambienceButton.setAttribute('aria-label', ambienceWanted ? 'Turn outdoor ambience off' : 'Turn outdoor ambience on');
    ambienceButton.title = ambienceWanted ? 'Outdoor ambience on' : 'Turn outdoor ambience on';
    ambienceButton.textContent = ambienceWanted ? '♫' : '♪';
    if (ambienceWanted && mode === 'outside' && !document.hidden && !ctx.audio?.muted) {
      const started = await ctx.audio?.startWorldAmbience?.();
      if (!started && !ctx.audio?.muted) {
        ambienceWanted = false;
        ambienceButton.setAttribute('aria-pressed', 'false');
        ambienceButton.setAttribute('aria-label', 'Outdoor ambience file is missing');
        ambienceButton.title = 'Add assets/audio/world-ambience.mp3 to enable outdoor sound';
        ambienceButton.textContent = '♪';
      }
    } else if (!ambienceWanted) ctx.audio?.stopWorldAmbience?.();
  };
  ambienceButton.addEventListener('click', toggleAmbience);
  const muteChanged = event => {
    if (event.detail?.muted) ctx.audio?.stopWorldAmbience?.();
    else if (ambienceWanted && mode === 'outside' && !document.hidden) ctx.audio?.startWorldAmbience?.();
  };
  document.addEventListener('lifelaunch:mute-change', muteChanged);
  const visibility = () => {
    if (document.hidden) {
      if (outdoorRaf) cancelAnimationFrame(outdoorRaf); outdoorRaf = 0; outdoorLast = 0; ctx.audio?.stopWorldAmbience?.();
    } else if (!disposed) {
      renderer.render(scene, camera);
      if (mode === 'outside') { startOutdoorLife(); if (ambienceWanted) ctx.audio?.startWorldAmbience?.(); }
    }
  };
  document.addEventListener('visibilitychange', visibility);

  let introKey, introWait;
  const showWorldIntro = () => {
    if (disposed || introSeen() || document.querySelector('.preview-overlay,.tour')) return;
    introOverlay = document.createElement('div'); introOverlay.className = 'world-intro-overlay';
    introOverlay.innerHTML = `<section class="world-intro-card" role="dialog" aria-modal="true" aria-labelledby="world-intro-title" aria-describedby="world-intro-copy"><span class="world-intro-icon" aria-hidden="true">⌂</span><span class="world-intro-badge">EARLY WORLD <i></i> WORK IN PROGRESS</span><h2 id="world-intro-title">This little world is still growing</h2><p id="world-intro-copy">Your home is an early preview. Some details or interactions may be unfinished or change as we build. For now, have a look around — more places and activities will come later.</p><button class="btn primary world-intro-continue" type="button">Got it, let me explore <span aria-hidden="true">→</span></button></section>`;
    document.body.append(introOverlay); const button = introOverlay.querySelector('.world-intro-continue');
    const hud = document.querySelector('#hud'), view = document.querySelector('#view'); hud?.setAttribute('inert', ''); view?.setAttribute('inert', ''); document.body.classList.add('world-intro-open');
    const finish = () => {
      document.removeEventListener('keydown', introKey); introOverlay?.classList.remove('is-visible');
      try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* display the intro again when storage is unavailable */ }
      setTimeout(() => { introOverlay?.remove(); introOverlay = null; hud?.removeAttribute('inert'); view?.removeAttribute('inert'); document.body.classList.remove('world-intro-open'); }, 220);
    };
    introKey = e => { if (e.key === 'Escape') e.preventDefault(); if (e.key === 'Tab') { e.preventDefault(); introOverlay?.querySelector('.world-intro-continue')?.focus(); } };
    button.addEventListener('click', finish, { once: true }); document.addEventListener('keydown', introKey); requestAnimationFrame(() => { introOverlay?.classList.add('is-visible'); button.focus(); });
  };
  if (!introSeen()) {
    const introNotBefore = Date.now() + 850;
    introWait = setInterval(() => {
      if (disposed) { clearInterval(introWait); return; }
      if (Date.now() >= introNotBefore && !document.querySelector('.preview-overlay,.tour')) { clearInterval(introWait); showWorldIntro(); }
    }, 220);
  }
  const leaveWorld = () => { if (!location.hash.startsWith('#/world')) dispose(); };
  window.addEventListener('hashchange', leaveWorld);
  const dispose = () => {
    if (disposed) return; disposed = true; clearInterval(introWait); observer?.disconnect();
    window.removeEventListener('hashchange', leaveWorld); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('keydown', introKey);
    enterButton.removeEventListener('click', enterInterior); root.querySelector('.world-controls')?.removeEventListener('click', controlClick);
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointermove', hoverCanvas); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('wheel', wheel);
    if (transitionRaf) cancelAnimationFrame(transitionRaf);
    if (outdoorRaf) cancelAnimationFrame(outdoorRaf);
    if (interactionRaf) cancelAnimationFrame(interactionRaf);
    outdoorLife?.dispose(); outdoorLife = null; ctx.audio?.stopWorldAmbience?.();
    ambienceButton.removeEventListener('click', toggleAmbience); document.removeEventListener('lifelaunch:mute-change', muteChanged);
    introOverlay?.remove(); introOverlay = null; document.body.classList.remove('world-intro-open'); document.querySelector('#hud')?.removeAttribute('inert'); document.querySelector('#view')?.removeAttribute('inert');
    scene.remove(exterior, interior); disposeModel(exterior); disposeModel(interior); renderer.dispose();
  };
  activeWorld = dispose;
  loadAsset('exterior').then(model => {
    if (!model) { enterButton.disabled = true; return; }
    exterior = model; activate(exterior, 'outside');
  });
}
