// The 3D world is a lazy route: Three.js is fetched only when this page opens.
import * as THREE from '../../assets/vendor/three/three.module.js';

let activeWorld = null;
const WORLD_INTRO_KEY = 'lifelaunch.worldIntro.v1';
const worldIntroSeen = () => { try { return localStorage.getItem(WORLD_INTRO_KEY) === '1'; } catch { return false; } };

const mat = (color, roughness = 0.82) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

function buildWorld(scene) {
  const materials = {
    grass: mat('#85d57b'), grassLight: mat('#a5e889'), soil: mat('#d49a63'), soilDark: mat('#b9784f'),
    road: mat('#647984'), roadLine: mat('#f7e6a3'), paver: mat('#d8b580'), cream: mat('#fff2d7'), white: mat('#fffaf0'),
    teal: mat('#51b6aa'), coral: mat('#f28a72'), roof: mat('#d9795e'), roofBlue: mat('#527c91'),
    wood: mat('#a66e48'), roofTrim: mat('#f3b97d'), fountain: new THREE.MeshStandardMaterial({ color: '#6ccbd1', roughness: .22, metalness: .05 }), glass: new THREE.MeshStandardMaterial({ color: '#a8e2e6', roughness: 0.22, metalness: 0.08 }),
    darkGlass: new THREE.MeshStandardMaterial({ color: '#315a69', roughness: 0.24, metalness: 0.08 }),
    leaf: mat('#398d65'), leaf2: mat('#65b96f'),
    flower: mat('#f7d777'), pebble: mat('#e9d7ad'), lamp: mat('#fff0b3', 0.38),
  };
  const add = (geometry, material, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const box = (w, h, d, material, x, y, z, parent = scene) => add(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  const sphere = (r, material, x, y, z, parent = scene, sx = 1, sy = 1, sz = 1) => {
    const mesh = add(new THREE.SphereGeometry(r, 12, 10), material, x, y, z, parent); mesh.scale.set(sx, sy, sz); return mesh;
  };

  // A little floating garden lot, with a warm layered edge like a miniature model.
  box(15.6, 0.75, 12.2, materials.soil, 0, -0.43, 0);
  box(15.25, 0.12, 11.85, materials.grass, 0, -0.015, 0);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(15.05, 11.65), materials.grass);
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.05; ground.receiveShadow = true; scene.add(ground);
  // Scattered raised planting beds and little stepping stones.
  box(2.15, 0.15, 1.45, materials.grassLight, -5.25, 0.14, -3.8);
  box(1.7, 0.13, 1.55, materials.grassLight, 5.1, 0.13, -3.75);
  for (let i = 0; i < 5; i++) sphere(0.13, materials.pebble, -3.1 + i * 0.58, 0.14, 4.55, scene, 1.25, .35, .75);

  // Neighborhood road and a warm stone path to the front porch.
  box(15.2, 0.055, 1.45, materials.road, 0, 0.12, -2.9);
  box(1.12, 0.08, 4.95, materials.paver, 0, 0.15, 0.28);
  for (let i=0;i<7;i++) box(.96,.025,.045,materials.soilDark,0,.196,-1.95+i*.68);
  for (let i = -6; i <= 6; i += 2) box(0.9, 0.012, 0.07, materials.roadLine, i, 0.154, -2.9);
  box(0.07, 0.014, 0.52, materials.roadLine, 0.8, 0.165, -2.05);

  // Main home: cheerful mint walls, terracotta gable, welcoming porch.
  box(3.55, 2.2, 2.85, materials.cream, 0, 1.18, -0.05);
  // Painted corner boards and a clean contrasting base make the facade read crisply.
  box(3.58,.17,2.9,materials.teal,0,.19,-.05);
  box(0.1, 1.02, 0.08, materials.wood, -1.35, 1.14, 1.41);
  box(0.1, 1.02, 0.08, materials.wood, 1.35, 1.14, 1.41);
  box(2.8, 0.1, 0.08, materials.wood, 0, 1.62, 1.41);
  box(0.72, 1.35, 0.16, materials.teal, 0, 0.86, 1.42);
  sphere(0.055, materials.lamp, 0.22, 0.86, 1.52);
  // Gable end as a triangular prism plus roof planes.
  const gable = new THREE.BufferGeometry();
  gable.setAttribute('position', new THREE.Float32BufferAttribute([
    -1.78, 2.28, 1.385, 1.78, 2.28, 1.385, 0, 3.55, 1.385,
    -1.78, 2.28, -1.48, 0, 3.55, -1.48, 1.78, 2.28, -1.48,
  ], 3));
  gable.setIndex([0,1,2,3,4,5]); gable.computeVertexNormals();
  const gableMaterial = new THREE.MeshStandardMaterial({ color: '#f1b875', side: THREE.DoubleSide, roughness: .8 });
  add(gable, gableMaterial, 0, 0, 0);
  const roofR = box(2.06, 0.18, 3.25, materials.roof, 0.89, 2.84, 0);
  roofR.rotation.z = -0.61;
  const roofL = box(2.06, 0.18, 3.25, materials.roof, -0.89, 2.84, 0);
  roofL.rotation.z = 0.61;
  box(0.25, 0.2, 3.35, materials.roof, 0, 3.48, 0);
  // Fine raised seams catch the light and give the roof a tiled finish.
  for (const side of [-1,1]) for (const along of [.45,.92,1.39]) {
    const x=side*along, y=3.48-along*.69;
    const seam=box(.035,.045,3.24,materials.roofTrim,x,y,0); seam.rotation.z=side<0?.61:-.61;
  }
  // Two broad front windows with chunky trim and flower boxes.
  for (const x of [-1.05, 1.05]) {
    box(0.82, 0.77, 0.12, materials.white, x, 1.55, 1.48);
    box(0.62, 0.56, 0.14, materials.glass, x, 1.58, 1.56);
    box(0.06, 0.58, 0.02, materials.white, x, 1.58, 1.64);
    box(0.65, 0.06, 0.02, materials.white, x, 1.58, 1.64);
    for (const side of [-1,1]) box(.11,.77,.13,materials.teal,x+side*.39,1.55,1.57);
    box(0.86, 0.13, 0.24, materials.wood, x, 1.08, 1.57);
    for (let j = 0; j < 3; j++) sphere(0.09, j % 2 ? materials.coral : materials.flower, x - .23 + j * .23, 1.2, 1.66);
  }
  // A bright attic window and timber accents anchor the gable peak.
  const atticGlass=new THREE.Mesh(new THREE.CircleGeometry(.25,16),materials.glass);atticGlass.position.set(0,2.74,1.445);scene.add(atticGlass);
  const atticFrame=new THREE.Mesh(new THREE.TorusGeometry(.28,.055,8,20),materials.white);atticFrame.position.set(0,2.74,1.46);scene.add(atticFrame);
  box(.08,.76,.08,materials.roofTrim,0,2.75,1.45);
  // Porch canopy and two posts.
  box(1.62, 0.16, 0.9, materials.roofBlue, 0, 1.96, 1.75);
  box(0.1, 1.05, 0.1, materials.white, -.63, 1.44, 2.04);
  box(0.1, 1.05, 0.1, materials.white, .63, 1.44, 2.04);
  box(1.42,.09,.12,materials.white,0,1.02,2.09);
  box(.77,.08,.12,materials.roofTrim,0,.18,2.55);
  // A small porch lantern gives the entry a warm focal point.
  box(.18,.27,.12,materials.wood,.55,1.72,1.53); sphere(.075,materials.lamp,.55,1.72,1.61);
  const chimney = box(.48, 1.2, .48, materials.soilDark, 1.1, 3.05, -.65);
  box(.6, .12, .6, materials.wood, 1.1, 3.68, -.65);

  // The old vehicle spot becomes a tiny courtyard fountain and flower garden.
  const fountainBase=add(new THREE.CylinderGeometry(.86,.96,.22,12),materials.soilDark,3.3,.22,2.2);
  add(new THREE.CylinderGeometry(.72,.82,.13,12),materials.fountain,3.3,.39,2.2);
  add(new THREE.CylinderGeometry(.14,.22,.48,8),materials.white,3.3,.68,2.2);
  sphere(.23,materials.fountain,3.3,.97,2.2,scene,.9,1.1,.9);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;sphere(.11,i%2?materials.coral:materials.flower,3.3+Math.cos(a)*1.2,.29,2.2+Math.sin(a)*.85,scene,.85,.7,.85);}
  for(const [x,z] of [[2.25,3.65],[4.45,3.55],[4.8,1.3],[2.0,1.15]]){box(.5,.12,.4,materials.grassLight,x,.16,z);sphere(.22,materials.leaf2,x,.4,z);}

  // Individually styled neighbors give the little street a real sense of place.
  const cottage = (x,z,wall,roof,accent) => {
    box(2.1,1.62,1.95,wall,x,.98,z);
    box(2.15,.13,2.02,accent,x,1.73,z);
    const left=box(1.38,.16,2.25,roof,x-.52,2.12,z);left.rotation.z=.57;
    const right=box(1.38,.16,2.25,roof,x+.52,2.12,z);right.rotation.z=-.57;
    box(.18,.17,2.34,roof,x,2.54,z);
    box(.56,.88,.14,materials.wood,x, .57,z+1.02);
    box(.68,.68,.16,materials.white,x-.62,1.17,z+1.04);
    box(.5,.52,.18,materials.glass,x-.62,1.17,z+1.15);
    box(.7,.12,.26,accent,x-.62,.79,z+1.16);
    box(.65,.67,.16,materials.white,x+.63,1.17,z+1.04);
    box(.48,.51,.18,materials.glass,x+.63,1.17,z+1.15);
    box(.06,.54,.02,materials.white,x+.63,1.17,z+1.25);
    // A crisp gable face and round attic vent instead of a flat box roof.
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([
      x-1.05,1.79,z+1.01,x+1.05,1.79,z+1.01,x,2.62,z+1.01,
      x-1.05,1.79,z-1.01,x,2.62,z-1.01,x+1.05,1.79,z-1.01,
    ],3));g.setIndex([0,1,2,3,4,5]);g.computeVertexNormals();
    add(g,new THREE.MeshStandardMaterial({color:accent.color,side:THREE.DoubleSide,roughness:.82}),0,0,0);
    const vent=new THREE.Mesh(new THREE.CircleGeometry(.11,12),materials.darkGlass);vent.position.set(x,2.13,z+1.04);scene.add(vent);
    box(.42,.12,.48,materials.soilDark,x+.62,2.35,z-.48);box(.5,.1,.56,materials.wood,x+.62,2.45,z-.48);
    // Front eaves and a striped awning make each cottage silhouette distinct.
    box(2.22,.1,.12,accent,x,1.8,z+1.04);
  };
  cottage(-5.15,-.15,materials.white,materials.roofBlue,materials.teal);
  cottage(5.25,-.15,materials.cream,materials.roof,materials.coral);

  // Trees, shrubs, flower dots, and a softly glowing street lamp.
  const tree = (x,z,scale=1) => {
    const trunk = add(new THREE.CylinderGeometry(.14*scale,.2*scale,1.05*scale,7),materials.wood,x,.62*scale,z);
    const crown = new THREE.Group(); crown.position.set(x,1.42*scale,z); scene.add(crown);
    sphere(.72*scale,materials.leaf,0,0,0,crown,1,1.02,1);
    sphere(.49*scale,materials.leaf2,-.34*scale,-.04*scale,.16*scale,crown);
    sphere(.5*scale,materials.leaf,.35*scale,.21*scale,-.08*scale,crown);
    return crown;
  };
  const trees = [tree(-6.35,-4.35,.95),tree(6.45,-4.5,1.05),tree(-6.25,3.65,.8),tree(6.35,3.7,.9),tree(-3.5,4.25,.68)];
  for (const [x,z] of [[-4.4,2.1],[-4.65,2.55],[4.55,2.05],[4.3,2.55],[-2.8,-4.3],[3.5,-4.25]]) {
    sphere(.36,materials.leaf2,x,.43,z); sphere(.31,materials.leaf,x+.26,.39,z+.1);
  }
  for (let i=0;i<18;i++) {
    const x=-6.3+(i%9)*1.55, z=i<9?4.75:-4.8;
    if (Math.abs(x)<2.7) continue;
    const stem=add(new THREE.CylinderGeometry(.018,.025,.25,5),materials.leaf,x,.24,z); stem.rotation.z=.08;
    sphere(.11,materials.flower,x,.39,z,scene,.85,.7,.85);
  }
  box(.11,2.1,.11,materials.wood,-3.75,1.1,-2.15);
  sphere(.25,materials.lamp,-3.75,2.23,-2.15);

  // Puffy, low-poly clouds drift lazily above the scene.
  const clouds = [];
  for (const [x,y,z,s] of [[-5,6,-3,1],[3.8,6.8,-4.5,.8],[6,5.8,2,.65]]) {
    const cloud = new THREE.Group(); cloud.position.set(x,y,z); cloud.userData.baseX=x; cloud.userData.phase=s; scene.add(cloud);
    sphere(.48,materials.white,0,0,0,cloud,1.4,.7,.9);
    sphere(.38,materials.white,-.42,-.08,.02,cloud,1.1,.8,1);
    sphere(.4,materials.white,.43,-.05,-.02,cloud,1.1,.8,1);
    clouds.push(cloud);
  }

  const animated = { trees, clouds, materials };
  return animated;
}

