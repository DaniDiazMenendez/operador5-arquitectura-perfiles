import { LAYERS, ROLES, PROFILES } from "./data.js";

const hex = color => `#${color.toString(16).padStart(6, "0")}`;

export function profilesOverlayHTML() {
  return PROFILES.map(profile => {
    const components = profile.arch.map(key => {
      const [layerId, componentId] = key.split(":");
      const layer = LAYERS.find(item => item.id === layerId);
      const component = layer?.components.find(item => item.id === componentId);
      if (!component) throw new Error(`Componente de perfil inexistente: ${key}`);
      return `<button type="button" class="arch-chip" style="--c:${hex(layer.color)}" data-layer="${layer.id}" title="Ver ${layer.name}">${component.name}</button>`;
    }).join("");
    return `<article class="pf-card" data-profile="${profile.id}" tabindex="-1">
      <div class="pf-head">
        <div class="pf-avatar" style="--rc:${ROLES[profile.id].color}" aria-hidden="true">${profile.emoji}</div>
        <div><h3>${profile.name}</h3><small>${profile.role}</small></div>
        <span class="role-chip" style="--rc:${ROLES[profile.id].color}">${ROLES[profile.id].label}</span>
      </div>
      <div class="pf-rows">
        <div class="pf-row"><span>📱 Canal</span><p>${profile.channel}</p></div>
        <div class="pf-row"><span>🔐 Identidad</span><p>${profile.identity}</p></div>
        <div class="pf-row"><span>🎯 Alcance</span><p><b>${profile.scope}</b></p></div>
      </div>
      <div class="pf-cols">
        <div class="pf-list ok"><span>Puede</span><ul>${profile.can.map(item => `<li>${item}</li>`).join("")}</ul></div>
        <div class="pf-list no"><span>No puede</span><ul>${profile.cannot.map(item => `<li>${item}</li>`).join("")}</ul></div>
      </div>
      <div class="pf-change">
        <div><span>Sin digitalización</span><p>${profile.today}</p></div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="with"><span>Capacidad propuesta</span><p>${profile.withApp}</p></div>
      </div>
      <div class="pf-sub">Arquitectura que usa</div><div class="pf-chips">${components}</div>
      <button type="button" class="pf-locate" data-locate="${profile.actor}">📍 Ver en la planta</button>
    </article>`;
  }).join("");
}

export function archOverlayHTML() {
  return LAYERS.map(layer => `<article class="ao-card" data-architecture="${layer.id}" tabindex="-1" style="--c:${hex(layer.color)}">
    <div class="ao-head"><span aria-hidden="true">${layer.icon}</span><h3>${layer.name}</h3></div>
    <p>${layer.blurb}</p>
    <ul>${layer.components.map(component => `<li><b>${component.name}</b> — ${component.desc}</li>`).join("")}</ul>
  </article>`).join("");
}
