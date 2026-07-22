// ═══════════════════════════════════════════════════════════════════
// Daily Bible Text Cards
// Author: KingDando8430
// https://github.com/KingDando8430/HA-Daily-Bible-Text
// Version: 1.1.0
// ═══════════════════════════════════════════════════════════════════

const DBT_VERSION = '1.1.0';
const DBT_DOMAIN = 'daily_bible_text';

// Entity "role" is detected from the localized suffix of its entity_id
// (de/en/es), matching the Daily Bible Text integration's sensor names.
const DBT_ROLE_SUFFIXES = {
  scripture: ['tagestext', 'scripture', 'texto_biblico'],
  commentary: ['kommentar', 'comment', 'comentario'],
  bible_verse: ['bibelvers', 'bible_verse', 'versiculo_biblico'],
  yeartext: ['jahrestext', 'yeartext', 'texto_del_ano'],
};

const DBT_LOCALE_MAP = { de: 'de-DE', en: 'en-US', es: 'es-ES' };

const DBT_STRINGS = {
  en: {
    sec_device: 'Device', device_label: 'Device', device_sub: 'Only devices from this integration',
    sec_appearance: 'Appearance', icon_label: 'Icon', accent_label: 'Accent color', icon_color_label: 'Icon color',
    icon_side_label: 'Icon side', side_left: 'Left', side_right: 'Right',
    sec_interaction: 'Interaction', tap_label: 'Tap action',
    tap_popup: 'Show details', tap_more_info: 'Open more info', tap_none: 'None',
    no_device: 'Choose a device', no_device_hint: 'Pick a Daily Bible Text device below.',
    no_data: 'No data yet', no_data_hint: 'Waiting for today\u2019s text.',
    close: 'Close',
  },
  de: {
    sec_device: 'Gerät', device_label: 'Gerät', device_sub: 'Nur Geräte dieser Integration',
    sec_appearance: 'Darstellung', icon_label: 'Symbol', accent_label: 'Akzentfarbe', icon_color_label: 'Symbolfarbe',
    icon_side_label: 'Symbolseite', side_left: 'Links', side_right: 'Rechts',
    sec_interaction: 'Interaktion', tap_label: 'Tippaktion',
    tap_popup: 'Details anzeigen', tap_more_info: 'Mehr Infos öffnen', tap_none: 'Keine',
    no_device: 'Gerät auswählen', no_device_hint: 'Wähle unten ein Daily-Bible-Text-Gerät.',
    no_data: 'Noch keine Daten', no_data_hint: 'Warte auf den heutigen Text.',
    close: 'Schließen',
  },
  es: {
    sec_device: 'Dispositivo', device_label: 'Dispositivo', device_sub: 'Solo dispositivos de esta integración',
    sec_appearance: 'Apariencia', icon_label: 'Icono', accent_label: 'Color de acento', icon_color_label: 'Color del icono',
    icon_side_label: 'Lado del icono', side_left: 'Izquierda', side_right: 'Derecha',
    sec_interaction: 'Interacción', tap_label: 'Acción al tocar',
    tap_popup: 'Mostrar detalles', tap_more_info: 'Abrir más información', tap_none: 'Ninguna',
    no_device: 'Elige un dispositivo', no_device_hint: 'Elige abajo un dispositivo Daily Bible Text.',
    no_data: 'Sin datos todavía', no_data_hint: 'Esperando el texto de hoy.',
    close: 'Cerrar',
  },
};

function dbtT(hass) {
  const lang = (hass?.locale?.language || hass?.language || 'en').slice(0, 2);
  return DBT_STRINGS[lang] || DBT_STRINGS.en;
}

function dbtEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Entity / device resolution (suffix-based auto-detection) ──────────
function dbtRoleForEntity(entityId) {
  const slug = entityId.split('.').slice(1).join('.');
  for (const role of Object.keys(DBT_ROLE_SUFFIXES)) {
    if (DBT_ROLE_SUFFIXES[role].some((sfx) => slug === sfx || slug.endsWith('_' + sfx))) return role;
  }
  return null;
}

function dbtIsIntegrationEntity(hass, entityId) {
  if (!entityId || entityId.split('.')[0] !== 'sensor') return false;
  const reg = hass?.entities?.[entityId];
  if (reg?.platform) return reg.platform === DBT_DOMAIN;
  return !!dbtRoleForEntity(entityId);
}

