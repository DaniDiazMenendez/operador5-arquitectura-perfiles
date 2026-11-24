import * as THREE from "three";

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function std(color, roughness = 0.85, metalness = 0, emissive = 0x000000, emissiveIntensity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

export const M = {
  concrete: std(0xd2cbbb, 0.95),
  concreteDark: std(0xa69e8d, 0.95),
  steel: std(0x8a9199, 0.55, 0.55),
  steelDark: std(0x4a4f57, 0.6, 0.5),
  yellow: std(0xf2b705, 0.6),
  orange: std(0xe0661b, 0.6),
  rust: std(0x8e5a3a, 0.85),
  white: std(0xf1f1ee, 0.8),
  roofBlue: std(0x41617f, 0.7),
  roofOrange: std(0xc9581c, 0.7),
  roofGray: std(0x6f747a, 0.8),
  glass: std(0x9fd3f0, 0.15, 0.1, 0x2c5f7c, 0.6),
  belt: std(0x262626, 0.95),
  red: std(0xc8302a, 0.6),
  green: std(0x2d7a4f, 0.6),
  bag: std(0xdccfae, 0.95),
  pallet: std(0xa57a45, 0.9),
  ground: std(0xbdb4a2, 1),
  road: std(0x5d5c58, 1),
  grass: std(0x9aa27a, 1),
  dark: std(0x1e2126, 0.8),
  kiln: std(0x6b6e72, 0.5, 0.6),
  fire: new THREE.MeshBasicMaterial({ color: 0xffa040 }),
};

export function add(parent, mesh, x = 0, y = 0, z = 0) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function box(parent, w, h, d, mat, x = 0, y = 0, z = 0) {
  return add(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
}

export function cyl(parent, rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 28) {
  return add(parent, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z);
}

// Caja orientada de a -> b (eje largo = z local)
export function beam(parent, a, b, w, h, mat) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.lookAt(b);
  parent.add(m);
  return m;
}

export function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function smokeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, "rgba(235,232,225,0.9)");
  g.addColorStop(1, "rgba(235,232,225,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}
