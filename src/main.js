import "./style.css";
import "./variant.css";
import "./workspace.css";
import { LAYERS, PROFILES } from "./data.js";
import { archOverlayHTML, profilesOverlayHTML } from "./ui.js";
import { createWorkspace } from "./workspace.js";

const $ = id => document.getElementById(id);
let plant;
let workspace;
let sceneAvailable = false;
let activeOverlay = null;
let returnFocus;
let motionPaused = false;
$("arch-grid").innerHTML = archOverlayHTML();
$("profiles-grid").innerHTML = profilesOverlayHTML();

function showError(message) {
  $("app-error").textContent = message;
  $("app-error").hidden = false;
}

function closeOverlay({ restoreFocus = true } = {}) {
  if (!activeOverlay) return;
  $(activeOverlay).classList.add("hidden");
  activeOverlay = null;
  $("base").inert = false;
  workspace?.setInert(false);
  plant?.setPaused(false);
  if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}

function openOverlay(id, focusSelector) {
  if (!activeOverlay) returnFocus = document.activeElement;
  closeOverlay({ restoreFocus: false });
  activeOverlay = id;
  $(id).classList.remove("hidden");
  $("base").inert = true;
  workspace?.setInert(true);
  plant?.setPaused(true);
  const target = focusSelector ? $(id).querySelector(focusSelector) : $(id).querySelector("button");
  if (!focusSelector) $(id).querySelector(".arch-modal").scrollTop = 0;
  target.focus({ preventScroll: true });
  if (focusSelector) target.scrollIntoView({ block: "nearest", behavior: "instant" });
}

function openProfiles(profileId = null) {
  if (profileId && !PROFILES.some(profile => profile.id === profileId)) {
    showError("Ese perfil no existe. Se muestran todos los perfiles disponibles.");
    profileId = null;
  }
  document.querySelectorAll(".pf-card").forEach(card => card.classList.toggle("focus", card.dataset.profile === profileId));
  openOverlay("profiles-overlay", profileId ? `[data-profile="${profileId}"]` : null);
}

function openArchitecture(layerId = null) {
  if (layerId && !LAYERS.some(layer => layer.id === layerId)) {
    showError("Esa capa no existe. Se muestra la arquitectura completa.");
    layerId = null;
  }
  document.querySelectorAll(".ao-card").forEach(card => card.classList.toggle("focus", card.dataset.architecture === layerId));
  openOverlay("arch-overlay", layerId ? `[data-architecture="${layerId}"]` : null);
}

function setView(mode) {
  const descriptions = {
    operador: ["Alex en planta, con su tablet.", "Elegí un sector para acompañar al operador, gestionar sus tareas y conversar con Nexo."],
    planta: ["Elegí un sector de la planta.", "Los puntos de Cinta 3, Ensacado, Despacho y Oficina abren las tareas del sector."],
    arquitectura: ["Arquitectura conectada sobre la planta.", "Flujos ilustrativos del diseño Microsoft. Tocá una capa para ver sus componentes."]
  };
  $("app").dataset.view = mode;
  $("view-title").textContent = descriptions[mode][0];
  $("view-description").textContent = descriptions[mode][1];
  for (const [button, view] of [["btn-operator", "operador"], ["btn-overview", "planta"], ["btn-spatial", "arquitectura"]]) {
    $(button).setAttribute("aria-pressed", String(view === mode));
  }
}

