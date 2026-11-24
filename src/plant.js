import * as THREE from "three";
import { M, V3, std, box, cyl, beam, group, add } from "./helpers.js";

// Planta estática: terreno, caminos, edificios y equipos de proceso.
export function buildStaticPlant(scene) {
  const out = { spin: [], smokeOrigins: [], labels: [] };
  const label = (text, x, y, z) => out.labels.push({ text, pos: V3(x, y, z) });

  // ---------- Terreno ----------
  const outer = new THREE.Mesh(new THREE.CircleGeometry(700, 64), M.grass);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.05;
  scene.add(outer);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(240, 220), M.ground);
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(0, 0, -10);
  yard.receiveShadow = true;
  scene.add(yard);

  const road = (x, z, w, d) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.road);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.03, z);
    r.receiveShadow = true;
    scene.add(r);
  };
  road(0, 92, 10, 90); // acceso principal
  road(18, 52, 160, 9); // calle transversal
  road(84, 70, 10, 30); // despacho

  // Montañas / cantera de fondo
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 380 + (i % 3) * 50;
    const h = 40 + ((i * 37) % 60);
    const m = new THREE.Mesh(new THREE.ConeGeometry(70 + (i % 4) * 15, h, 6), std(0x9a917c, 1));
    m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
    scene.add(m);
  }

  // ---------- Cerco perimetral ----------
  const fenceMat = std(0x7b8088, 0.6, 0.4);
  const fence = (ax, az, bx, bz) => {
    const a = V3(ax, 0, az), b = V3(bx, 0, bz);
    beam(scene, a.clone().setY(2.2), b.clone().setY(2.2), 0.08, 0.08, fenceMat);
    beam(scene, a.clone().setY(1.1), b.clone().setY(1.1), 0.08, 0.08, fenceMat);
    const n = Math.floor(a.distanceTo(b) / 5);
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      cyl(scene, 0.08, 0.08, 2.4, fenceMat, p.x, 1.2, p.z, 6);
    }
  };
  fence(-115, 88, -7, 88);
  fence(7, 88, 110, 88);
  fence(-115, 88, -115, -115);
  fence(110, 88, 110, -115);
  fence(-115, -115, 110, -115);

  // ---------- Portería ----------
  const booth = group(scene, 10, 0, 86);
  box(booth, 5, 3.2, 4, M.white, 0, 1.6, 0);
  box(booth, 5.6, 0.3, 4.6, M.roofBlue, 0, 3.35, 0);
  box(booth, 4.2, 1.2, 0.05, M.glass, 0, 2.1, -2.02);
  box(booth, 0.05, 1.2, 3, M.glass, -2.52, 2.1, 0);
  // Lector biométrico / QR
  const reader = group(scene, 5, 0, 87.6);
  cyl(reader, 0.12, 0.12, 1.2, M.steelDark, 0, 0.6, 0, 8);
  box(reader, 0.45, 0.6, 0.15, M.dark, 0, 1.4, 0);
  box(reader, 0.34, 0.4, 0.02, std(0x88ddff, 0.3, 0, 0x33aaff, 1.2), 0, 1.45, 0.08);
  // Barrera
  const barrier = group(scene, 6.5, 1.1, 85);
  cyl(scene, 0.3, 0.3, 1.2, M.yellow, 6.5, 0.6, 85, 10);
  const arm = new THREE.Group();
  barrier.add(arm);
  for (let i = 0; i < 6; i++) box(arm, 1.8, 0.18, 0.12, i % 2 ? M.white : M.red, -0.9 - i * 1.8, 0, 0);
  out.barrier = arm;
  label("Portería", 10, 6, 86);

  // ---------- Edificios ----------
  const building = (x, z, w, d, h, wallMat, roofMat) => {
    const g = group(scene, x, 0, z);
    box(g, w, h, d, wallMat, 0, h / 2, 0);
    box(g, w + 0.6, 0.4, d + 0.6, roofMat, 0, h + 0.2, 0);
    for (let i = 0; i < Math.floor(w / 3); i++) {
      box(g, 1.8, 1.2, 0.06, M.glass, -w / 2 + 1.8 + i * 3, h * 0.62, d / 2 + 0.02);
    }
    box(g, 1.6, 2.4, 0.08, M.steelDark, 0, 1.2, d / 2 + 0.03);
    return g;
  };
  // Oficina de turno: puerta hacia la senda peatonal (lado norte)
  building(-22, 72, 16, 10, 6, std(0xe8e2d4, 0.9), M.roofBlue).rotation.y = Math.PI;
  label("Oficina de turno", -22, 9, 72);

  // Edificio con interior visible: paredes con puerta y techo removible.
  // doorSide: -1 = puerta al norte (-z), 1 = puerta al sur (+z)
  const room = (x, z, w, d, h, wallMat, roofMat, doorSide, doorW = 2.4) => {
    const g = group(scene, x, 0, z);
    const t = 0.25;
    const floor = box(g, w, 0.08, d, std(0xd9dde0, 0.7), 0, 0.04, 0);
    floor.receiveShadow = true;
    const fz = (doorSide * d) / 2;
    const bz = (-doorSide * d) / 2;
    box(g, w, h, t, wallMat, 0, h / 2, bz); // pared trasera
    box(g, t, h, d, wallMat, -w / 2, h / 2, 0);
    box(g, t, h, d, wallMat, w / 2, h / 2, 0);
    const seg = (w - doorW) / 2;
    box(g, seg, h, t, wallMat, -(doorW / 2 + seg / 2), h / 2, fz);
    box(g, seg, h, t, wallMat, doorW / 2 + seg / 2, h / 2, fz);
    box(g, doorW, h - 2.6, t, wallMat, 0, 2.6 + (h - 2.6) / 2, fz); // dintel
    for (const s of [-1, 1]) box(g, Math.min(2.4, seg - 1.4), 1.2, 0.06, M.glass, s * (doorW / 2 + seg / 2), h * 0.6, fz + doorSide * 0.14);
    const roof = new THREE.Group();
    g.add(roof);
    box(roof, w + 0.6, 0.4, d + 0.6, roofMat, 0, h + 0.2, 0);
    return { g, roof, fz };
  };

  // ---------- Enfermería ----------
  const inf = room(24, 72, 12, 9, 4, M.white, M.roofGray, -1);
  const crossMat = std(0xd62828, 0.5, 0, 0x8a0f0f, 0.4);
  box(inf.g, 1.3, 0.38, 0.1, crossMat, 0, 3.3, inf.fz - 0.16);
  box(inf.g, 0.38, 1.3, 0.1, crossMat, 0, 3.3, inf.fz - 0.16);
  box(inf.roof, 2.8, 0.1, 0.9, crossMat, 0, 4.46, 0);
  box(inf.roof, 0.9, 0.1, 2.8, crossMat, 0, 4.46, 0);
  // Camilla
  box(inf.g, 2.2, 0.7, 0.9, M.steel, 4.3, 0.45, 2.6);
  box(inf.g, 2.2, 0.16, 0.9, std(0x8fd3e8, 0.8), 4.3, 0.88, 2.6);
  box(inf.g, 0.5, 0.12, 0.7, M.white, 3.4, 1.0, 2.6);
  // Escritorio con monitor
  box(inf.g, 2.2, 0.8, 1.0, std(0xb08a5a, 0.8), -4.0, 0.4, 2.8);
  box(inf.g, 0.9, 0.6, 0.06, M.dark, -4.0, 1.15, 3.1);
  // Armario con cruz
  box(inf.g, 1.6, 2.2, 0.6, M.white, 0.4, 1.1, 4.1);
  box(inf.g, 0.5, 0.16, 0.03, crossMat, 0.4, 1.7, 3.79);
  box(inf.g, 0.16, 0.5, 0.03, crossMat, 0.4, 1.7, 3.79);
  // Tensiómetro de pie y banco de espera
  cyl(inf.g, 0.05, 0.05, 1.4, M.steel, 3.1, 0.7, -0.6, 8);
  box(inf.g, 0.4, 0.3, 0.2, std(0x2a6fdb, 0.5), 3.1, 1.45, -0.6);
  box(inf.g, 0.6, 0.45, 2.6, std(0x5b6b80, 0.8), -5.3, 0.25, -1.6);
  out.roofs = { infirmary: inf.roof };
  label("Enfermería", 24, 7, 72);

  // ---------- Sala de control (Seguridad) ----------
  const ctrl = room(56, 6, 16, 10, 4.5, std(0xcfd6dc, 0.8), M.roofBlue, 1, 2.6);
  cyl(ctrl.roof, 0.1, 0.1, 6, M.steel, 6, 7.5, -3, 6);
  // Pantalla de pared (la textura del tablero se asigna desde main.js)
  box(ctrl.g, 7.6, 3.6, 0.15, M.dark, 0, 2.5, -4.65);
  const wallScreen = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.2), new THREE.MeshBasicMaterial({ color: 0x6f86a0 }));
  wallScreen.position.set(0, 2.5, -4.55);
  ctrl.g.add(wallScreen);
  out.wallScreen = wallScreen;
  // Escritorios con monitores
  for (const x of [-4.5, 4.5]) {
    box(ctrl.g, 3.4, 0.8, 1.2, std(0x8a96a3, 0.6, 0.2), x, 0.4, -1.6);
    for (const dx of [-0.8, 0.8]) box(ctrl.g, 0.9, 0.6, 0.06, std(0x223344, 0.4, 0, 0x1d4f7a, 0.6), x + dx, 1.15, -2.0);
  }
  out.roofs.control = ctrl.roof;
  label("Sala de control · Seguridad", 56, 8.5, 6);

  // ---------- Domos de materia prima ----------
  const domeGeo = new THREE.SphereGeometry(13, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [x, z] of [[-90, -66], [-62, -66]]) {
    const d = add(scene, new THREE.Mesh(domeGeo, std(0xdedad0, 0.9)), x, 0, z);
    d.scale.y = 0.8;
    cyl(scene, 1.8, 2.2, 1.2, M.steel, x, 10.8, z, 16);
    // anillo base
    add(scene, new THREE.Mesh(new THREE.TorusGeometry(13, 0.35, 6, 48), M.concreteDark), x, 0.3, z).rotation.x =
      Math.PI / 2;
  }
  label("Domos de materia prima", -76, 18, -66);

  // Galerías cubiertas (conveyors elevados cerrados)
  const gallery = (a, b, w = 2.2) => {
    beam(scene, a, b, w, 1.8, std(0xbfc3c6, 0.7, 0.3));
    beam(scene, a.clone().setY(a.y - 1.0), b.clone().setY(b.y - 1.0), w + 0.4, 0.2, M.steelDark);
    const n = Math.max(1, Math.floor(a.distanceTo(b) / 14));
    for (let i = 1; i < n; i++) {
      const p = a.clone().lerp(b, i / n);
      box(scene, 0.5, p.y - 1, 0.5, M.steelDark, p.x - 0.8, (p.y - 1) / 2, p.z);
      box(scene, 0.5, p.y - 1, 0.5, M.steelDark, p.x + 0.8, (p.y - 1) / 2, p.z);
    }
  };
  box(scene, 6, 16, 6, std(0xc4bfb3, 0.9), -40, 8, -66); // torre de transferencia
  gallery(V3(-90, 11.5, -66), V3(-43, 15, -66));
  gallery(V3(-40, 15.5, -66), V3(33, 32, -72));

  // ---------- Torre precalentadora ----------
  const tower = group(scene, 42, 0, -72);
  const H = 48;
  for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) box(tower, 0.9, H, 0.9, M.concreteDark, x, H / 2, z);
  for (let y = 8; y <= H; y += 8) box(tower, 13, 0.6, 13, M.concrete, 0, y, 0);
  const cycMat = std(0xb0aca4, 0.6, 0.3);
  for (let i = 0; i < 4; i++) {
    const y = 12 + i * 9;
    for (const x of [-3, 3]) {
      cyl(tower, 2.2, 2.2, 3, cycMat, x, y + 2, 0, 18);
      cyl(tower, 2.2, 0.4, 3.5, cycMat, x, y - 1.2, 0, 18);
    }
  }
  cyl(tower, 1.2, 1.4, 14, M.concreteDark, 4, H + 7, 4, 16);
  out.smokeOrigins.push(V3(46, H + 14.5, -68));
  label("Torre precalentadora", 42, H + 6, -72);

  // ---------- Horno rotativo ----------
  const kA = V3(33, 6.5, -63), kB = V3(-4, 3.5, -40);
  const kiln = new THREE.Group();
  kiln.position.copy(kA).add(kB).multiplyScalar(0.5);
  kiln.lookAt(kB);
  scene.add(kiln);
  const kLen = kA.distanceTo(kB);
  const spinner = new THREE.Group();
  kiln.add(spinner);
  const kGeo = new THREE.CylinderGeometry(2.6, 2.6, kLen, 32, 1, false);
  kGeo.rotateX(Math.PI / 2);
  spinner.add(new THREE.Mesh(kGeo, M.kiln));
  for (const t of [-0.35, 0, 0.35]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.25, 8, 32), M.steelDark);
    ring.position.z = t * kLen;
    spinner.add(ring);
  }
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, kLen * 0.96), M.rust);
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0);
    s.rotation.z = a;
    spinner.add(s);
  }
  out.spin.push({ obj: spinner, axis: "z", speed: 0.6 });
  for (const t of [0.15, 0.5, 0.85]) {
    const p = kA.clone().lerp(kB, t);
    box(scene, 3.2, p.y - 1.5, 3, M.concrete, p.x, (p.y - 1.5) / 2, p.z);
  }
  // Enfriador de clínker + llama
  box(scene, 9, 7, 9, std(0xb9b4a8, 0.9), -9, 3.5, -36);
  const flame = add(scene, new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), M.fire), -4.3, 3.6, -39.8);
  out.flame = flame;
  const fl = new THREE.PointLight(0xff8a2a, 30, 30, 1.6);
  fl.position.set(-5, 4, -38);
  scene.add(fl);
  out.flameLight = fl;
  cyl(scene, 0.8, 1, 16, M.concreteDark, -12, 8, -39, 12);
  out.smokeOrigins.push(V3(-12, 16.5, -39));
  label("Horno rotativo", 14, 12, -52);

  // ---------- Molino de cemento ----------
  const mill = group(scene, -32, 0, -14);
  box(mill, 3, 3, 3, M.concrete, -6, 1.5, 0);
  box(mill, 3, 3, 3, M.concrete, 6, 1.5, 0);
  const millSpin = new THREE.Group();
  millSpin.position.set(0, 4.6, 0);
  mill.add(millSpin);
  const mGeo = new THREE.CylinderGeometry(2.6, 2.6, 13, 28);
  mGeo.rotateZ(Math.PI / 2);
  millSpin.add(new THREE.Mesh(mGeo, std(0x3f7f9a, 0.5, 0.4)));
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.12, 0.3), M.yellow);
    const a = (i / 4) * Math.PI * 2;
    s.position.set(0, Math.cos(a) * 2.62, Math.sin(a) * 2.62);
    s.rotation.x = a;
    millSpin.add(s);
  }
  out.spin.push({ obj: millSpin, axis: "x", speed: 1.4 });
  box(mill, 3.5, 3, 3, M.green, 9.5, 2.5, 0); // motor
  cyl(mill, 2, 2.5, 6, std(0xa3a8ad, 0.6, 0.3), -3, 11, -5, 18); // separador
  box(mill, 4, 4, 4, M.concreteDark, -3, 6, -5);
  label("Molino de cemento", -32, 10, -14);
  gallery(V3(-12, 8, -34), V3(-30, 9, -19));

  // ---------- Silos de cemento ----------
  for (const x of [-74, -62, -50]) {
    cyl(scene, 5, 5, 26, std(0xe3ded2, 0.85), x, 13, -4, 32);
    add(scene, new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.5, 32), M.concreteDark), x, 27.2, -4);
    box(scene, 0.15, 26, 0.6, M.steelDark, x + 5, 13, -4); // escalera
  }
  box(scene, 30, 1.2, 4, M.steelDark, -62, 28.8, -4);
  gallery(V3(-30, 9, -12), V3(-47, 29, -4));
  label("Silos de cemento", -62, 33, -4);

  return out;
}