function dbtFindEntities(hass, deviceId) {
  const out = {};
  if (!hass?.entities || !deviceId) return out;
  for (const entityId of Object.keys(hass.entities)) {
    const reg = hass.entities[entityId];
    if (reg.device_id !== deviceId) continue;
    if (reg.platform && reg.platform !== DBT_DOMAIN) continue;
    const role = dbtRoleForEntity(entityId);
    if (role && !out[role]) out[role] = entityId;
  }
  return out;
}

function dbtDeviceList(hass) {
  if (!hass?.entities) return [];
  const ids = new Set();
  for (const entityId of Object.keys(hass.entities)) {
    const reg = hass.entities[entityId];
    if (reg.platform === DBT_DOMAIN && reg.device_id) ids.add(reg.device_id);
  }
  return Array.from(ids).map((id) => ({
    id,
    name: hass.devices?.[id]?.name_by_user || hass.devices?.[id]?.name || id,
  }));
}

function dbtFirstDeviceId(hass) {
  const list = dbtDeviceList(hass);
  return list.length ? list[0].id : '';
}

// ── Formatting helpers ──────────────────────────────────────────────
function dbtFormatHeader(dateAttr, dayAttr, langAttr) {
  const locale = DBT_LOCALE_MAP[langAttr] || 'en-US';
  let monthDay = dateAttr || '';
  const m = /^(\d{2})-(\d{2})$/.exec(dateAttr || '');
  if (m) {
    const year = new Date().getFullYear();
    const d = new Date(year, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
    if (!isNaN(d.getTime())) {
      try {
        monthDay = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(d);
      } catch (e) { /* keep raw value if locale unsupported */ }
    }
  }
  return dayAttr ? `${dayAttr}, ${monthDay}` : monthDay;
}

function dbtValidState(stateObj) {
  return stateObj && stateObj.state !== 'unknown' && stateObj.state !== 'unavailable' ? stateObj.state : '';
}

// ── Shared popup (identical content/layout for both cards) ─────────────
function dbtClosePopup(card) {
  if (card._dbtPopup) {
    if (card._dbtEscHandler) document.removeEventListener('keydown', card._dbtEscHandler);
    card._dbtPopup.remove();
    card._dbtPopup = null;
  }
}

function dbtPopupCss(accent) {
  return `
*,*::before,*::after{box-sizing:border-box}
.dbt-popup-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.38);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:dbtFadeIn .18s ease;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Roboto',sans-serif}
@keyframes dbtFadeIn{from{opacity:0}to{opacity:1}}
.dbt-popup-wrap{position:relative}
.dbt-popup{background:var(--card-background-color,#fff);border-radius:18px;width:min(92vw,380px);max-height:80vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.28);animation:dbtSlideUp .2s cubic-bezier(.34,1.26,.64,1)}
@keyframes dbtSlideUp{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
.dbt-popup-inner{display:flex;flex:1;overflow:hidden}
.dbt-popup-bar{width:4px;flex-shrink:0;background:${accent};border-radius:0 0 0 18px}
.dbt-popup-body{flex:1;overflow-y:auto;padding:20px 20px 20px 16px}
.dbt-pop-date{font-size:13px;font-weight:600;letter-spacing:.2px;color:${accent};text-transform:uppercase;margin-bottom:10px}
.dbt-pop-quote{font-size:17px;font-style:italic;line-height:1.5;color:var(--primary-text-color);margin-bottom:16px}
.dbt-pop-commentary{font-size:14px;line-height:1.6;color:var(--primary-text-color);opacity:.92;white-space:pre-wrap;margin-bottom:14px}
.dbt-pop-source{font-size:12px;color:var(--secondary-text-color);opacity:.7;border-top:1px solid var(--divider-color,rgba(0,0,0,.08));padding-top:10px}
.dbt-popup-close{position:absolute;top:12px;right:12px;background:var(--secondary-background-color,rgba(120,120,128,.15));border:none;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--secondary-text-color);transition:background .15s}
.dbt-popup-close:hover{background:var(--secondary-background-color,rgba(120,120,128,.25))}
.dbt-popup-close:focus-visible{outline:2px solid ${accent};outline-offset:2px}
@media (prefers-reduced-motion: reduce){.dbt-popup-overlay,.dbt-popup{animation:none!important}}
`;
}

function dbtOpenPopup(card, hass, entities, accent, t) {
  dbtClosePopup(card);
  const scriptureState = entities.scripture ? hass.states[entities.scripture] : null;
  const commentaryState = entities.commentary ? hass.states[entities.commentary] : null;

  const dateAttr = scriptureState?.attributes?.date;
  const dayAttr = scriptureState?.attributes?.day;
  const langAttr = scriptureState?.attributes?.language;
  const verseRef = scriptureState?.attributes?.verse_reference;
  const scriptureText = dbtValidState(scriptureState);
  const commentaryText = commentaryState?.attributes?.commentary_text || '';
  const citation = dbtValidState(commentaryState);

  const header = dbtFormatHeader(dateAttr, dayAttr, langAttr);
  const quote = scriptureText ? (verseRef ? `${scriptureText} (${verseRef})` : scriptureText) : '';

  let body = '';
  if (header) body += `<div class="dbt-pop-date">${dbtEsc(header)}</div>`;
  if (quote) body += `<div class="dbt-pop-quote">${dbtEsc(quote)}</div>`;
  if (commentaryText) body += `<div class="dbt-pop-commentary">${dbtEsc(commentaryText)}</div>`;
  if (citation) body += `<div class="dbt-pop-source">${dbtEsc(citation)}</div>`;
  if (!body) body = `<div class="dbt-pop-commentary">${dbtEsc(t.no_data_hint)}</div>`;

  const overlay = document.createElement('div');
  overlay.className = 'dbt-popup-overlay';
  overlay.innerHTML = `
    <style>${dbtPopupCss(accent)}</style>
    <div class="dbt-popup-wrap">
      <div class="dbt-popup">
        <div class="dbt-popup-inner">
          <div class="dbt-popup-bar"></div>
          <div class="dbt-popup-body">${body}</div>
        </div>
      </div>
      <button class="dbt-popup-close" aria-label="${dbtEsc(t.close)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) dbtClosePopup(card); });
  overlay.querySelector('.dbt-popup-close').addEventListener('click', () => dbtClosePopup(card));
  const escHandler = (e) => { if (e.key === 'Escape') dbtClosePopup(card); };
  card._dbtEscHandler = escHandler;
  document.addEventListener('keydown', escHandler);
  document.body.appendChild(overlay);
  card._dbtPopup = overlay;
}

function dbtHandleTap(card, hass, config, entities, accent) {
  const action = config.tap_action || 'popup';
  if (action === 'none') return;
  if (action === 'more-info') {
    const entityId = entities.scripture || entities.commentary;
    if (entityId) {
      card.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
    }
    return;
  }
  const t = dbtT(hass);
  dbtOpenPopup(card, hass, entities, accent || '#5b3c88', t);
}

// ── Shared card CSS (Apple-style: system font, soft radii, theme vars) ─
const DBT_CARD_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:host{display:block;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Roboto',sans-serif;-webkit-font-smoothing:antialiased}
ha-card{overflow:hidden;border-radius:var(--ha-card-border-radius,16px);height:100%}
.dbt-card1,.dbt-card2{cursor:pointer;outline:none}
.dbt-card1:focus-visible,.dbt-card2:focus-visible{box-shadow:inset 0 0 0 2px var(--primary-color,#5b3c88)}
.dbt-card1{padding:14px 16px}
.dbt-c1-head{display:flex;align-items:center;gap:7px;font-size:14px;font-weight:600;margin-bottom:8px}
.dbt-c1-head ha-icon{--mdc-icon-size:18px}
.dbt-c1-text{font-size:14.5px;line-height:1.5;color:var(--primary-text-color)}
.dbt-card2{display:flex;align-items:center;gap:11px;padding:13px 16px}
.dbt-side-right{flex-direction:row-reverse}
.dbt-c2-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dbt-c2-icon ha-icon{--mdc-icon-size:22px}
.dbt-c2-text{font-size:14px;line-height:1.4;color:var(--primary-text-color)}
.dbt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:26px 16px;text-align:center;color:var(--secondary-text-color)}
.dbt-empty ha-icon{--mdc-icon-size:26px;opacity:.5;margin-bottom:4px}
.dbt-empty small{opacity:.75;font-size:12px}
@media (prefers-reduced-motion: reduce){*{transition:none!important}}
`;

// ── Shared editor CSS (visual language matches HA-Timetable-Card) ─────
const DBT_EDITOR_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:host{display:block;font-family:-apple-system,BlinkMacSystemFont,'Roboto',sans-serif;color:var(--primary-text-color)}
.editor{display:flex;flex-direction:column;gap:8px;padding-bottom:4px}
.sec{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:var(--secondary-text-color);opacity:.75;margin:10px 2px 2px}
.sec:first-child{margin-top:2px}
.box{background:var(--secondary-background-color,rgba(120,120,128,.09));border-radius:13px;overflow:hidden}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid var(--divider-color,rgba(0,0,0,.06))}
.row:last-child{border-bottom:none}
.rl{font-size:13.5px;font-weight:500}
.rs{font-size:11.5px;color:var(--secondary-text-color);opacity:.75;margin-top:1px}
select.pick{background:var(--card-background-color,#fff);border:1px solid var(--divider-color,rgba(0,0,0,.12));border-radius:9px;padding:6px 10px;color:var(--primary-text-color);font-size:13px;cursor:pointer;outline:none;font-family:inherit;min-width:140px;max-width:60%}
.swatch{width:30px;height:30px;border-radius:8px;border:1.5px solid rgba(0,0,0,.14);overflow:hidden;position:relative;flex-shrink:0;cursor:pointer}
.swatch input[type=color]{position:absolute;inset:-4px;width:calc(100% + 8px);height:calc(100% + 8px);border:none;padding:0;cursor:pointer;background:none}
ha-icon-picker{width:170px;max-width:60%;display:block}
`;

// ═══════════════════════════════════════════════════════════════════
// BASE CARD
// ═══════════════════════════════════════════════════════════════════
class DBTCardBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._entities = {};
    this._rendered = false;
    this._dbtPopup = null;
  }

  setConfig(config) {
    // Keep the config exactly as given — no defaults are merged in, so the
    // saved YAML only ever contains keys the user actually touched.
    this._config = { ...config };
    this._render();
  }

  // Config merged with class defaults, for rendering/logic only. Never
  // written back to this._config or emitted as config-changed.
  _effective() {
    return { ...this.constructor.DEFAULTS, ...this._config };
  }

  set hass(hass) {
    const old = this._hass;
    this._hass = hass;
    const ents = dbtFindEntities(hass, this._config.device_id);
    const changed = !old
      || JSON.stringify(ents) !== JSON.stringify(this._entities)
      || Object.values(ents).some((id) => old.states[id] !== hass.states[id]);
    this._entities = ents;
    if (changed || !this._rendered) this._render();
  }

  get hass() { return this._hass; }

  getCardSize() { return 2; }

  // Rows intentionally omitted so the card auto-sizes to its content
  // in the sections view. This is a code-level default only — it is
  // never written into the card's own saved config.
  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  connectedCallback() {}

  disconnectedCallback() {
    dbtClosePopup(this);
  }

  // Overridden per card: which config key holds the accent/icon color.
  _accentColor(eff) { return eff.accent_color || eff.icon_color || '#5b3c88'; }

  _onActivate() {
    if (!this._hass || !this._config.device_id) return;
    const eff = this._effective();
    dbtHandleTap(this, this._hass, eff, this._entities, this._accentColor(eff));
  }

  _wireInteractive(el) {
    if (!el) return;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.addEventListener('click', () => this._onActivate());
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._onActivate(); }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CARD 1 — calendar style
// ═══════════════════════════════════════════════════════════════════
class DailyBibleTextCard extends DBTCardBase {
  static DEFAULTS = {
    device_id: '',
    icon: 'mdi:calendar-blank',
    accent_color: '#5b3c88',
    tap_action: 'popup',
  };

  static getConfigElement() { return document.createElement('daily-bible-text-card-editor'); }

  static getStubConfig(hass) {
    const deviceId = dbtFirstDeviceId(hass);
    return deviceId ? { device_id: deviceId } : {};
  }

  _accentColor(eff) { return eff.accent_color; }

  _render() {
    const t = dbtT(this._hass);
    const eff = this._effective();
    const accent = eff.accent_color;

    if (!eff.device_id) {
      this.shadowRoot.innerHTML = `<style>${DBT_CARD_CSS}</style>
        <ha-card><div class="dbt-empty">
          <ha-icon icon="mdi:book-open-page-variant-outline"></ha-icon>
          <div>${dbtEsc(t.no_device)}</div><small>${dbtEsc(t.no_device_hint)}</small>
        </div></ha-card>`;
      this._rendered = true;
      return;
    }

    const scriptureState = this._entities.scripture ? this._hass?.states[this._entities.scripture] : null;
    const scriptureText = dbtValidState(scriptureState);
    const verseRef = scriptureState?.attributes?.verse_reference;
    const dateAttr = scriptureState?.attributes?.date;
    const dayAttr = scriptureState?.attributes?.day;
    const langAttr = scriptureState?.attributes?.language;
    const header = dbtFormatHeader(dateAttr, dayAttr, langAttr);
    const line = scriptureText ? (verseRef ? `${scriptureText} (${verseRef})` : scriptureText) : '';

    this.shadowRoot.innerHTML = `
      <style>${DBT_CARD_CSS}</style>
      <ha-card>
        <div class="dbt-card1">
          <div class="dbt-c1-head" style="color:${accent}">
            <ha-icon icon="${dbtEsc(eff.icon)}"></ha-icon>
            <span>${header ? dbtEsc(header) : '&nbsp;'}</span>
          </div>
          <div class="dbt-c1-text">${line ? dbtEsc(line) : dbtEsc(t.no_data)}</div>
        </div>
      </ha-card>`;
    this._wireInteractive(this.shadowRoot.querySelector('.dbt-card1'));
    this._rendered = true;
  }
}

class DailyBibleTextCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._rendered = false;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
    else this._refreshDevices();
  }

  _effective() { return { ...DailyBibleTextCard.DEFAULTS, ...this._config }; }

  _emit(cfg) {
    this._config = cfg;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
  }
  // Only ever writes the single key the user just touched — every other
  // key (including ones currently shown via their default) is left alone.
  _set(key, value) { this._emit({ ...this._config, [key]: value }); }

  _refreshDevices() {
    const sel = this.shadowRoot.getElementById('dev-sel');
    if (!sel) return;
    const devices = dbtDeviceList(this._hass);
    const current = this._effective().device_id;
    sel.innerHTML = devices.length
      ? devices.map((d) => `<option value="${dbtEsc(d.id)}" ${d.id === current ? 'selected' : ''}>${dbtEsc(d.name)}</option>`).join('')
      : `<option value="">—</option>`;
  }

  _render() {
    const t = dbtT(this._hass);
    const c = this._effective();
    this.shadowRoot.innerHTML = `
      <style>${DBT_EDITOR_CSS}</style>
      <div class="editor">
        <span class="sec">${dbtEsc(t.sec_device)}</span>
        <div class="box">
          <div class="row">
            <div><div class="rl">${dbtEsc(t.device_label)}</div><div class="rs">${dbtEsc(t.device_sub)}</div></div>
            <select class="pick" id="dev-sel"></select>
          </div>
        </div>

        <span class="sec">${dbtEsc(t.sec_appearance)}</span>
        <div class="box">
          <div class="row">
            <div><div class="rl">${dbtEsc(t.icon_label)}</div></div>
            <div id="icon-wrap"></div>
          </div>
          <div class="row">
            <div><div class="rl">${dbtEsc(t.accent_label)}</div></div>
            <div class="swatch" id="accent-swatch" style="background:${c.accent_color}">
              <input type="color" id="accent-input" value="${c.accent_color}" />
            </div>
          </div>
        </div>

        <span class="sec">${dbtEsc(t.sec_interaction)}</span>
        <div class="box">
          <div class="row">
            <div><div class="rl">${dbtEsc(t.tap_label)}</div></div>
            <select class="pick" id="tap-sel">
              <option value="popup" ${c.tap_action !== 'more-info' && c.tap_action !== 'none' ? 'selected' : ''}>${dbtEsc(t.tap_popup)}</option>
              <option value="more-info" ${c.tap_action === 'more-info' ? 'selected' : ''}>${dbtEsc(t.tap_more_info)}</option>
              <option value="none" ${c.tap_action === 'none' ? 'selected' : ''}>${dbtEsc(t.tap_none)}</option>
            </select>
          </div>
        </div>
      </div>`;

    this._refreshDevices();
    this.shadowRoot.getElementById('dev-sel').addEventListener('change', (e) => this._set('device_id', e.target.value));
    this.shadowRoot.getElementById('tap-sel').addEventListener('change', (e) => this._set('tap_action', e.target.value));
    this.shadowRoot.getElementById('accent-input').addEventListener('change', (e) => {
      this._set('accent_color', e.target.value);
      this.shadowRoot.getElementById('accent-swatch').style.background = e.target.value;
    });

    if (this._hass) {
      const iconWrap = this.shadowRoot.getElementById('icon-wrap');
      const iconPicker = document.createElement('ha-icon-picker');
      iconPicker.hass = this._hass;
      iconPicker.value = c.icon;
      iconPicker.addEventListener('value-changed', (e) => this._set('icon', e.detail.value || DailyBibleTextCard.DEFAULTS.icon));
      iconWrap.appendChild(iconPicker);
    }
    this._rendered = true;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CARD 2 — icon + inline text style
// ═══════════════════════════════════════════════════════════════════
class DailyBibleTextInlineCard extends DBTCardBase {
  static DEFAULTS = {
    device_id: '',
    icon: 'mdi:book-open-variant',
    icon_color: '#5b3c88',
    icon_side: 'left',
    tap_action: 'popup',
  };

  static getConfigElement() { return document.createElement('daily-bible-text-inline-card-editor'); }

  static getStubConfig(hass) {
    const deviceId = dbtFirstDeviceId(hass);
    return deviceId ? { device_id: deviceId } : {};
  }

  _accentColor(eff) { return eff.icon_color; }

  _render() {
    const t = dbtT(this._hass);
    const eff = this._effective();
    const accent = eff.icon_color;

    if (!eff.device_id) {
      this.shadowRoot.innerHTML = `<style>${DBT_CARD_CSS}</style>
        <ha-card><div class="dbt-empty">
          <ha-icon icon="mdi:book-open-variant"></ha-icon>
          <div>${dbtEsc(t.no_device)}</div><small>${dbtEsc(t.no_device_hint)}</small>
        </div></ha-card>`;
      this._rendered = true;
      return;
    }

    const scriptureState = this._entities.scripture ? this._hass?.states[this._entities.scripture] : null;
    const scriptureText = dbtValidState(scriptureState);
    const verseRef = scriptureState?.attributes?.verse_reference;
    const line = scriptureText ? (verseRef ? `${scriptureText} (${verseRef})` : scriptureText) : '';
    const side = eff.icon_side === 'right' ? 'right' : 'left';

    this.shadowRoot.innerHTML = `
      <style>${DBT_CARD_CSS}</style>
      <ha-card>
        <div class="dbt-card2 dbt-side-${side}">
          <div class="dbt-c2-icon" style="color:${accent}">
            <ha-icon icon="${dbtEsc(eff.icon)}"></ha-icon>
          </div>
          <div class="dbt-c2-text">${line ? dbtEsc(line) : dbtEsc(t.no_data)}</div>
        </div>
      </ha-card>`;
    this._wireInteractive(this.shadowRoot.querySelector('.dbt-card2'));
    this._rendered = true;
  }
}

class DailyBibleTextInlineCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._rendered = false;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
    else this._refreshDevices();
  }

  _effective() { return { ...DailyBibleTextInlineCard.DEFAULTS, ...this._config }; }

  _emit(cfg) {
    this._config = cfg;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
  }
  _set(key, value) { this._emit({ ...this._config, [key]: value }); }

  _refreshDevices() {
    const sel = this.shadowRoot.getElementById('dev-sel');
    if (!sel) return;
    const devices = dbtDeviceList(this._hass);
    const current = this._effective().device_id;
    sel.innerHTML = devices.length
      ? devices.map((d) => `<option value="${dbtEsc(d.id)}" ${d.id === current ? 'selected' : ''}>${dbtEsc(d.name)}</option>`).join('')
      : `<option value="">—</option>`;
  }

  _render() {
    const t = dbtT(this._hass);
    const c = this._effective();
    this.shadowRoot.innerHTML = `
      <style>${DBT_EDITOR_CSS}</style>
      <div class="editor">
        <span class="sec">${dbtEsc(t.sec_device)}</span>
        <div class="box">
          <div class="row">
            <div><div class="rl">${dbtEsc(t.device_label)}</div><div class="rs">${dbtEsc(t.device_sub)}</div></div>
            <select class="pick" id="dev-sel"></select>
          </div>
        </div>

        <span class="sec">${dbtEsc(t.sec_appearance)}</span>
        <div class="box">
          <div class="row">
            <div><div class="rl">${dbtEsc(t.icon_label)}</div></div>
            <div id="icon-wrap"></div>
          </div>
          <div class="row">
            <div><div class="rl">${dbtEsc(t.icon_side_label)}</div></div>
            <select class="pick" id="side-sel">
              <option value="left" ${c.icon_side !== 'right' ? 'selected' : ''}>${dbtEsc(t.side_left)}</option>
              <option value="right" ${c.icon_side === 'right' ? 'selected' : ''}>${dbtEsc(t.side_right)}</option>
            </select>
          </div>
          <div class="row">
            <div><div class="rl">${dbtEsc(t.icon_color_label)}</div></div>
            <div class="swatch" id="color-swatch" style="background:${c.icon_color}">
              <input type="color" id="color-input" value="${c.icon_color}" />
            </div>
          </div>
        </div>

        <span class="sec">${dbtEsc(t.sec_interaction)}</span>
        <div class="box">
          <div class="row">
            <div><div class="rl">${dbtEsc(t.tap_label)}</div></div>
            <select class="pick" id="tap-sel">
              <option value="popup" ${c.tap_action !== 'more-info' && c.tap_action !== 'none' ? 'selected' : ''}>${dbtEsc(t.tap_popup)}</option>
              <option value="more-info" ${c.tap_action === 'more-info' ? 'selected' : ''}>${dbtEsc(t.tap_more_info)}</option>
              <option value="none" ${c.tap_action === 'none' ? 'selected' : ''}>${dbtEsc(t.tap_none)}</option>
            </select>
          </div>
        </div>
      </div>`;

    this._refreshDevices();
    this.shadowRoot.getElementById('dev-sel').addEventListener('change', (e) => this._set('device_id', e.target.value));
    this.shadowRoot.getElementById('side-sel').addEventListener('change', (e) => this._set('icon_side', e.target.value));
    this.shadowRoot.getElementById('tap-sel').addEventListener('change', (e) => this._set('tap_action', e.target.value));
    this.shadowRoot.getElementById('color-input').addEventListener('change', (e) => {
      this._set('icon_color', e.target.value);
      this.shadowRoot.getElementById('color-swatch').style.background = e.target.value;
    });

    if (this._hass) {
      const iconWrap = this.shadowRoot.getElementById('icon-wrap');
      const iconPicker = document.createElement('ha-icon-picker');
      iconPicker.hass = this._hass;
      iconPicker.value = c.icon;
      iconPicker.addEventListener('value-changed', (e) => this._set('icon', e.detail.value || DailyBibleTextInlineCard.DEFAULTS.icon));
      iconWrap.appendChild(iconPicker);
    }
    this._rendered = true;
  }
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'daily-bible-text-card',
  name: 'Daily Bible Text',
  description: 'Today\u2019s daily text with a detail pop-up (Daily Bible Text integration).',
  preview: true,
  documentationURL: 'https://github.com/KingDando8430/HA-Daily-Bible-Text',
  getEntitySuggestion: (hass, entityId) => {
    if (!dbtIsIntegrationEntity(hass, entityId)) return null;
    const deviceId = hass?.entities?.[entityId]?.device_id;
    if (!deviceId) return null;
    return {
      config: {
        type: 'custom:daily-bible-text-card',
        device_id: deviceId,
      },
    };
  },
});
window.customCards.push({
  type: 'daily-bible-text-inline-card',
  name: 'Daily Bible Text (Inline)',
  description: 'Icon + today\u2019s daily text in a single row, with a detail pop-up.',
  preview: true,
  documentationURL: 'https://github.com/KingDando8430/HA-Daily-Bible-Text',
  getEntitySuggestion: (hass, entityId) => {
    if (!dbtIsIntegrationEntity(hass, entityId)) return null;
    const deviceId = hass?.entities?.[entityId]?.device_id;
    if (!deviceId) return null;
    return {
      config: {
        type: 'custom:daily-bible-text-inline-card',
        device_id: deviceId,
      },
    };
  },
});

customElements.define('daily-bible-text-card-editor', DailyBibleTextCardEditor);
customElements.define('daily-bible-text-card', DailyBibleTextCard);
customElements.define('daily-bible-text-inline-card-editor', DailyBibleTextInlineCardEditor);
customElements.define('daily-bible-text-inline-card', DailyBibleTextInlineCard);

console.info(
  `%c DAILY-BIBLE-TEXT-CARDS %c v${DBT_VERSION} `,
  'background:#5b3c88;color:#fff;padding:2px 8px;border-radius:4px 0 0 4px;font-weight:700;font-size:11px',
  'background:#37474F;color:#fff;padding:2px 8px;border-radius:0 4px 4px 0;font-size:11px'
);