export function renderWorld(root, ctx) {
  if (activeWorld) activeWorld();
  root.innerHTML = `<section class="world-page">
    <div class="world-topline"><a class="world-back" href="#/dashboard" aria-label="Back to Home">← <span>Home</span></a><div class="world-heading"><span class="world-kicker">A LITTLE PLACE TO GROW</span><h1>Your World</h1><p>Your first little corner of the LifeLaunch neighborhood.</p></div><div class="world-progress"><span class="world-progress-icon">✦</span><span><b>Home sweet home</b><small>Your journey starts here</small></span></div></div>
    <div class="world-stage" aria-label="Interactive 3D isometric neighborhood">
      <div class="world-loading"><span class="world-loader"></span><b>Building your neighborhood…</b><small>The 3D engine loads when you first visit.</small></div>
      <canvas class="world-canvas" aria-label="A colorful isometric neighborhood with homes, gardens and a fountain. Drag to look around."></canvas>
      <div class="world-scene-label"><span class="world-label-dot"></span><span>Your first home</span><small>Starter lot</small></div>
      <div class="world-controls" aria-label="World controls"><button type="button" data-world-zoom="in" aria-label="Zoom in">+</button><button type="button" data-world-zoom="out" aria-label="Zoom out">−</button><button type="button" data-world-reset aria-label="Reset view">↻</button></div>
      <div class="world-drag-hint"><span>↔</span> Drag to look around</div>
    </div>
    <div class="world-bottomline"><div><span class="world-kicker">YOUR STORY STARTS SMALL</span><h2>Room to dream. Space to grow.</h2><p>This is your own little world. We’ll add more places and things to do as LifeLaunch grows.</p></div><a class="btn world-return" href="#/dashboard">Back to your launchpad <span aria-hidden="true">→</span></a></div>
  </section>`;
  const canvas = root.querySelector('.world-canvas'), loader = root.querySelector('.world-loading');
  let renderer, observer, frame = 0, disposed = false, introTimer = 0, introOverlay = null, theta = Math.PI / 4, phi = 0.94, zoom = window.matchMedia('(max-width: 720px)').matches ? .68 : 1, dragging = false, lastX = 0, lastY = 0;
  const defaultZoom = zoom;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#d7f4e8');
  scene.fog = new THREE.Fog('#d7f4e8', 20, 38);
  const camera = new THREE.OrthographicCamera(-9,9,7.4,-7.4,.1,80);
  const target = new THREE.Vector3(0,1.15,0);
  const updateCamera = () => {
    const radius = 22, sinPhi = Math.sin(phi);
    camera.position.set(target.x + radius*sinPhi*Math.sin(theta), target.y+radius*Math.cos(phi), target.z + radius*sinPhi*Math.cos(theta));
    camera.lookAt(target); camera.zoom = zoom; camera.updateProjectionMatrix();
  };
  updateCamera();
  scene.add(new THREE.HemisphereLight('#e9fff7','#9c744c',2.2));
  const sun = new THREE.DirectionalLight('#fff1cf',3.2); sun.position.set(-7,13,9); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-12; sun.shadow.camera.right=12; sun.shadow.camera.top=12; sun.shadow.camera.bottom=-12; sun.shadow.bias=-.0004; scene.add(sun);
  let world;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    world = buildWorld(scene);
    loader.remove();
  } catch (err) {
    console.error('Unable to initialize the LifeLaunch world:', err);
    loader.innerHTML = '<b>This device could not open the 3D neighborhood.</b><small>Try reloading the page or opening it in a newer browser.</small>';
    loader.classList.add('world-load-error');
    return;
  }
  const resize = () => {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const aspect = rect.width / rect.height, h = 7.4;
    camera.left = -h*aspect; camera.right = h*aspect; camera.top=h; camera.bottom=-h; camera.updateProjectionMatrix();
    renderer.setSize(rect.width,rect.height,false);
  };
  observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const clock = new THREE.Clock();
  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    const t = clock.getElapsedTime();
    world.clouds.forEach((cloud,i) => { cloud.position.x = cloud.userData.baseX + Math.sin(t*.12+i)*.12; cloud.position.y = 6 + i*.36 + Math.sin(t*.55+i*1.8)*.04; });
    world.trees.forEach((tree,i) => { tree.rotation.z = Math.sin(t*.7+i)*.012; });
    renderer.render(scene,camera);
  };
  animate();
  const pointerDown = e => { dragging=true; lastX=e.clientX; lastY=e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); };
  const pointerMove = e => { if(!dragging)return; const dx=e.clientX-lastX, dy=e.clientY-lastY; theta-=dx*.007; phi=THREE.MathUtils.clamp(phi-dy*.005,.62,1.25); lastX=e.clientX;lastY=e.clientY;updateCamera(); };
  const pointerUp = () => { dragging=false; canvas.classList.remove('is-dragging'); };
  const wheel = e => { e.preventDefault(); zoom=THREE.MathUtils.clamp(zoom*(e.deltaY>0?.92:1.08),.5,1.55);updateCamera(); };
  const controlClick = e => {
    const button=e.target.closest('[data-world-zoom],[data-world-reset]'); if(!button)return;
    if(button.hasAttribute('data-world-reset')){theta=Math.PI/4;phi=.94;zoom=defaultZoom;}
    else zoom=THREE.MathUtils.clamp(zoom*(button.dataset.worldZoom==='in'?1.14:.88),.5,1.55);
    updateCamera();
  };
  canvas.addEventListener('pointerdown',pointerDown); canvas.addEventListener('pointermove',pointerMove); canvas.addEventListener('pointerup',pointerUp); canvas.addEventListener('pointercancel',pointerUp); canvas.addEventListener('wheel',wheel,{passive:false}); root.querySelector('.world-controls').addEventListener('click',controlClick);
  const visibility = () => { if(!document.hidden && !disposed) renderer.render(scene,camera); };
  document.addEventListener('visibilitychange',visibility);
  const dispose = () => {
    if(disposed)return; disposed=true; cancelAnimationFrame(frame); clearInterval(introTimer); observer?.disconnect();
    canvas.removeEventListener('pointerdown',pointerDown); canvas.removeEventListener('pointermove',pointerMove); canvas.removeEventListener('pointerup',pointerUp); canvas.removeEventListener('pointercancel',pointerUp); canvas.removeEventListener('wheel',wheel); root.querySelector('.world-controls')?.removeEventListener('click',controlClick); document.removeEventListener('visibilitychange',visibility);
    window.removeEventListener('hashchange',leaveWorld);
    if(introOverlay){document.removeEventListener('keydown',introKey);introOverlay.remove();introOverlay=null;document.body.classList.remove('world-intro-open');document.querySelector('#hud')?.removeAttribute('inert');document.querySelector('#view')?.removeAttribute('inert');}
    scene.traverse(obj=>{obj.geometry?.dispose(); if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material?.dispose();}); renderer.dispose();
  };
  const leaveWorld=()=>{if(!location.hash.startsWith('#/world'))dispose();};
  const introKey=e=>{if(e.key==='Escape')e.preventDefault();if(e.key==='Tab'){e.preventDefault();introOverlay?.querySelector('.world-intro-continue')?.focus();}};
  const showWorldIntro=()=>{
    if(disposed||worldIntroSeen())return;
    if(document.querySelector('.preview-overlay,.tour'))return;
    introOverlay=document.createElement('div');introOverlay.className='world-intro-overlay';
    introOverlay.innerHTML=`<section class="world-intro-card" role="dialog" aria-modal="true" aria-labelledby="world-intro-title" aria-describedby="world-intro-copy"><span class="world-intro-icon" aria-hidden="true">⌂</span><span class="world-intro-badge">EARLY WORLD <i></i> WORK IN PROGRESS</span><h2 id="world-intro-title">This little world is still growing</h2><p id="world-intro-copy">Your neighborhood is an early preview. Some homes, details, or interactions may be unfinished or change as we build. For now, have a look around — more places and activities will come later.</p><button class="btn primary world-intro-continue" type="button">Got it, let me explore <span aria-hidden="true">→</span></button></section>`;
    document.body.append(introOverlay);const button=introOverlay.querySelector('.world-intro-continue');
    const hud=document.querySelector('#hud'),view=document.querySelector('#view');hud?.setAttribute('inert','');view?.setAttribute('inert','');document.body.classList.add('world-intro-open');
    const finish=()=>{document.removeEventListener('keydown',introKey);introOverlay?.classList.remove('is-visible');try{localStorage.setItem(WORLD_INTRO_KEY,'1');}catch{}setTimeout(()=>{introOverlay?.remove();introOverlay=null;hud?.removeAttribute('inert');view?.removeAttribute('inert');document.body.classList.remove('world-intro-open');},220);};
    button.addEventListener('click',finish,{once:true});document.addEventListener('keydown',introKey);requestAnimationFrame(()=>{introOverlay?.classList.add('is-visible');button.focus();});
  };
  if(!worldIntroSeen()){const introNotBefore=Date.now()+850;introTimer=setInterval(()=>{if(Date.now()>=introNotBefore&&!document.querySelector('.preview-overlay,.tour')){clearInterval(introTimer);showWorldIntro();}},220);}
  window.addEventListener('hashchange',leaveWorld);
  activeWorld=dispose;
}
