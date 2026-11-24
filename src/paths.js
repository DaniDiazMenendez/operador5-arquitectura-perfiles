import * as THREE from "three";
import { V3, std, beam } from "./helpers.js";

// Red de sendas peatonales de la planta. Las personas solo caminan por acá.
export const NODES = {
  gateOut: V3(2.5, 0, 122),
  gateFront: V3(2.5, 0, 92),
  gateIn: V3(2.5, 0, 80),
  accJ: V3(2.5, 0, 60),
  wOffice: V3(-22, 0, 60),
  offDoor: V3(-22, 0, 64.6),
  wCross: V3(9.5, 0, 60),
  crossN: V3(9.5, 0, 46.5),
  c3: V3(9.5, 0, 35.5),
  forkP: V3(17.5, 0, 46.5),
  wInf: V3(24, 0, 60),
  infDoor: V3(24, 0, 65.5),
  infIn: V3(24, 0, 69.6),
  wPacking: V3(59, 0, 60),
  packing: V3(59, 0, 50),
  wDispatch: V3(78, 0, 60),
  dispatch: V3(78, 0, 68),
};

const EDGES = [
  ["gateOut", "gateFront"],
  ["gateFront", "gateIn"],
  ["gateIn", "accJ"],
  ["accJ", "wOffice"],
  ["wOffice", "offDoor"],
  ["accJ", "wCross"],
  ["wCross", "crossN"],
  ["crossN", "c3"],
  ["crossN", "forkP"],
  ["wCross", "wInf"],
  ["wInf", "infDoor"],
  ["infDoor", "infIn"],
  ["wInf", "wPacking"],
  ["wPacking", "packing"],
  ["wPacking", "wDispatch"],
  ["wDispatch", "dispatch"],
];

const adj = {};
for (const [a, b] of EDGES) {
  (adj[a] ||= []).push(b);
  (adj[b] ||= []).push(a);
}

// Camino más corto (Dijkstra) entre dos nodos.
export function route(from, to) {
  if (from === to) return [from];
  const dist = { [from]: 0 };
  const prev = {};
  const open = new Set([from]);
  while (open.size) {
    let u = null;
    for (const n of open) if (u === null || dist[n] < dist[u]) u = n;
    open.delete(u);
    if (u === to) break;
    for (const v of adj[u] || []) {
      const d = dist[u] + NODES[u].distanceTo(NODES[v]);
      if (dist[v] === undefined || d < dist[v]) {
        dist[v] = d;
        prev[v] = u;
        open.add(v);
      }
    }
  }
  const out = [to];
  let c = to;
  while (c !== from) {
    c = prev[c];
    if (c === undefined) return [from, to];
    out.unshift(c);
  }
  return out;
}

// Pinta las sendas peatonales (verde con bordes amarillos) y las cebras sobre las calles.
export function drawWalkways(scene) {
  const green = std(0x3f9a5c, 0.95);
  const edge = std(0xf2c200, 0.7);
  const white = std(0xf4f4f0, 0.8);
  const W = 1.9;
  for (const [a, b] of EDGES) {
    const p = NODES[a].clone().setY(0.05), q = NODES[b].clone().setY(0.05);
    const m = beam(scene, p, q, W, 0.02, green);
    m.receiveShadow = true;
    const d = q.clone().sub(p).normalize();
    const n = V3(-d.z, 0, d.x);
    for (const s of [-1, 1]) {
      beam(scene, p.clone().addScaledVector(n, s * (W / 2)).setY(0.065), q.clone().addScaledVector(n, s * (W / 2)).setY(0.065), 0.14, 0.02, edge);
    }
  }
  for (const k of Object.keys(NODES)) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, 0.02, 20), green);
    c.position.copy(NODES[k]).setY(0.05);
    scene.add(c);
  }
  // Cebra: cruce de la calle transversal hacia la Cinta 3
  for (let z = 48.4; z <= 55.8; z += 1.2) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 0.6), white);
    s.position.set(9.5, 0.075, z);
    scene.add(s);
  }
  // Cebra: senda que cruza el acceso principal
  for (let x = -4.2; x <= 4.2; x += 1.2) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 3.2), white);
    s.position.set(x, 0.075, 60);
    scene.add(s);
  }
}
