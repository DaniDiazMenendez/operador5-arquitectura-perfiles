import * as THREE from "three";
import { std, box, cyl, add, angleLerp, easeInOut } from "./helpers.js";

const SKIN = std(0xe2b08c, 0.8);

// Avatar low-poly con casco, chaleco y tablet. Frente = +z local.
export function makePerson(scene, opts) {
  const { vest, helmet, pants = 0x2b3a55, shirt = 0x3b4a66, ponytail = false, coat = false, laptop = false, qr = false, tabletSize = 1 } = opts;
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  body.scale.setScalar(1.3);
  const pantsM = std(pants, 0.9), vestM = std(vest, 0.6), shirtM = std(shirt, 0.85), bootM = std(0x2a2118, 0.9);

  const leg = (x) => {
    const p = new THREE.Group();
    p.position.set(x, 0.95, 0);
    body.add(p);
    box(p, 0.2, 0.85, 0.24, pantsM, 0, -0.45, 0);
    box(p, 0.22, 0.14, 0.34, bootM, 0, -0.88, 0.05);
    return p;
  };
  const legL = leg(-0.13), legR = leg(0.13);

  const torso = add(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.27, coat ? 0.55 : 0.36, 4, 12), coat ? std(0xf4f6f8, 0.8) : vestM), 0, coat ? 1.3 : 1.38, 0);
  torso.scale.z = 0.75;
  if (!coat) {
    const stripe = std(0xdfe6ec, 0.3, 0.6, 0x666666, 0.3);
    for (const y of [1.22, 1.46]) {
      const s = cyl(body, 0.276, 0.276, 0.05, stripe, 0, y, 0, 16);
      s.scale.z = 0.75;
    }
  }
  add(body, new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), SKIN), 0, 2.0, 0);
  const helm = add(body, new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(helmet, 0.4)), 0, 2.05, 0);
  helm.scale.y = 0.9;
  cyl(body, 0.25, 0.25, 0.03, std(helmet, 0.4), 0, 2.06, 0.03, 18);
  if (ponytail) add(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 4, 8), std(0x4a2a17, 0.9)), 0, 1.88, -0.18).rotation.x = 0.4;
  if (qr) {
    // Sticker QR en el casco del contratista
    const q = box(body, 0.13, 0.13, 0.02, std(0xffffff, 0.6), 0, 2.16, 0.17);
    q.rotation.x = -0.55;
    box(q, 0.07, 0.07, 0.025, std(0x111111, 0.6), 0, 0, 0);
  }

  const arm = (x) => {
    const p = new THREE.Group();
    p.position.set(x, 1.72, 0);
    body.add(p);
    add(p, new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.42, 4, 8), coat ? std(0xf4f6f8, 0.8) : shirtM), 0, -0.3, 0);
    add(p, new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), SKIN), 0, -0.6, 0);
    return p;
  };
  const armL = arm(-0.36), armR = arm(0.36);

  // Tablet (o laptop)
  const tablet = new THREE.Group();
  body.add(tablet);
  const tw = (laptop ? 0.56 : 0.46) * tabletSize, th = (laptop ? 0.36 : 0.34) * tabletSize;
  box(tablet, tw, th, 0.03, std(0x1c1f24, 0.4), 0, 0, 0);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x9fb4c8 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(tw * 0.9, th * 0.86), screenMat);
  screen.rotation.y = Math.PI;
  screen.position.z = -0.017;
  tablet.add(screen);

  const actor = {
    group: g, legL, legR, armL, armR, tablet, screenMat,
    walk: null, phase: 0, use: 0, useTarget: 0, face: null, heading: 0,
  };
  scene.add(g);
  return actor;
}

export function setScreen(actor, texture) {
  actor.screenMat.map = texture || null;
  actor.screenMat.color.setHex(texture ? 0xffffff : 0x9fb4c8);
  actor.screenMat.needsUpdate = true;
}

export function walkTo(actor, to, speed = 9, onArrive) {
  return walkPath(actor, [to], speed, onArrive);
}

