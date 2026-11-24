export const OPERATOR = "Alex";
export const ASSISTANT = "Nexo";
export const STORAGE_KEY = "planta-conectada-turno-v1";

export const SECTORS = [
  {
    id: "cinta", name: "Cinta 3", node: "c3", aliases: ["cinta"],
    guide: { id: "DEM-C3", title: "Registro de novedades de Cinta 3", text: "Revisar el parte del turno, registrar una observación ilustrativa y derivar novedades a coordinación. Esta ficha no contiene instrucciones para intervenir equipos ni autoriza trabajos." },
    stock: { name: "kits de identificación", quantity: 12, reference: "INV-C3" }
  },
  {
    id: "ensacado", name: "Ensacado", node: "packing", aliases: ["ensacado", "paletizado"],
    guide: { id: "DEM-EN", title: "Identificación documental de lotes", text: "Comparar el identificador de lote del ejemplo con el parte del sector, registrar coincidencias y comunicar diferencias. Los lotes y documentos de esta demostración son ficticios." },
    stock: { name: "rollos de etiquetas", quantity: 18, reference: "INV-EN" }
  },
  {
    id: "despacho", name: "Despacho", node: "dispatch", aliases: ["despacho", "expedicion"],
    guide: { id: "DEM-DE", title: "Preparación del parte de despacho", text: "Revisar los pedidos de ejemplo, verificar sus referencias documentales y preparar un resumen para logística. La demo no libera cargas ni modifica pedidos reales." },
    stock: { name: "juegos de documentación", quantity: 8, reference: "INV-DE" }
  },
  {
    id: "oficina", name: "Oficina", node: "offDoor", aliases: ["oficina"],
    guide: { id: "DEM-OF", title: "Entrega digital de turno", text: "Consolidar tareas completadas, avisos locales y pendientes. El resumen conserva los temas que requieren revisión humana y no los presenta como resueltos." },
    stock: { name: "fundas para tablet", quantity: 6, reference: "INV-OF" }
  }
];

export const TASKS = [
  { id: "PC-101", sectorId: "cinta", title: "Registrar novedades del sector", priority: "Media", summary: "Prepará el relevamiento documental de Cinta 3 para el próximo turno.", steps: ["Revisé el parte ilustrativo del sector", "Registré la novedad del ejemplo", "Identifiqué a coordinación como destinataria"] },
  { id: "PC-102", sectorId: "cinta", title: "Derivar una observación de equipo", priority: "Alta", summary: "La observación requiere revisión de coordinación. Alex puede crear un aviso, pero no autorizar la intervención.", approvalRequired: true, steps: ["Revisión pendiente de coordinación"] },
  { id: "PC-201", sectorId: "ensacado", title: "Verificar identificación de lotes", priority: "Media", summary: "Contrastá los datos ficticios del lote DEM-24 con el parte de Ensacado.", steps: ["Consulté la ficha DEM-EN", "Comparé el lote DEM-24 con el parte de ejemplo", "Registré el resultado documental"] },
  { id: "PC-301", sectorId: "despacho", title: "Preparar el parte de despacho", priority: "Media", summary: "Consolidá la documentación ilustrativa de los pedidos del sector.", steps: ["Revisé los pedidos ficticios del turno", "Verifiqué las referencias documentales", "Preparé el resumen para logística"] },
  { id: "PC-401", sectorId: "oficina", title: "Preparar la entrega de turno", priority: "Baja", summary: "Dejá una nota de relevo con lo realizado y lo que sigue pendiente.", steps: ["Revisé el avance de las tareas", "Incluí los avisos locales y los pendientes", "Redacté la nota para el siguiente turno"] }
];

export const STATUS_LABELS = { pending: "Pendiente", active: "En curso", done: "Completada", blocked: "Requiere coordinación" };
export const sectorById = id => {
  const sector = SECTORS.find(item => item.id === id);
  if (!sector) throw new Error("Ese sector no existe.");
  return sector;
};
export const taskById = id => {
  const task = TASKS.find(item => item.id === id);
  if (!task) throw new Error("Esa tarea no existe.");
  return task;
};

