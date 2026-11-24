import * as THREE from "three";
import { LAYERS } from "./data.js";

const POSITIONS = {
  canales: [-96, 64, -64], entrada: [-48, 64, -64], app: [0, 64, -64],
  ia: [48, 64, -64], integracion: [96, 64, -64],
  devops: [-96, 27, 62], plataforma: [-48, 27, 62], datosapp: [0, 27, 62],
  fabric: [48, 27, 62], registro: [96, 27, 62]
};
const TITLES = {
  canales: "Usuarios y canales", entrada: "Identidad y acceso", app: "Aplicación",
  ia: "IA · Microsoft Foundry", integracion: "Integración",
  devops: "GitHub · DevOps", plataforma: "Plataforma Azure", datosapp: "Datos de la app",
  fabric: "Fabric · Analítica", registro: "Sistemas de registro"
};
export const ARCHITECTURE_CONNECTIONS = [
  ["canales", "entrada"], ["entrada", "app"], ["app", "ia"], ["app", "datosapp"],
  ["app", "integracion"], ["ia", "integracion"], ["integracion", "registro"],
  ["registro", "fabric"], ["datosapp", "fabric"], ["plataforma", "app"], ["devops", "app"]
];

export function buildArchitectureNetwork(scene, makeLabel, onLayer) {
  const group = new THREE.Group();
  group.name = "architecture-network";
  group.visible = false;
  scene.add(group);
  const positions = new Map();
  for (const layer of LAYERS) {
    if (!POSITIONS[layer.id]) throw new Error(`Falta la posición de la capa ${layer.id}`);
    const position = new THREE.Vector3(...POSITIONS[layer.id]);
    positions.set(layer.id, position);
    const station = new THREE.Group();
    station.name = `architecture-${layer.id}`;
    station.position.copy(position);
    group.add(station);
    const material = new THREE.MeshBasicMaterial({ color: layer.color, fog: false });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), material);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, .18, 8, 40), material);
    ring.rotation.x = Math.PI / 2;
    station.add(orb, ring);
    const highlights = layer.components.slice(0, 2).map(component => component.name).join(" · ");
    const card = makeLabel(
      `<span class="spatial-icon" aria-hidden="true">${layer.icon}</span><span class="spatial-copy"><strong>${TITLES[layer.id]}</strong><small>${highlights}</small></span>`,
      "spatial-node", station, new THREE.Vector3(0, 7, 0), () => onLayer(layer.id)
    );
    card.element.style.setProperty("--layer-color", `#${layer.color.toString(16).padStart(6, "0")}`);
    card.element.setAttribute("aria-label", `Ver capa: ${layer.name}`);
    card.element.dataset.networkLayer = layer.id;
    card.element.dataset.caption = TITLES[layer.id];
  }
  const pulses = ARCHITECTURE_CONNECTIONS.map(([from, to], index) => {
    if (!positions.has(from) || !positions.has(to)) throw new Error(`Conexión de arquitectura inválida: ${from} → ${to}`);
    const start = positions.get(from);
    const finish = positions.get(to);
    const middle = start.clone().lerp(finish, .5);
    middle.y += 14 + (index % 3) * 5;
    const curve = new THREE.CatmullRomCurve3([start, middle, finish]);
    const color = LAYERS.find(layer => layer.id === from).color;
    const line = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, .35, 5, false),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(.6), transparent: true, opacity: .85, fog: false })
    );
    line.name = `flow-${from}-${to}`;
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(.9, 8, 6), new THREE.MeshBasicMaterial({ color, fog: false }));
    pulse.name = `pulse-${from}-${to}`;
    pulse.position.copy(start);
    group.add(line, pulse);
    return { curve, pulse, offset: index * .17 };
  });
  return {
    group,
    setVisible(value) { group.visible = value; },
    update(time) {
      if (!group.visible) return;
      for (const { curve, pulse, offset } of pulses) curve.getPointAt((time * .12 + offset) % 1, pulse.position);
    }
  };
}
