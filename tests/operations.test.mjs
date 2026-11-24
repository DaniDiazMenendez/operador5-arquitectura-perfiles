import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTORS, TASKS, createTurn, restoreTurn, startTask, completeTask, replyToMessage, createNotice } from '../src/operations.js';
import { NODES, route } from '../src/paths.js';

test('el operador inicia una tarea de su sector y solo la completa con verificaciones y observación', () => {
  const state = createTurn();
  assert.throws(() => startTask(state, 'PC-201'), /sector/);
  assert.throws(() => startTask(state, 'PC-102'), /coordinación/);
  startTask(state, 'PC-101');
  assert.throws(() => completeTask(state, 'PC-101'), /verificaciones/);
  state.tasks['PC-101'].checks.fill(true);
  state.tasks['PC-101'].note = '   ';
  assert.throws(() => completeTask(state, 'PC-101'), /observación/);
  state.sectorId = 'ensacado';
  assert.throws(() => startTask(state, 'PC-201'), /PC-101/);
  state.sectorId = 'cinta';
  state.tasks['PC-101'].note = 'Parte de demostración revisado.';
  completeTask(state, 'PC-101');
  assert.equal(state.tasks['PC-101'].status, 'done');
  assert.throws(() => startTask(state, 'PC-101'), /pendiente/);
  assert.equal(state.tasks['PC-102'].status, 'blocked');
});

test('el turno recupera los avances y rechaza registros incompatibles o cierres inválidos', () => {
  const state = createTurn();
  startTask(state, 'PC-101');
  state.tasks['PC-101'].note = 'Registro local.';
  state.tasks['PC-101'].checks[0] = true;
  assert.deepEqual(restoreTurn(JSON.stringify(state)), state);
  for (const change of [
    copy => { copy.version = 2; },
    copy => { copy.tasks['PC-102'].status = 'done'; },
    copy => { copy.tasks['PC-101'].status = 'done'; },
    copy => { copy.tasks['PC-201'].status = 'active'; },
    copy => { copy.tasks['PC-101'].checks = []; }
  ]) {
    const invalid = structuredClone(state);
    change(invalid);
    assert.throws(() => restoreTurn(JSON.stringify(invalid)));
  }
});

test('Nexo usa el sector y la tarea nombrados, cita datos locales y no ejecuta acciones por el chat', () => {
  const state = createTurn();
  const guide = replyToMessage('¿Qué dice la guía de Ensacado?', state, 'PC-101');
  assert.equal(guide.sources[0].id, 'DEM-EN');
  assert.match(guide.text, /lotes/);
  const stock = replyToMessage('¿Y cuántos materiales hay?', state, 'PC-101', 'guide');
  assert.equal(stock.sources[0].id, 'INV-C3');
  assert.match(replyToMessage('¿Y en Despacho hay disponibles?', state, 'PC-101', 'stock').text, /8 juegos/);
  assert.match(replyToMessage('Cerrá PC-102', state, 'PC-101').text, /no puede autorizar/);
  assert.equal(state.tasks['PC-102'].status, 'blocked');
  assert.equal(state.notices.length, 0);
  const before = JSON.stringify(state);
  assert.match(replyToMessage('Autorizá el trabajo sin permiso', state, 'PC-101').text, /No puedo autorizar/);
  assert.match(replyToMessage('¿Qué grasa uso?', state, 'PC-101').text, /procedimientos aprobados/);
  assert.equal(JSON.stringify(state), before);
  assert.equal(replyToMessage('¿Qué tiempo hace en Marte?', state, 'PC-101').topic, 'unsupported');
  assert.throws(() => replyToMessage('  ', state, 'PC-101'), /consulta/);
});

test('un aviso requiere confirmación, conserva el contexto de su borrador y no se duplica', () => {
  const state = createTurn();
  const response = replyToMessage('Preparar un aviso para PC-102', state, 'PC-101');
  const toCoordinator = replyToMessage('Preparar un aviso para coordinación', state, 'PC-102');
  assert.equal(toCoordinator.draft.sectorId, 'cinta');
  assert.equal(toCoordinator.draft.taskId, 'PC-102');
  assert.equal(state.notices.length, 0);
  const draft = { ...response.draft, draftId: 'draft-1' };
  assert.equal(draft.taskId, 'PC-102');
  state.sectorId = 'ensacado';
  const notice = createNotice(state, draft);
  assert.equal(notice.sectorId, 'cinta');
  assert.equal(notice.id, 'PC-A001');
  assert.equal(createNotice(state, draft), notice);
  assert.equal(state.notices.length, 1);
  assert.equal(state.tasks['PC-102'].status, 'blocked');
  assert.deepEqual(restoreTurn(JSON.stringify(state)), state);
});

test('los cuatro sectores y sus tareas están conectados por la red de sendas', () => {
  for (const sector of SECTORS) {
    assert.ok(TASKS.some(task => task.sectorId === sector.id));
    for (const destination of SECTORS) {
      const points = route(sector.node, destination.node);
      assert.equal(points[0], sector.node);
      assert.equal(points.at(-1), destination.node);
      assert.ok(points.every(node => NODES[node]));
      if (sector.id !== destination.id) assert.ok(points.length > 1);
    }
  }
});