export function createTurn() {
  return {
    version: 1, sectorId: "cinta", notices: [],
    tasks: Object.fromEntries(TASKS.map(task => [task.id, {
      status: task.approvalRequired ? "blocked" : "pending",
      checks: task.steps.map(() => false), note: ""
    }]))
  };
}

export function restoreTurn(json) {
  const state = JSON.parse(json);
  if (state?.version !== 1 || !SECTORS.some(sector => sector.id === state.sectorId) || !state.tasks || !Array.isArray(state.notices)) {
    throw new Error("El turno guardado no es compatible con esta demo.");
  }
  for (const task of TASKS) {
    const progress = state.tasks[task.id];
    if (!progress || !Object.hasOwn(STATUS_LABELS, progress.status) ||
      typeof progress.note !== "string" || progress.note.length > 1000 ||
      !Array.isArray(progress.checks) || progress.checks.length !== task.steps.length ||
      !progress.checks.every(value => typeof value === "boolean") ||
      (task.approvalRequired ? progress.status !== "blocked" : progress.status === "blocked") ||
      (progress.status === "done" && (!progress.note.trim() || !progress.checks.every(Boolean)))) {
      throw new Error("El turno guardado contiene una tarea inválida.");
    }
  }
  if (TASKS.filter(task => state.tasks[task.id].status === "active").length > 1) {
    throw new Error("El turno guardado contiene más de una tarea en curso.");
  }
  for (const notice of state.notices) {
    if (!notice || typeof notice.draftId !== "string" || !/^PC-A\d+$/.test(notice.id) ||
      !TASKS.some(task => task.id === notice.taskId && task.sectorId === notice.sectorId) ||
      typeof notice.text !== "string" || notice.text.length > 1200) {
      throw new Error("El turno guardado contiene un aviso inválido.");
    }
  }
  if (new Set(state.notices.map(notice => notice.draftId)).size !== state.notices.length) {
    throw new Error("El turno guardado contiene avisos duplicados.");
  }
  return state;
}

export function startTask(state, taskId) {
  const task = taskById(taskId);
  if (task.approvalRequired) throw new Error("Esta tarea requiere coordinación. El operador y Nexo no pueden autorizarla.");
  if (task.sectorId !== state.sectorId) throw new Error("Primero seleccioná el sector de la tarea.");
  if (state.tasks[taskId].status !== "pending") throw new Error("Solo se puede iniciar una tarea pendiente.");
  const active = TASKS.find(item => state.tasks[item.id].status === "active");
  if (active) throw new Error(`Terminá ${active.id} o consultá su detalle antes de iniciar otra tarea.`);
  state.tasks[taskId].status = "active";
}

export function completeTask(state, taskId) {
  const task = taskById(taskId);
  const progress = state.tasks[taskId];
  if (task.approvalRequired || progress.status !== "active") throw new Error("Esta tarea no está habilitada para completar.");
  if (task.sectorId !== state.sectorId) throw new Error("Volvé al sector de la tarea para completarla.");
  if (!progress.checks.every(Boolean) || !progress.note.trim()) throw new Error("Completá las verificaciones y registrá una observación.");
  progress.status = "done";
}

export function createNotice(state, draft) {
  const existing = state.notices.find(notice => notice.draftId === draft.draftId);
  if (existing) return existing;
  const task = taskById(draft.taskId);
  if (task.sectorId !== draft.sectorId || !draft.draftId || typeof draft.text !== "string" ||
    !draft.text.trim() || draft.text.length > 1200) throw new Error("El borrador del aviso no es válido.");
  const notice = { ...draft, id: `PC-A${String(state.notices.length + 1).padStart(3, "0")}` };
  state.notices.push(notice);
  return notice;
}

