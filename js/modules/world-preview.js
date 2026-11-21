// World assets load only when the user opens World. The room model stays lazy
// until they choose to step inside.
import * as THREE from '../../assets/vendor/three/three.module.js';
import { GLTFLoader } from '../../assets/vendor/three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../assets/vendor/three/addons/utils/BufferGeometryUtils.js';

let activeWorld = null;
const INTRO_KEY = 'lifelaunch.worldIntro.v1';
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

function placeModel(model, camera, aspect, zoom) {
  model.position.set(0, 0, 0); model.scale.setScalar(1); model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const visibleWidth = (14.8 * aspect) / zoom, visibleHeight = 14.8 / zoom;
  const desired = Math.min(visibleWidth * .82, visibleHeight * .72);
  const modelSpan = Math.max(size.x, size.z, size.y * .86, .01);
  const scale = desired / modelSpan;
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale + .08, -center.z * scale);
  const framedHeight = Math.max(size.y * scale, desired * .34);
  const target = new THREE.Vector3(0, framedHeight * .46, 0);
  return { target, height: framedHeight };
}

export function renderWorld(root) {
  if (activeWorld) activeWorld();
  root.innerHTML = `<section class="world-page">
    <div class="world-topline"><a class="world-back" href="#/dashboard" aria-label="Back to Home">← <span>Home</span></a><div class="world-heading"><span class="world-kicker">A LITTLE PLACE TO GROW</span><h1>Your World</h1><p>Your home, ready to grow with you.</p></div><div class="world-progress"><span class="world-progress-icon">✦</span><span><b data-world-mode-title>Your home</b><small data-world-mode-subtitle>Outside view</small></span></div></div>
    <div class="world-stage" aria-label="Interactive 3D home">
      <div class="world-loading"><span class="world-loader"></span><b data-world-load-title>Preparing your home…</b><small data-world-load-copy>The 3D model loads the first time you visit.</small></div>
      <canvas class="world-canvas" aria-label="3D view of your home. Drag to look around, or tap the home to step inside."></canvas>
      <div class="world-scene-label"><span class="world-label-dot"></span><span data-world-model-label>Your home</span><small data-world-model-subtitle>Exterior preview</small></div>
      <div class="world-controls" aria-label="World controls"><button type="button" data-world-zoom="in" aria-label="Zoom in">+</button><button type="button" data-world-zoom="out" aria-label="Zoom out">−</button><button type="button" data-world-reset aria-label="Reset view">↻</button></div>
      <button class="world-enter-home" type="button" data-world-enter disabled>Loading home… <span aria-hidden="true">↗</span></button>
      <div class="world-drag-hint"><span>↔</span> Drag to look around · tap home to enter</div>
    </div>
    <div class="world-bottomline"><div><span class="world-kicker">YOUR STORY STARTS SMALL</span><h2 data-world-caption>Room to dream. Space to grow.</h2><p data-world-description>Upgrade your home as your journey grows. Tap it to take a look inside.</p></div><a class="btn world-return" href="#/dashboard">Back to your launchpad <span aria-hidden="true">→</span></a></div>
    <p class="world-credits">3D models: <a href="https://sketchfab.com/3d-models/medieval-fantasy-tavern-eea5d10fea01404587a1b5703784bb0b" target="_blank" rel="noopener">Medieval Fantasy Tavern</a> by EddyNL and <a href="https://sketchfab.com/3d-models/tiny-isometric-room-6db0b351424141099e30834c6115f40a" target="_blank" rel="noopener">Tiny Isometric Room</a> by 3DECraft, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</p>
  </section>`;
  const canvas = root.querySelector('.world-canvas'), loading = root.querySelector('.world-loading'), enterButton = root.querySelector('[data-world-enter]');
  const modeTitle = root.querySelector('[data-world-mode-title]'), modeSubtitle = root.querySelector('[data-world-mode-subtitle]');
  const modelLabel = root.querySelector('[data-world-model-label]'), modelSubtitle = root.querySelector('[data-world-model-subtitle]');
  const loadTitle = root.querySelector('[data-world-load-title]'), loadCopy = root.querySelector('[data-world-load-copy]');
  const caption = root.querySelector('[data-world-caption]'), description = root.querySelector('[data-world-description]');
  let renderer, observer, disposed = false, introTimer = 0, introOverlay = null;
  let theta = Math.PI / 4, phi = .94, zoom = matchMedia('(max-width: 720px)').matches ? .68 : 1;
  const defaultZoom = zoom;
  let target = new THREE.Vector3(0, 1.6, 0), exterior = null, interior = null, activeAsset = null, mode = 'outside', loadingInterior = false;
  let dragging = false, downX = 0, downY = 0, lastX = 0, lastY = 0;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#d7f4e8'); scene.fog = new THREE.Fog('#d7f4e8', 30, 60);
  const camera = new THREE.OrthographicCamera(-9, 9, 7.4, -7.4, .1, 100);
  const updateCamera = () => {
    const radius = 22, sinPhi = Math.sin(phi);
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
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
      const framed = placeModel(activeAsset, camera, aspect, zoom); target.copy(framed.target); updateCamera();
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
      if (kind === 'interior') {
        // The furniture texture is almost entirely opaque, with only sparse
        // transparent pixels for cutout edges. Treat it as alpha-tested so the
        // blanket/laptop do not get sorted as translucent layers while orbiting.
        const roomMaterials = new Set();
        gltf.scene.traverse(node => {
          if (!node.isMesh) return;
          for (const material of (Array.isArray(node.material) ? node.material : [node.material])) roomMaterials.add(material);
          if (/ray/i.test(node.name)) {
            for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
              if (material.transparent || material.opacity < 1) material.depthWrite = false;
            }
            node.castShadow = false;
          }
        });
        for (const material of roomMaterials) {
          if (material.name === 'equipment_material') {
            material.transparent = false; material.alphaTest = .5; material.depthWrite = true; material.needsUpdate = true;
          }
        }
      }
      // The room is already lightweight. Keep each object independent so its
      // depth and visibility are evaluated separately as the camera moves.
      const optimized = batchStaticModel(gltf.scene, { batch: kind !== 'interior' });
      if (disposed) { disposeModel(optimized.root); return null; }
      optimized.root.userData.batches = optimized.batches;
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
    // This room is an open-front cutaway. Orbiting around to the closed back
    // makes its solid exterior walls cover the bed and desk, so keep the room
    // camera in the two open-front viewing quadrants.
    if (mode === 'inside') { theta = Math.PI / 4; phi = .94; }
    const rect = canvas.getBoundingClientRect(), framed = placeModel(asset, camera, rect.width / Math.max(rect.height, 1), zoom);
    target.copy(framed.target); updateCamera();
    const isRoom = mode === 'inside';
    modeTitle.textContent = isRoom ? 'Inside your home' : 'Your home';
    modeSubtitle.textContent = isRoom ? 'Room view' : 'Outside view';
    modelLabel.textContent = isRoom ? 'Your room' : 'Your home';
    modelSubtitle.textContent = isRoom ? 'Interior preview' : 'Exterior preview';
    caption.textContent = isRoom ? 'A little room of your own.' : 'Room to dream. Space to grow.';
    description.textContent = isRoom ? 'Take a look around. More home spaces can be added as LifeLaunch grows.' : 'Upgrade your home as your journey grows. Tap it to take a look inside.';
    enterButton.innerHTML = isRoom ? 'Back outside <span aria-hidden="true">↙</span>' : 'Step inside <span aria-hidden="true">↗</span>';
    enterButton.disabled = false; loading.hidden = true; renderer.render(scene, camera);
  };
  const enterInterior = async () => {
    if (mode === 'inside') { activate(exterior, 'outside'); return; }
    if (loadingInterior) return;
    loadingInterior = true; enterButton.disabled = true;
    if (!interior) interior = await loadAsset('interior');
    loadingInterior = false;
    if (interior) activate(interior, 'inside');
    else { loading.hidden = true; enterButton.disabled = false; }
  };
  enterButton.addEventListener('click', enterInterior);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const onClickCanvas = e => {
    if (mode !== 'outside' || dragging || !exterior) return;
    const rect = canvas.getBoundingClientRect(); pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObject(exterior, true).length) enterInterior();
  };
  const pointerDown = e => { dragging = false; downX = lastX = e.clientX; downY = lastY = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); };
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
  const wheel = e => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom * (e.deltaY > 0 ? .92 : 1.08), .5, 1.55); updateCamera(); renderer.render(scene, camera); };
  const controlClick = e => {
    const button = e.target.closest('[data-world-zoom],[data-world-reset]'); if (!button) return;
    if (button.hasAttribute('data-world-reset')) { theta = Math.PI / 4; phi = .94; zoom = defaultZoom; }
    else zoom = THREE.MathUtils.clamp(zoom * (button.dataset.worldZoom === 'in' ? 1.14 : .88), .5, 1.55);
    updateCamera(); renderer.render(scene, camera);
  };
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp); canvas.addEventListener('wheel', wheel, { passive: false });
  root.querySelector('.world-controls').addEventListener('click', controlClick);
  const visibility = () => { if (!document.hidden && !disposed) renderer.render(scene, camera); };
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
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('wheel', wheel);
    introOverlay?.remove(); introOverlay = null; document.body.classList.remove('world-intro-open'); document.querySelector('#hud')?.removeAttribute('inert'); document.querySelector('#view')?.removeAttribute('inert');
    scene.remove(exterior, interior); disposeModel(exterior); disposeModel(interior); renderer.dispose();
  };
  activeWorld = dispose;
  loadAsset('exterior').then(model => {
    if (!model) { enterButton.disabled = true; return; }
    exterior = model; activate(exterior, 'outside');
  });
}
