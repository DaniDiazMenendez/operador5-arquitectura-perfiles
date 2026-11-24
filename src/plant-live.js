import * as THREE from "three";
import { M, V3, std, box, cyl, beam, group, add, smokeTexture } from "./helpers.js";

// Partes "vivas" de la planta: Cinta 3, ensacado, grúa pórtico, camión, autoelevador, humo.
export function buildLivePlant(scene, smokeOrigins) {
  const out = { labels: [] };
  const label = (text, x, y, z) => out.labels.push({ text, pos: V3(x, y, z) });

  // ---------- Cinta 3 (silos -> ensacado) ----------
  const A = V3(-47, 0, 6), B = V3(37, 0, 37);
  const BH = 1.6;
  const dir = B.clone().sub(A).normalize();
  const nrm = V3(-dir.z, 0, dir.x); // lado hacia la portería (+z)
  const len = A.distanceTo(B);
  const at = (t, off = 0, y = 0) => A.clone().lerp(B, t).addScaledVector(nrm, off).setY(y);

  beam(scene, A.clone().setY(BH), B.clone().setY(BH), 1.4, 0.18, M.belt);
  beam(scene, at(0, 0.85, BH + 0.25), at(1, 0.85, BH + 0.25), 0.12, 0.4, M.yellow);
  beam(scene, at(0, -0.85, BH + 0.25), at(1, -0.85, BH + 0.25), 0.12, 0.4, M.yellow);
  beam(scene, A.clone().setY(BH - 0.35), B.clone().setY(BH - 0.35), 1.6, 0.3, M.steelDark);
  const legs = Math.floor(len / 5);
  for (let i = 0; i <= legs; i++) {
    for (const s of [-0.7, 0.7]) {
      const p = at(i / legs, s);
      box(scene, 0.15, BH - 0.4, 0.15, M.steelDark, p.x, (BH - 0.4) / 2, p.z);
    }
  }
  // Tolva de carga al pie de los silos
  const hp = at(0, 0, 0);
  cyl(scene, 1.6, 0.5, 2, M.steel, hp.x, BH + 2.2, hp.z, 12);
  cyl(scene, 0.4, 0.4, 6, M.steel, hp.x - 2, BH + 5, hp.z - 4, 8).rotation.x = 0.6;

  // Estación de accionamiento: tambor, motor, seccionador
  const T = 0.72;
  const drive = at(T, 0, 0);
  const drumGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.6, 20);
  const drum = new THREE.Mesh(drumGeo, M.steel);
  drum.position.copy(drive).setY(BH);
  drum.lookAt(drive.clone().addScaledVector(nrm, 1).setY(BH));
  drum.rotateX(Math.PI / 2);
  scene.add(drum);
  const motorP = at(T, -1.9, 0);
  const motor = cyl(scene, 0.55, 0.55, 1.4, std(0x2d6a4f, 0.5, 0.3), motorP.x, BH, motorP.z, 18);
  motor.lookAt(drive.clone().setY(BH));
  motor.rotateX(Math.PI / 2);
  // Escalera lateral
  const lad = at(T + 0.015, 1.1, 0);
  box(scene, 0.6, 0.06, 0.06, M.yellow, lad.x, 0.5, lad.z);
  box(scene, 0.6, 0.06, 0.06, M.yellow, lad.x, 1.0, lad.z);

  const sec = group(scene);
  sec.position.copy(at(T - 0.02, 2.4, 0));
  sec.lookAt(sec.position.clone().add(nrm));
  box(sec, 0.15, 1.3, 0.15, M.steelDark, 0, 0.65, 0);
  box(sec, 0.9, 1.0, 0.45, std(0x9aa3ab, 0.5, 0.4), 0, 1.7, 0);
  box(sec, 0.12, 0.35, 0.12, M.red, 0.25, 1.7, 0.28); // manija
  const beacon = add(sec, new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0x33dd66 })), -0.25, 2.35, 0);
  const lock = group(sec, 0.25, 1.38, 0.34);
  box(lock, 0.28, 0.3, 0.14, M.red, 0, 0, 0);
  const shackle = add(lock, new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16, Math.PI), M.steel), 0, 0.15, 0);
  shackle.rotation.z = 0;
  const tag = box(lock, 0.36, 0.5, 0.02, std(0xffd400, 0.6, 0, 0x332600, 0.5), 0, -0.45, 0.02);
  tag.rotation.z = 0.08;
  lock.visible = false;
  lock.scale.setScalar(1.6);
  label("Cinta 3", at(0.3).x, 4.5, at(0.3).z);

  // Bolsas sobre la cinta
  const bags = [];
  const bagGeo = new THREE.BoxGeometry(0.6, 0.32, 0.9);
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(bagGeo, M.bag);
    m.lookAt(dir);
    scene.add(m);
    bags.push({ m, u: i / 30 });
  }
  out.cinta3 = { A, B, dir, nrm, at, BH, drivePoint: drive.clone().setY(BH), secPoint: sec.position.clone().setY(1.7) };

  // ---------- Ensacado y paletizado ----------
  const bag = group(scene, 47, 0, 40);
  box(bag, 20, 11, 16, std(0xe6e0d2, 0.9), 0, 5.5, 0);
  box(bag, 20.6, 0.5, 16.6, M.roofOrange, 0, 11.25, 0);
  box(bag, 0.1, 2.5, 3, M.dark, -10.02, 1.6, -3); // boca de la cinta
  box(bag, 0.1, 4, 4.4, M.dark, 10.02, 2, 2); // salida de pallets
  for (let i = 0; i < 5; i++) box(bag, 2.4, 1.2, 0.06, M.glass, -7 + i * 3.5, 8, 8.03);
  // ensacadora rotativa visible por arriba
  cyl(bag, 1.6, 1.6, 3, M.steel, -4, 13, -2, 16);
  label("Ensacado y paletizado", 47, 14.5, 40);

  // rodillos de salida
  box(scene, 6, 0.6, 2.2, M.steelDark, 60, 0.6, 42);

  const makePallet = () => {
    const p = new THREE.Group();
    box(p, 1.8, 0.2, 1.4, M.pallet, 0, 0.1, 0);
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 2; c++) box(p, 0.85, 0.3, 0.65, M.bag, -0.45 + c * 0.9, 0.38 + r * 0.32, (r % 2 ? 0.33 : -0.33));
    return p;
  };
  // Pila de pallets terminados
  for (let i = 0; i < 6; i++) {
    const p = makePallet();
    p.position.set(64 + (i % 3) * 2.4, Math.floor(i / 3) * 1.6, 30);
    scene.add(p);
  }

  // ---------- Camión en el muelle de despacho ----------
  const truck = group(scene, 80, 0, 56);
  box(truck, 2.8, 2.8, 3, std(0x1f5fa8, 0.5, 0.3), 0, 2, 7.2); // cabina
  box(truck, 2.6, 0.9, 1.0, M.glass, 0, 2.6, 8.72);
  box(truck, 3, 0.4, 11, M.steelDark, 0, 1.2, 0.2); // chasis
  box(truck, 3, 0.25, 11, std(0x6a6f75, 0.7, 0.3), 0, 1.5, -0.3); // caja plana
  for (const z of [-4, 0, 6.5]) for (const x of [-1.4, 1.4]) {
    const w = cyl(truck, 0.55, 0.55, 0.4, M.dark, x, 0.55, z, 14);
    w.rotation.z = Math.PI / 2;
  }
  const truckLoad = [];
  for (let i = 0; i < 6; i++) {
    const p = makePallet();
    p.position.set((i % 2 ? 0.7 : -0.7), 1.63, -4.4 + Math.floor(i / 2) * 2.2);
    p.rotation.y = Math.PI / 2;
    p.scale.setScalar(0.75);
    p.visible = false;
    truck.add(p);
    truckLoad.push(p);
  }
  label("Despacho", 80, 6, 62);

  // ---------- Grúa pórtico ----------
  const crane = group(scene, 0, 0, 0);
  for (const x of [59, 87]) beam(scene, V3(x, 0.2, 30), V3(x, 0.2, 64), 0.6, 0.4, M.steelDark);
  const gantry = group(crane, 0, 0, 42);
  for (const x of [59, 87]) {
    box(gantry, 0.7, 13, 0.7, M.yellow, x, 6.5, -1.2);
    box(gantry, 0.7, 13, 0.7, M.yellow, x, 6.5, 1.2);
    box(gantry, 1, 0.6, 4, M.steelDark, x, 0.4, 0);
  }
  box(gantry, 29, 1.3, 0.8, M.yellow, 73, 13.3, -1.2);
  box(gantry, 29, 1.3, 0.8, M.yellow, 73, 13.3, 1.2);
  const trolley = group(gantry, 64, 13.8, 0);
  box(trolley, 2, 1.1, 3.4, std(0xd04a1a, 0.6), 0, 0.2, 0);
  const cable = box(trolley, 0.06, 1, 0.06, M.dark, 0, -0.5, 0);
  const hook = group(trolley, 0, -6, 0);
  box(hook, 2.2, 0.25, 1.8, M.steelDark, 0, 0, 0);
  const carried = makePallet();
  carried.position.y = -1.7;
  hook.add(carried);
  const pickPallet = makePallet();
  pickPallet.position.set(64, 0, 42);
  scene.add(pickPallet);
  label("Grúa pórtico", 73, 17, 42);

  // ---------- Autoelevador ----------
  const fork = group(scene, 40, 0, 52);
  box(fork, 1.6, 1.2, 2.4, M.orange, 0, 0.9, 0);
  box(fork, 1.5, 0.1, 1.6, M.dark, 0, 3.55, -0.1);
  for (const x of [-0.68, 0.68]) for (const z of [-0.85, 0.6]) box(fork, 0.08, 2.1, 0.08, M.dark, x, 2.5, z);
  box(fork, 0.9, 0.35, 0.7, M.dark, 0, 1.65, -0.55);
  box(fork, 0.15, 3.4, 0.15, M.steelDark, -0.5, 1.7, 1.3);
  box(fork, 0.15, 3.4, 0.15, M.steelDark, 0.5, 1.7, 1.3);
  const forkLoad = makePallet();
  forkLoad.position.set(0, 0.3, 2.2);
  forkLoad.scale.setScalar(0.8);
  fork.add(forkLoad);
  for (const [x, z] of [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]]) {
    const w = cyl(fork, 0.35, 0.35, 0.3, M.dark, x, 0.35, z, 12);
    w.rotation.z = Math.PI / 2;
  }

  out.forklift = { group: fork, load: forkLoad, auto: true };

  // ---------- Humo ----------
  const smokeTex = smokeTexture();
  const puffs = [];
  smokeOrigins.forEach((o, oi) => {
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.6 }));
      scene.add(s);
      puffs.push({ s, o, life: i / 14, scale: oi === 0 ? 1 : 0.6 });
    }
  });

  // ---------- Estado / animación ----------
  let locked = false;
  let beltSpeed = 3.2;
  out.setLock = (v) => {
    locked = v;
    lock.visible = v;
    if (v) lock.scale.setScalar(0.01);
  };
  let truckCount = 0;
  let lastCycle = -1;

  out.update = (dt, time) => {
    // Cinta 3
    beltSpeed += ((locked ? 0 : 3.2) - beltSpeed) * Math.min(1, dt * 2.5);
    for (const b of bags) {
      b.u = (b.u + (beltSpeed * dt) / len) % 1;
      b.m.position.copy(A).lerp(B, b.u).setY(BH + 0.26);
    }
    drum.rotateY(beltSpeed * dt * 1.6);
    beacon.material.color.setHex(locked ? (Math.sin(time * 8) > 0 ? 0xff2a2a : 0x551010) : 0x33dd66);
    if (lock.visible && lock.scale.x < 1.6) lock.scale.setScalar(Math.min(1.6, lock.scale.x + dt * 3));

    // Grúa: ciclo de 16 s pick -> camión -> vuelta
    const c = (time % 16) / 16;
    const cycle = Math.floor(time / 16);
    const lerp = (a, b, k) => a + (b - a) * Math.min(1, Math.max(0, k));
    const sm = (k) => k * k * (3 - 2 * k);
    let gz = 42, tx = 64, hy = -6, carry = false;
    if (c < 0.15) { hy = lerp(-6, -12.1, sm(c / 0.15)); }
    else if (c < 0.25) { carry = true; hy = lerp(-12.1, -6, sm((c - 0.15) / 0.1)); }
    else if (c < 0.5) { carry = true; const k = sm((c - 0.25) / 0.25); gz = lerp(42, 54, k); tx = lerp(64, 80, k); }
    else if (c < 0.62) { carry = true; gz = 54; tx = 80; hy = lerp(-6, -10.35, sm((c - 0.5) / 0.12)); }
    else if (c < 0.72) { gz = 54; tx = 80; hy = lerp(-10.35, -6, sm((c - 0.62) / 0.1)); }
    else if (c < 0.95) { const k = sm((c - 0.72) / 0.23); gz = lerp(54, 42, k); tx = lerp(80, 64, k); }
    gantry.position.z = gz;
    trolley.position.x = tx;
    hook.position.y = hy;
    cable.scale.y = -hy;
    cable.position.y = hy / 2;
    carried.visible = carry;
    pickPallet.visible = c < 0.15 || c > 0.85;
    if (c >= 0.62 && cycle !== lastCycle) {
      lastCycle = cycle;
      truckCount = (truckCount + 1) % 7;
      truckLoad.forEach((p, i) => (p.visible = i < truckCount));
    }

    // Autoelevador ida y vuelta (salvo cuando lo maneja Brisa)
    if (out.forklift.auto) {
    const f = (Math.sin(time * 0.35) + 1) / 2;
    const fx = 36 + f * 18;
    const vel = Math.cos(time * 0.35);
    fork.position.x = fx;
    fork.rotation.y = vel > 0 ? Math.PI / 2 : -Math.PI / 2;
    forkLoad.visible = vel > 0;
    }

    // Humo
    for (const p of puffs) {
      p.life += dt * 0.08;
      if (p.life > 1) p.life -= 1;
      const L = p.life;
      p.s.position.set(p.o.x + L * 14, p.o.y + L * 22, p.o.z + Math.sin(L * 6 + p.o.x) * 2);
      const sc = (3 + L * 14) * p.scale;
      p.s.scale.set(sc, sc, 1);
      p.s.material.opacity = 0.55 * (1 - L);
    }
  };
  return out;
}