// Camina siguiendo una polilínea de puntos (la senda peatonal).
export function walkPath(actor, points, speed = 8, onArrive, delay = 0) {
  const pts = [actor.group.position.clone(), ...points.map((p) => p.clone())].filter(
    (p, i, arr) => i === 0 || p.distanceTo(arr[i - 1]) > 0.05
  );
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += pts[i].distanceTo(pts[i - 1]);
  if (total < 0.3) {
    actor.group.position.copy(pts[pts.length - 1]);
    actor.walk = null;
    return 0;
  }
  // Velocidad adaptativa: trayectos largos no duran más de ~7 s
  const v = Math.max(speed, total / 7);
  actor.walk = { pts, total, s: 0, v, delay, onArrive };
  return total / v + delay;
}

function samplePath(w) {
  let s = w.s;
  for (let i = 1; i < w.pts.length; i++) {
    const a = w.pts[i - 1], b = w.pts[i];
    const L = a.distanceTo(b);
    if (s <= L || i === w.pts.length - 1) {
      return { pos: a.clone().lerp(b, Math.min(1, s / L)), heading: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    s -= L;
  }
}

export function placeAt(actor, p, facePoint) {
  actor.walk = null;
  actor.group.position.copy(p);
  if (facePoint) {
    actor.face = facePoint.clone();
    actor.group.rotation.y = actor.heading = Math.atan2(facePoint.x - p.x, facePoint.z - p.z);
  }
}

export function updateActor(a, dt) {
  const g = a.group;
  if (a.walk && a.walk.delay > 0) {
    a.walk.delay -= dt;
  } else if (a.walk) {
    const w = a.walk;
    // arranque y frenado suaves
    const ramp = Math.min(1, w.s / 1.5 + 0.35, (w.total - w.s) / 1.5 + 0.35);
    w.s = Math.min(w.total, w.s + w.v * ramp * dt);
    const smp = samplePath(w);
    g.position.copy(smp.pos);
    a.heading = smp.heading;
    g.rotation.y = angleLerp(g.rotation.y, a.heading, Math.min(1, dt * 10));
    a.phase += dt * Math.min(14, 5 + w.v * 0.9);
    const s = Math.sin(a.phase);
    a.legL.rotation.x = s * 0.6;
    a.legR.rotation.x = -s * 0.6;
    a.armR.rotation.x = s * 0.4;
    a.use += (0 - a.use) * Math.min(1, dt * 6);
    if (w.s >= w.total) {
      a.walk = null;
      w.onArrive && w.onArrive();
    }
  } else if (a.seated) {
    // Sentada manejando: piernas hacia adelante, manos al volante
    a.legL.rotation.x = a.legR.rotation.x = -1.45;
    a.use += (0 - a.use) * Math.min(1, dt * 6);
    a.armR.rotation.x += (-0.9 - a.armR.rotation.x) * Math.min(1, dt * 6);
  } else {
    a.legL.rotation.x *= 0.85;
    a.legR.rotation.x *= 0.85;
    if (a.face) {
      const target = Math.atan2(a.face.x - g.position.x, a.face.z - g.position.z);
      g.rotation.y = angleLerp(g.rotation.y, target, Math.min(1, dt * 4));
    }
    a.use += (a.useTarget - a.use) * Math.min(1, dt * 4);
    a.armR.rotation.x += (-a.use * 0.95 - a.armR.rotation.x) * Math.min(1, dt * 6);
  }
  const u = a.use;
  // Pose de la tablet: al costado (caminando) -> frente al pecho (usando)
  a.tablet.position.set(-0.45 * (1 - u), 1.0 + 0.4 * u, 0.05 + 0.37 * u);
  a.tablet.rotation.set(0.65 * u, (Math.PI / 2) * (1 - u), 0);
  a.armL.rotation.x = -u * 0.95;
  a.armL.rotation.z = -0.1 * (1 - u) + 0.25 * u;
  a.armR.rotation.z = -0.25 * u;
}