const normalize = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function replyToMessage(message, state, selectedTaskId, previousTopic = "") {
  if (typeof message !== "string" || !message.trim() || message.length > 800) throw new Error("Escribí una consulta de hasta 800 caracteres.");
  const text = normalize(message);
  const mentioned = SECTORS.find(sector => sector.aliases.some(alias => text.includes(alias)));
  const mentionedTask = TASKS.find(task => text.includes(task.id.toLowerCase()));
  const sector = sectorById(mentionedTask?.sectorId || mentioned?.id || state.sectorId);
  const tasks = TASKS.filter(task => task.sectorId === sector.id);
  const selected = tasks.find(task => task.id === (mentionedTask?.id || selectedTaskId)) || tasks[0];
  const answer = (body, topic, sources = [], draft = null) => ({ text: body, topic, sources, draft });
  if (/saltear|salt[eé]ar|sin permiso|autoriza|desbloquea|bloqueo|engras|lubric|valvula|intervenir|grasa/.test(text)) {
    return answer("No puedo autorizar trabajos, omitir permisos ni indicar intervenciones en equipos. La observación PC-102 sigue pendiente de coordinación. Consultá los procedimientos aprobados y a la persona responsable.", "limits", [sector.guide]);
  }
  if (/crear|crea |generar|genera |preparar|prepara |reportar/.test(text) && /aviso|novedad|reporte/.test(text)) {
    return answer(`Preparé un borrador para ${sector.name}, vinculado a ${selected.id}. Revisalo y confirmá «Crear aviso local». No se enviará a SAP ni a otro sistema.`, "notice", [sector.guide], {
      taskId: selected.id, sectorId: sector.id, text: `${selected.title}. ${state.tasks[selected.id].note.trim() || selected.summary}`
    });
  }
  if (/stock|material|inventario|repuesto/.test(text) || (previousTopic === "stock" && /cuant|hay|disponible|quedan/.test(text))) {
    return answer(`En ${sector.name} hay ${sector.stock.quantity} ${sector.stock.name} en el inventario ficticio. Es una consulta ilustrativa: no reserva materiales ni consulta existencias reales.`, "stock", [{
      id: sector.stock.reference, title: `Inventario de ${sector.name}`, text: `${sector.stock.quantity} ${sector.stock.name}. Datos sintéticos de esta demostración.`
    }]);
  }
  if (/guia|manual|document|como hago|como se hace|verificacion|checklist/.test(text)) {
    return answer(`${sector.name}: ${sector.guide.text}`, "guide", [sector.guide]);
  }
  if (/resumen|turno|relevo|avance/.test(text)) {
    const count = status => TASKS.filter(task => state.tasks[task.id].status === status).length;
    return answer(`Turno de ${OPERATOR}: ${count("done")} de ${TASKS.length} tareas completadas, ${count("active")} en curso, ${count("pending")} pendientes y ${count("blocked")} que requiere coordinación. Hay ${state.notices.length} avisos locales. Ningún pendiente se cierra automáticamente.`, "summary");
  }
  if (/cerrar|cerra |completar|completa |iniciar|inicia |terminar/.test(text)) {
    return answer(`La tarea ${selected.id} está en estado «${STATUS_LABELS[state.tasks[selected.id].status]}». Usá sus controles en «Tareas»: Nexo no inicia ni completa trabajo por vos, y no puede autorizar tareas de coordinación.`, "task");
  }
  if (/tarea|pendiente|prioridad|hacer|estado/.test(text)) {
    return answer(`${sector.name}:\n${tasks.map(task => `${task.id} · ${task.title}: ${STATUS_LABELS[state.tasks[task.id].status]}.`).join("\n")}\nPodés abrir cada tarea en la pestaña «Tareas».`, "tasks", [sector.guide]);
  }
  if (/hola|ayuda|podes|puedes|quien/.test(text)) {
    return answer(`Soy ${ASSISTANT}, el asistente de demostración de ${OPERATOR}. Puedo consultar tareas, guías ilustrativas, inventario ficticio y el resumen del turno, o preparar un aviso para que lo confirmes.`, "help");
  }
  return answer("Esa consulta no está cubierta por los datos de esta demo. Puedo ayudarte con tareas, guías, materiales, avisos y el resumen del turno. No tengo un modelo de IA ni sistemas de planta conectados.", "unsupported");
}
