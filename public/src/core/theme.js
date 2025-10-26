// src/core/theme.js
// Gerencia tema claro/escuro com persistência em localStorage.
// Atualiza tanto o atributo data-theme no <html> quanto as classes no <body>
// para garantir que regras CSS que usam html[data-theme] ou body.theme-* entrem em vigor.

const THEME_KEY = 'cms_pandda_theme';

function applyThemeToDOM(theme) {
  try {
    if (!theme) theme = 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
  } catch (e) {
    // falha silenciosa em ambientes restritos
    console.warn('applyThemeToDOM failed', e);
  }
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyThemeToDOM(saved);
  } else {
    // Detect prefers-color-scheme as sensible default, fallback to light
    try {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = prefersDark ? 'dark' : 'light';
      applyThemeToDOM(defaultTheme);
      // do not persist default unless user toggles
    } catch (_) {
      applyThemeToDOM('light');
    }
  }
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
  const next = current === 'light' ? 'dark' : 'light';
  applyThemeToDOM(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  // dispatch event so other parts of app (if any) can react
  try { window.dispatchEvent(new CustomEvent('cms-theme-changed', { detail: { theme: next } })); } catch (_) {}
}
