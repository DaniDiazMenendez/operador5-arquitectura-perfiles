import { OPERATOR, ASSISTANT, SECTORS, TASKS, STATUS_LABELS, STORAGE_KEY, createTurn, restoreTurn, sectorById, taskById, startTask, completeTask, createNotice, replyToMessage } from "./operations.js";

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export function createWorkspace({ onSectorChange, onTaskCounts, onVisibilityChange }) {
  const $ = id => document.getElementById(id);
  const panel = $("work-panel");
  let state = createTurn();
  let storage;
  let sceneAvailable = false;
  let moving = false;
  let selectedTask;
  let previousTopic = "";
  let activeTab = "tasks";
  const drafts = new Map();
  function showAlert(message) {
    $("work-alert").textContent = message;
    $("work-alert").hidden = !message;
  }
  function storageWarning(error) {
    console.error("No se pudo recuperar o guardar el turno local:", error);
    $("work-warning").textContent = "No se pudieron usar los avances guardados. Podés continuar en esta pestaña; no cierres la página si querés conservar lo que hagas.";
    $("work-warning").hidden = false;
    $("storage-status").textContent = "Avance solo en esta pestaña";
  }
  try {
    storage = window.localStorage;
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) state = restoreTurn(saved);
  } catch (error) {
    storage = null;
    storageWarning(error);
  }
  selectedTask = TASKS.find(task => task.sectorId === state.sectorId && state.tasks[task.id].status !== "done")?.id ||
    TASKS.find(task => task.sectorId === state.sectorId).id;

  function save() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      $("storage-status").textContent = "Tareas guardadas en este navegador";
    } catch (error) {
      storage = null;
      storageWarning(error);
    }
  }
  function taskCounts() {
    return Object.fromEntries(SECTORS.map(sector => [sector.id, TASKS.filter(task => task.sectorId === sector.id && state.tasks[task.id].status !== "done").length]));
  }
  function updateReadiness() {
    const progress = state.tasks[selectedTask];
    const complete = $("task-complete");
    if (complete) complete.disabled = moving || !progress.checks.every(Boolean) || !progress.note.trim();
    const count = $("task-check-count");
    if (count) count.textContent = `${progress.checks.filter(Boolean).length}/${progress.checks.length} verificaciones`;
  }
  function renderTasks() {
    const sector = sectorById(state.sectorId);
    const tasks = TASKS.filter(task => task.sectorId === sector.id);
    const task = taskById(selectedTask);
    const progress = state.tasks[task.id];
    const active = TASKS.find(item => state.tasks[item.id].status === "active");
    $("task-list").innerHTML = tasks.map(item => `<button type="button" class="task-row" data-task="${item.id}" aria-pressed="${item.id === selectedTask}">
      <span><small>${item.id} · Prioridad ${item.priority.toLowerCase()}</small><strong>${item.title}</strong></span>
      <span class="task-state state-${state.tasks[item.id].status}">${STATUS_LABELS[state.tasks[item.id].status]}</span>
    </button>`).join("");
    $("active-task-link").hidden = !active || active.sectorId === sector.id;
    if (active && active.sectorId !== sector.id) {
      $("active-task-link").dataset.taskLink = active.id;
      $("active-task-link").textContent = `Volver a ${active.id}, en curso en ${sectorById(active.sectorId).name}`;
    }
    let controls;
    if (progress.status === "blocked") {
      controls = `<p class="task-gate">Requiere revisión de coordinación. Ni Alex ni Nexo pueden autorizar esta tarea desde la demo.</p><button class="work-primary" type="button" data-ask="Preparar un aviso para coordinación">Preparar aviso con Nexo</button>`;
    } else if (progress.status === "pending") {
      controls = `<p class="task-help">${moving ? "La tarea estará disponible al llegar al sector." : "Iniciá la tarea para registrar las verificaciones y tu observación."}</p><button class="work-primary" type="button" data-start="${task.id}" ${moving ? "disabled" : ""}>Iniciar tarea</button>`;
    } else {
      controls = `<fieldset class="task-checklist" ${progress.status === "done" || moving ? "disabled" : ""}><legend id="task-check-count">${progress.checks.filter(Boolean).length}/${task.steps.length} verificaciones</legend>
        ${task.steps.map((step, index) => `<label><input type="checkbox" data-check="${index}" ${progress.checks[index] ? "checked" : ""}><span>${step}</span></label>`).join("")}</fieldset>
        <label class="work-label" for="task-note">Observación del turno <span>Solo datos ficticios</span></label>
        <textarea id="task-note" maxlength="1000" rows="3" ${progress.status === "done" ? "readonly" : ""} ${moving ? "disabled" : ""} aria-describedby="task-help" placeholder="Ej.: parte revisado; novedad derivada a coordinación.">${escapeHTML(progress.note)}</textarea>
        <p id="task-help" class="task-help">${progress.status === "done" ? "Registro de demostración completado. No se notificó a ningún sistema externo." : "Marcá todas las verificaciones y agregá una observación para completar."}</p>
        ${progress.status === "active" ? '<button id="task-complete" class="work-primary" type="button" data-complete>Completar tarea</button>' : ""}`;
    }
    $("task-detail").innerHTML = `<div class="task-detail-heading"><span>${task.id}</span><button type="button" class="work-text-button" data-ask="¿Qué dice la guía de esta tarea?">Consultar a Nexo</button></div>
      <h3 id="task-title" tabindex="-1">${task.title}</h3><p class="task-summary">${task.summary}</p>${controls}`;
    updateReadiness();
    $("work-notices").textContent = state.notices.length
      ? state.notices.map(notice => `${notice.id} · ${sectorById(notice.sectorId).name} · ${notice.text}`).join("\n")
      : "Todavía no creaste avisos. Nexo puede preparar uno para que lo revises y confirmes.";
    $("notice-count").textContent = String(state.notices.length);
  }
  function render() {
    const counts = taskCounts();
    for (const sector of SECTORS) {
      const button = panel.querySelector(`[data-sector="${sector.id}"]`);
      button.setAttribute("aria-pressed", String(sector.id === state.sectorId));
      button.querySelector("small").textContent = `${counts[sector.id]} pend.`;
    }
    $("work-location").textContent = moving
      ? `${OPERATOR} se dirige a ${sectorById(state.sectorId).name}…`
      : `${OPERATOR} · ${sectorById(state.sectorId).name}${sceneAvailable ? "" : " · Vista de tareas disponible"}`;
    $("turn-progress").textContent = `${TASKS.filter(task => state.tasks[task.id].status === "done").length}/${TASKS.length} completadas`;
    renderTasks();
    onTaskCounts(counts);
  }
  function setTab(tab, focus = false) {
    activeTab = tab;
    for (const name of ["tasks", "chat"]) {
      $(`${name}-tab`).setAttribute("aria-selected", String(tab === name));
      $(`${name}-tab`).tabIndex = tab === name ? 0 : -1;
      $(`${name}-panel`).hidden = tab !== name;
    }
    if (focus) $(`${tab}-tab`).focus();
    if (tab === "chat") $("chat-log").scrollTop = $("chat-log").scrollHeight;
  }
  function setOpen(open, focus = false) {
    panel.hidden = !open;
    document.getElementById("app").dataset.workspace = open ? "open" : "closed";
    $("btn-workspace").setAttribute("aria-expanded", String(open));
    onVisibilityChange(open);
    if (focus) (open ? $(`${activeTab}-tab`) : $("btn-workspace")).focus();
  }
  function selectSector(id, taskId = null) {
    sectorById(id);
    const changed = state.sectorId !== id;
    state.sectorId = id;
    selectedTask = taskId || TASKS.find(task => task.sectorId === id && state.tasks[task.id].status !== "done")?.id ||
      TASKS.find(task => task.sectorId === id).id;
    moving = sceneAvailable;
    showAlert("");
    save();
    render();
    setOpen(true);
    onSectorChange(id);
    if (changed) appendMessage("assistant", { text: `Ahora el contexto es ${sectorById(id).name}. Podés consultar sus tareas, guía o materiales.`, topic: "" });
  }
  function appendMessage(role, response) {
    const article = document.createElement("article");
    article.className = `chat-message chat-${role}`;
    const author = document.createElement("strong");
    author.textContent = role === "user" ? OPERATOR : ASSISTANT;
    const body = document.createElement("p");
    body.textContent = response.text;
    article.append(author, body);
    for (const source of response.sources || []) {
      const details = document.createElement("details");
      details.className = "chat-source";
      const summary = document.createElement("summary");
      summary.textContent = `Fuente local · ${source.id} · ${source.title}`;
      const content = document.createElement("p");
      content.textContent = source.text;
      details.append(summary, content);
      article.append(details);
    }
    if (response.draft) {
      const draftId = crypto.randomUUID();
      const draft = { ...response.draft, draftId };
      drafts.set(draftId, draft);
      const preview = document.createElement("p");
      preview.className = "notice-draft";
      preview.textContent = draft.text;
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "work-primary";
      confirm.dataset.confirmNotice = draftId;
      confirm.textContent = "Crear aviso local";
      article.append(preview, confirm);
    }
    $("chat-log").append(article);
    $("chat-log").scrollTop = $("chat-log").scrollHeight;
  }
  function sendMessage(text) {
    let response;
    try {
      response = replyToMessage(text, state, selectedTask, previousTopic);
    } catch (error) {
      showAlert(error.message);
      return;
    }
    showAlert("");
    setTab("chat");
    appendMessage("user", { text: text.trim() });
    appendMessage("assistant", response);
    previousTopic = response.topic;
    $("chat-input").value = "";
  }
  function runTaskAction(action) {
    if (moving) {
      showAlert("Esperá a que Alex llegue al sector o reanudá la animación si está pausada.");
      return;
    }
    try {
      action();
    } catch (error) {
      showAlert(error.message);
      return;
    }
    showAlert("");
    save();
    render();
    $("task-title").focus();
  }
  $("sector-list").innerHTML = SECTORS.map(sector => `<button type="button" data-sector="${sector.id}" aria-pressed="false"><span>${sector.name}</span><small></small></button>`).join("");
  panel.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.dataset.sector) selectSector(button.dataset.sector);
    if (button.dataset.task) { selectedTask = button.dataset.task; renderTasks(); }
    if (button.dataset.taskLink) {
      const task = taskById(button.dataset.taskLink);
      selectSector(task.sectorId, task.id);
    }
    if (button.dataset.start) runTaskAction(() => startTask(state, button.dataset.start));
    if (button.hasAttribute("data-complete")) runTaskAction(() => completeTask(state, selectedTask));
    if (button.dataset.ask) {
      sendMessage(button.dataset.ask);
      if (button.closest("#tasks-panel")) $("chat-input").focus();
    }
    if (button.dataset.confirmNotice) {
      const draft = drafts.get(button.dataset.confirmNotice);
      if (!draft) { showAlert("Ese borrador ya no está disponible. Pedile a Nexo que prepare otro."); return; }
      let notice;
      try { notice = createNotice(state, draft); }
      catch (error) { showAlert(error.message); return; }
      save();
      button.disabled = true;
      button.textContent = `${notice.id} creado`;
      appendMessage("assistant", { text: `${notice.id} creado en esta demo, para ${sectorById(notice.sectorId).name}. Queda pendiente de revisión humana; no se envió a sistemas externos.` });
      render();
    }
  });
  panel.addEventListener("input", event => {
    if (event.target.id !== "task-note") return;
    state.tasks[selectedTask].note = event.target.value;
    save();
    updateReadiness();
  });
  panel.addEventListener("change", event => {
    if (!event.target.matches("[data-check]")) return;
    state.tasks[selectedTask].checks[Number(event.target.dataset.check)] = event.target.checked;
    save();
    updateReadiness();
  });
  $("chat-form").addEventListener("submit", event => {
    event.preventDefault();
    sendMessage($("chat-input").value);
    $("chat-input").focus();
  });
  for (const tab of ["tasks", "chat"]) $(`${tab}-tab`).addEventListener("click", () => setTab(tab));
  $("work-tabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setTab(event.key === "Home" ? "tasks" : event.key === "End" ? "chat" : activeTab === "tasks" ? "chat" : "tasks", true);
  });
  $("work-close").addEventListener("click", () => setOpen(false, true));
  $("btn-workspace").addEventListener("click", () => setOpen(panel.hidden, true));
  $("reset-turn").addEventListener("click", () => { $("reset-confirmation").hidden = false; $("cancel-reset").focus(); });
  $("cancel-reset").addEventListener("click", () => { $("reset-confirmation").hidden = true; $("reset-turn").focus(); });
  $("confirm-reset").addEventListener("click", () => {
    state = createTurn();
    selectedTask = TASKS[0].id;
    previousTopic = "";
    drafts.clear();
    $("chat-log").replaceChildren();
    $("reset-confirmation").hidden = true;
    setTab("tasks");
    appendMessage("assistant", { text: "Turno reiniciado. Volvemos a Cinta 3 con las tareas de demostración pendientes." });
    selectSector("cinta");
    $("tasks-tab").focus();
  });
  appendMessage("assistant", { text: `Hola, ${OPERATOR}. Soy ${ASSISTANT}. Estoy en modo demostración: puedo ayudarte con las tareas de ${sectorById(state.sectorId).name}, sus guías y materiales ficticios. También puedo preparar un aviso para que lo confirmes. No estoy conectado a un modelo de IA ni a sistemas de planta.` });
  render();
  setTab("tasks");
  setOpen(true);
  return {
    get sectorId() { return state.sectorId; },
    selectSector,
    open() { setOpen(true); setTab("tasks"); },
    close() { setOpen(false); },
    onArrival(id) {
      if (id !== state.sectorId) return;
      moving = false;
      render();
    },
    setSceneAvailable(value) { sceneAvailable = value; if (!value) moving = false; render(); },
    setInert(value) { panel.inert = value; }
  };
}
