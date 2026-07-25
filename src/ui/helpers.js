/**
 * Hyperscript e utilitários de DOM.
 *
 * API **idêntica** à do `src/utils/helpers.js` do Projeto Baluarte, de
 * propósito: um componente escrito aqui cola lá sem tradução, e vice-versa.
 * Se mudar a assinatura aqui, os dois projetos divergem — não mude.
 */

export const $ = (sel, escopo = document) => escopo.querySelector(sel);
export const $$ = (sel, escopo = document) => Array.from(escopo.querySelectorAll(sel));

/**
 * Cria um elemento com atributos e filhos.
 * Chaves especiais: `className`/`class`, `style` (objeto), `dataset` (objeto),
 * `onX` (listener), `html` (innerHTML — só com conteúdo confiável).
 * Valores `null`/`false`/`undefined` são ignorados, o que deixa filhos e
 * atributos condicionais legíveis sem ternário.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'className' || key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'dataset' && typeof value === 'object') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'html') el.innerHTML = value;
    else if (key in el && typeof value !== 'object') el[key] = value;
    else el.setAttribute(key, value);
  }

  anexar(el, children);
  return el;
}

function anexar(pai, children) {
  for (const filho of children) {
    if (filho == null || filho === false) continue;
    if (Array.isArray(filho)) { anexar(pai, filho); continue; }
    pai.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
}

/** Esvazia um elemento (mais rápido e seguro que innerHTML = ''). */
export function empty(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** Junta classes ignorando falsy. */
export const cx = (...xs) => xs.filter(Boolean).join(' ');

/** Adia a execução até parar de ser chamada por `ms`. */
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── Formatadores táticos ──
 * Mono-espaçado e largura fixa: números que mudam não podem fazer o layout
 * "pular". Num HUD, texto que dança custa leitura sob estresse. */

/** Número com casas fixas e largura mínima (preenche com espaço fino). */
export const num = (v, casas = 0, largura = 0) =>
  (Number.isFinite(v) ? v.toFixed(casas) : '—').padStart(largura, ' ');

/** Distância legível: metros abaixo de 10 km, senão quilômetros. */
export const dist = (m) => {
  if (!Number.isFinite(m)) return '—';
  return m < 10000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
};

/** Azimute em mils, sempre com 4 dígitos (0000–6399). */
export const mil = (v) => (Number.isFinite(v) ? String(Math.round(v)).padStart(4, '0') : '————');

/** Tempo de voo em segundos com uma casa. */
export const seg = (s) => (Number.isFinite(s) ? `${s.toFixed(1)} s` : '—');
