import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LAYERS, PROFILES } from '../src/data.js';
import { profilesOverlayHTML, archOverlayHTML } from '../src/ui.js';
import * as THREE from 'three';
import { buildArchitectureNetwork } from '../src/architecture-network.js';

before(() => {
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'pipe'
  });
});

test('los perfiles presentan permisos y permiten localizar su rol sin mostrar pantallas', () => {
  const html = profilesOverlayHTML();
  for (const profile of PROFILES) {
    assert.ok(html.includes(`data-profile="${profile.id}"`));
    assert.ok(html.includes(`data-locate="${profile.actor}"`));
    for (const permission of [...profile.can, ...profile.cannot]) assert.ok(html.includes(permission));
  }
  assert.doesNotMatch(html, /<img|mockup|data-goto|undefined|Sus pantallas/i);
});

test('cada componente de un perfil navega a una capa de arquitectura existente', () => {
  const profiles = profilesOverlayHTML();
  const architecture = archOverlayHTML();
  for (const profile of PROFILES) {
    for (const reference of profile.arch) {
      const [layerId, componentId] = reference.split(':');
      const layer = LAYERS.find(item => item.id === layerId);
      assert.ok(layer, reference);
      const component = layer.components.find(item => item.id === componentId);
      assert.ok(component, reference);
      assert.ok(profiles.includes(`data-layer="${layerId}"`));
      assert.ok(architecture.includes(`data-architecture="${layerId}"`));
      assert.ok(architecture.includes(component.name));
    }
  }
});

test('el mapa 3D conecta las capas, abre sus documentos y congela los flujos al ocultarse', () => {
  const selected = [];
  const actions = [];
  const scene = new THREE.Scene();
  const network = buildArchitectureNetwork(scene, (html, cls, parent, position, click) => {
    const label = new THREE.Object3D();
    label.position.copy(position);
    label.element = { style: { setProperty() {} }, setAttribute() {}, dataset: {} };
    parent.add(label);
    actions.push(click);
    return label;
  }, id => selected.push(id));
  actions.forEach(click => click());
  assert.deepEqual(selected, LAYERS.map(layer => layer.id));
  const pulse = scene.getObjectByName('pulse-canales-entrada');
  const start = pulse.position.clone();
  network.setVisible(true);
  network.update(2);
  assert.ok(pulse.position.distanceTo(start) > 1);
  const frozen = pulse.position.clone();
  network.setVisible(false);
  network.update(10);
  assert.ok(pulse.position.equals(frozen));
});

test('la publicación no contiene recursos ni rutas del recorrido retirado', async () => {
  async function files(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const result = await Promise.all(entries.map(entry => {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      return entry.isDirectory() ? files(url) : [url];
    }));
    return result.flat();
  }
  const artifacts = await files(new URL('../dist/', import.meta.url));
  for (const artifact of artifacts) {
    assert.doesNotMatch(artifact.pathname, /mockups|step-\d+|circulo|satelites/);
    if (/\.(js|css|html)$/.test(artifact.pathname)) {
      const text = await readFile(artifact, 'utf8');
      assert.doesNotMatch(text, /mockups[\\/]|TOUR_STEPS|data-goto|step-\d+\.png|tablet-panel|caption-bar|pre-intro/i);
    }
  }
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /lang="es"/);
  assert.match(html, /Sin servicios conectados/);
  assert.doesNotMatch(html, /runtime-overlay|Cómo funciona esta animación|btn-runtime/);
  assert.match(html, /Turno de Alex/);
  assert.match(html, /Conversación con Nexo/);
});
