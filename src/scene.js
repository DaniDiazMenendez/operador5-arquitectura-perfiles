import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { V3, easeInOut } from "./helpers.js";
import { buildStaticPlant } from "./plant.js";
import { buildLivePlant } from "./plant-live.js";
import { drawWalkways } from "./paths.js";
import { makePerson, placeAt, updateActor } from "./people.js";
import { buildArchitectureNetwork } from "./architecture-network.js";

export function createPlantScene({ canvas, labelsMount, onProfile, onLayer, onViewChange, onContextLost }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "label-layer";
  labelsMount.insertBefore(labelRenderer.domElement, canvas.nextSibling);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9d6df);
  scene.fog = new THREE.Fog(0xc9d6df, 240, 560);
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .5, 1800);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * .48;
  controls.minDistance = 4;
  controls.maxDistance = 650;
  scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x8a7d66, 1.2));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
  sun.position.set(90, 150, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 10, far: 400 });
  sun.shadow.bias = -.0004;
  scene.add(sun);
  const stat = buildStaticPlant(scene);
  const live = buildLivePlant(scene, stat.smokeOrigins);
  drawWalkways(scene);
  scene.traverse(object => {
    if (object.isMesh) object.castShadow = object.receiveShadow = true;
  });
  function label(html, cls, parent, position, click) {
    const element = document.createElement(click ? "button" : "div");
    if (click) {
      element.type = "button";
      element.addEventListener("click", click);
    }
    element.className = cls;
    element.innerHTML = html;
    const object = new CSS2DObject(element);
    object.position.copy(position);
    parent.add(object);
    return object;
  }
  const plantLabels = [...stat.labels, ...live.labels].map(item => label(item.text, "plant-label", scene, item.pos));
  const personLabels = [];
  const architecture = buildArchitectureNetwork(scene, label, onLayer);
  const actors = {
    brisa: makePerson(scene, { vest: 0xff6a13, helmet: 0xf6c400, ponytail: true }),
    juan: makePerson(scene, { vest: 0xff6a13, helmet: 0xf6c400, shirt: 0x5a4a3a }),
    patricio: makePerson(scene, { vest: 0x7cb342, helmet: 0xffffff, shirt: 0x2a5aa8 }),
    nurse: makePerson(scene, { vest: 0xffffff, helmet: 0xffffff, coat: true, pants: 0xdfe7ef }),
    seguridad: makePerson(scene, { vest: 0xc6e600, helmet: 0x1e6fd9, laptop: true }),
    contratista: makePerson(scene, { vest: 0x2c7be5, helmet: 0xf4f4f4, pants: 0x4b4b4b, qr: true }),
    portero: makePerson(scene, { vest: 0x455a64, helmet: 0x263238, shirt: 0x263238, pants: 0x1b2230 })
  };
  const positions = {
    brisa: [live.cinta3.at(.69, 4.4, 0), live.cinta3.secPoint],
    juan: [V3(6.4, 0, 30.6), live.cinta3.secPoint],
    patricio: [V3(-23.6, 0, 64.6), V3(-20.2, 1.5, 64.2)],
    nurse: [V3(26.2, 0, 71), V3(23.2, 1.4, 71)],
    seguridad: [V3(56, 0, 6.8), V3(56, 2.5, 1.4)],
    contratista: [V3(3.6, 0, 91.6), V3(6, 1.4, 89.8)],
    portero: [V3(6, 0, 89.8), V3(3.6, 1.4, 91.6)]
  };
  const names = {
    brisa: ["Operación · tablet", "operador"], patricio: ["Coordinación", "coordinador"],
    nurse: ["Enfermería", "enfermeria"], seguridad: ["Seguridad", "seguridad"],
    contratista: ["Contratista", "contratista"], portero: ["Portería", "porteria"]
  };
  for (const [id, actor] of Object.entries(actors)) {
    placeAt(actor, positions[id][0], positions[id][1]);
    actor.tablet.visible = id === "brisa";
    actor.use = actor.useTarget = id === "brisa" ? 1 : 0;
    updateActor(actor, 0);
    if (names[id]) {
      const [name, profile] = names[id];
      personLabels.push(label(name, `name-tag tag-${id}`, actor.group, V3(0, 3.35, 0), () => onProfile(profile)));
    }
  }

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motion.matches;
  let paused = false;
  let motionPaused = false;
  let running = true;
  let dirty = true;
  let tween = null;
  let frameId;
  let lastFrame = 0;
  let time = 0;
  let currentView = "operador";
  let narrow = innerWidth < 650;
  const overviewTarget = V3(5, 0, 5);
  const overviewPosition = () => {
    const factor = innerWidth < 650 ? 1.8 : 1;
    return V3(95 * factor, 105 * factor, 160 * factor);
  };
  const architecturePosition = () => {
    const factor = innerWidth < 650 ? 1.8 : 1;
    return V3(0, 210 * factor, 310 * factor);
  };
  camera.position.copy(overviewPosition());
  controls.target.copy(overviewTarget);
  controls.update();
  function moveCamera(position, target) {
    if (reduced) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
    } else {
      tween = { position: camera.position.clone(), target: controls.target.clone(), endPosition: position, endTarget: target, start: performance.now() };
    }
    dirty = true;
  }
  function showNetwork(visible) {
    architecture.setVisible(visible);
    for (const item of [...plantLabels, ...personLabels]) item.visible = !visible;
    dirty = true;
  }
  function focusActor(id, immediate = false) {
    const actor = actors[id];
    if (!actor) throw new Error("No existe la ubicación de ese perfil.");
    showNetwork(false);
    stat.roofs.infirmary.visible = id !== "nurse";
    stat.roofs.control.visible = id !== "seguridad";
    const position = actor.group.getWorldPosition(V3());
    const heading = actor.group.rotation.y;
    const front = V3(Math.sin(heading), 0, Math.cos(heading));
    const destination = position.clone().addScaledVector(front, 7).add(V3(-front.z * 3, 4.5, front.x * 3));
    const target = position.clone().setY(position.y + 1.8);
    if (immediate) {
      tween = null;
      camera.position.copy(destination);
      controls.target.copy(target);
      controls.update();
    } else {
      moveCamera(destination, target);
    }
    currentView = id === "brisa" ? "operador" : "planta";
    onViewChange(currentView);
  }
  const markDirty = () => { dirty = true; };
  const cancelTween = () => { tween = null; dirty = true; };
  controls.addEventListener("change", markDirty);
  controls.addEventListener("start", cancelTween);
  const resize = () => {
    const nextNarrow = innerWidth < 650;
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < 650 ? 55 : 42;
    scene.fog.near = innerWidth < 650 ? 420 : 240;
    scene.fog.far = innerWidth < 650 ? 1000 : 560;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    labelRenderer.setSize(innerWidth, innerHeight);
    if (nextNarrow !== narrow) {
      if (currentView === "arquitectura") moveCamera(architecturePosition(), V3(0, 28, 5));
      else if (currentView === "planta") moveCamera(overviewPosition(), overviewTarget);
    }
    narrow = nextNarrow;
    dirty = true;
  };
  const onMotionChange = event => {
    reduced = event.matches;
    controls.enableDamping = !reduced;
    if (tween && reduced) {
      camera.position.copy(tween.endPosition);
      controls.target.copy(tween.endTarget);
      tween = null;
    }
    dirty = true;
  };
  controls.enableDamping = !reduced;
  motion.addEventListener("change", onMotionChange);
  window.addEventListener("resize", resize);
  const onLost = event => {
    event.preventDefault();
    running = false;
    cancelAnimationFrame(frameId);
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  function frame(now) {
    if (!running) return;
    frameId = requestAnimationFrame(frame);
    if (document.hidden || now - lastFrame < 40) return;
    const dt = Math.min((now - lastFrame) / 1000, .05);
    lastFrame = now;
    if (!paused && !reduced && !motionPaused) {
      for (const spin of stat.spin) spin.obj.rotation[spin.axis] += spin.speed * dt;
      time += dt;
      const flicker = 1 + Math.sin(time * 13) * .08 + Math.sin(time * 7.3) * .06;
      stat.flame.scale.setScalar(flicker);
      stat.flameLight.intensity = 30 * flicker;
      live.update(dt, time);
      architecture.update(time);
      Object.values(actors).forEach(actor => updateActor(actor, dt));
      dirty = true;
    }
    if (!paused) {
      if (tween) {
        const progress = Math.min(1, (now - tween.start) / 1200);
        const eased = easeInOut(progress);
        camera.position.lerpVectors(tween.position, tween.endPosition, eased);
        controls.target.lerpVectors(tween.target, tween.endTarget, eased);
        if (progress === 1) tween = null;
        dirty = true;
      }
      controls.update();
    }
    if (dirty) {
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      dirty = false;
    }
  }
  resize();
  focusActor("brisa", true);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  frameId = requestAnimationFrame(frame);
  return {
    setPaused(value) { paused = value; dirty = true; },
    setMotionPaused(value) { motionPaused = value; dirty = true; },
    overview() {
      showNetwork(false);
      stat.roofs.infirmary.visible = stat.roofs.control.visible = true;
      moveCamera(overviewPosition(), overviewTarget);
      currentView = "planta";
      onViewChange(currentView);
    },
    showArchitecture() {
      showNetwork(true);
      stat.roofs.infirmary.visible = stat.roofs.control.visible = true;
      moveCamera(architecturePosition(), V3(0, 28, 5));
      currentView = "arquitectura";
      onViewChange(currentView);
    },
    locate(id) { focusActor(id); },
    dispose() {
      running = false;
      cancelAnimationFrame(frameId);
      motion.removeEventListener("change", onMotionChange);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      controls.removeEventListener("change", markDirty);
      controls.removeEventListener("start", cancelTween);
      controls.dispose();
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(mat);
            for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
          }
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(mat => mat.dispose());
      textures.forEach(texture => texture.dispose());
      renderer.dispose();
      labelRenderer.domElement.remove();
    }
  };
}