$("btn-profiles").addEventListener("click", () => openProfiles());
$("btn-arch").addEventListener("click", () => openArchitecture());
$("btn-overview").addEventListener("click", () => plant?.overview());
$("btn-operator").addEventListener("click", () => { workspace.open(); plant?.locate("brisa"); });
$("btn-spatial").addEventListener("click", () => { workspace.close(); plant?.showArchitecture(); });
$("btn-motion").addEventListener("click", () => {
  motionPaused = !motionPaused;
  plant.setMotionPaused(motionPaused);
  $("btn-motion").setAttribute("aria-pressed", String(motionPaused));
  $("btn-motion").textContent = motionPaused ? "Reanudar" : "Pausar";
  $("btn-motion").setAttribute("aria-label", motionPaused ? "Reanudar animación" : "Pausar animación");
});
$("profiles-close").addEventListener("click", () => closeOverlay());
$("arch-close").addEventListener("click", () => closeOverlay());
for (const id of ["arch-overlay", "profiles-overlay"]) {
  $(id).addEventListener("click", event => {
    if (event.target === $(id)) closeOverlay();
  });
}
document.addEventListener("click", event => {
  const layer = event.target.closest("[data-layer]");
  if (layer) openArchitecture(layer.dataset.layer);
  const locate = event.target.closest("[data-locate]");
  if (locate) {
    if (!sceneAvailable) {
      showError("La vista 3D no está disponible todavía. Podés seguir consultando la arquitectura y los perfiles.");
      return;
    }
    closeOverlay();
    plant.locate(locate.dataset.locate);
  }
});
document.addEventListener("keydown", event => {
  if (!activeOverlay) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeOverlay();
  } else if (event.key === "Tab") {
    const focusable = [...$(activeOverlay).querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }
});

const query = new URLSearchParams(location.search);
workspace = createWorkspace({
  onSectorChange: id => { if (sceneAvailable) plant.visitSector(id); },
  onTaskCounts: counts => { if (sceneAvailable) plant.setTaskCounts(counts); },
  onVisibilityChange: () => { if (sceneAvailable) plant.resize(); }
});
const toolbarObserver = new ResizeObserver(() => {
  $("app").style.setProperty("--toolbar-height", `${Math.ceil($("topbar").getBoundingClientRect().height) + 6}px`);
});
toolbarObserver.observe($("topbar"));
if (query.has("perfiles")) openProfiles(query.get("perfiles"));
else if (query.has("arquitectura")) openArchitecture(query.get("arquitectura"));

import("./scene.js").then(({ createPlantScene }) => {
  plant = createPlantScene({
    canvas: $("scene"),
    labelsMount: $("plant-viewport"),
    onProfile: openProfiles,
    onLayer: openArchitecture,
    onSector: id => workspace.selectSector(id),
    onArrival: id => workspace.onArrival(id),
    onViewChange: setView,
    onContextLost: () => {
      sceneAvailable = false;
      workspace.setSceneAvailable(false);
      $("scene-status").textContent = "La vista 3D perdió su contexto. Tareas, Nexo, arquitectura y perfiles siguen disponibles.";
      $("btn-overview").disabled = true;
      $("btn-motion").disabled = true;
      $("btn-spatial").disabled = true;
      $("btn-operator").disabled = true;
    }
  });
  sceneAvailable = true;
  workspace.setSceneAvailable(true);
  plant.visitSector(workspace.sectorId, { immediate: true });
  plant.setPaused(Boolean(activeOverlay));
  $("btn-motion").disabled = false;
  $("btn-spatial").disabled = false;
  $("btn-operator").disabled = false;
  $("btn-overview").disabled = false;
  if (query.get("vista") === "arquitectura3d") { workspace.close(); plant.showArchitecture(); }
  else if (query.get("vista") === "planta") plant.overview();
  $("scene-status").textContent = "Arrastrá para rotar · acercá con la rueda · elegí un sector para recorrerlo.";
}).catch(error => {
  console.error("No se pudo iniciar la planta 3D:", error);
  sceneAvailable = false;
  workspace.setSceneAvailable(false);
  $("scene-status").textContent = "3D no disponible. Podés usar las tareas, Nexo, la arquitectura y los perfiles.";
  $("btn-overview").disabled = true;
});

window.addEventListener("pagehide", () => { plant?.dispose(); toolbarObserver.disconnect(); });
window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
