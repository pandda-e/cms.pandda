// public/js/components/topbar.js
// Topbar reescrita: apenas lógica de sessão (exibir e-mail), toggle de tema e logout.
// Exports: mountTopbar(containerSelector = '#topbar-container') -> api { reflow }.

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') node.className = attrs[k];
    else if (k === 'text') node.textContent = attrs[k];
    else if (k === 'html') node.innerHTML = attrs[k];
    else node.setAttribute(k, attrs[k]);
  }
  (children || []).forEach(c => {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else node.appendChild(c);
  });
  return node;
}

export async function mountTopbar(containerSelector = '#topbar-container') {
  const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
  if (!container) return null;
  if (container.__mounted_topbar) return container.__topbar_api;
  container.__mounted_topbar = true;

  // Build DOM
  container.innerHTML = ''; // clear
  const top = el('div', { class: 'topbar' });

  const btnHamb = el('button', { class: 'topbar-hamburger', 'aria-label': 'Abrir menu', 'data-sidebar-toggle': '1', type: 'button' }, ['☰']);
  const logo = el('div', { class: 'logo', 'aria-hidden': 'true' }, []);
  const brandTitle = el('div', { class: 'brand-title' }, [el('div', { html: '<strong>Pandda</strong>' }), el('div', { class: 'small', text: 'Painel' })]);
  const brand = el('div', { class: 'brand' }, [logo, brandTitle]);
  const left = el('div', { class: 'left' }, [btnHamb, brand]);

  const btnTheme = el('button', { id: 'btn-theme-toggle', class: 'button', title: 'Alternar tema', type: 'button', 'aria-pressed': 'false' }, ['🌓']);
  const userEmail = el('div', { id: 'topbar-user-email', class: 'small', text: '—' });
  const btnLogout = el('button', { id: 'btn-logout', class: 'button', type: 'button' }, ['Sair']);
  const userMenu = el('div', { class: 'row actions' }, [userEmail, btnLogout]);
  const right = el('div', { class: 'actions' }, [btnTheme, userMenu]);

  top.appendChild(left);
  top.appendChild(right);
  container.appendChild(top);

  // Handlers
  async function tryToggleSidebar() {
    if (typeof window.togglePanddaSidebar === 'function') {
      try { window.togglePanddaSidebar('topbar'); return; } catch (_) {}
    }
    // otherwise attempt lazy load
    try {
      const mod = await import('/js/components/sidebar.js');
      if (mod && typeof mod.setupSidebar === 'function') {
        await mod.setupSidebar();
        if (typeof window.togglePanddaSidebar === 'function') window.togglePanddaSidebar('topbar');
      }
    } catch (_) {}
  }

  btnHamb.addEventListener('click', (e) => {
    e.preventDefault();
    tryToggleSidebar();
  });

  // Theme toggle: prefer src/core/theme.js if available
  btnTheme.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const mod = await import('/src/core/theme.js').catch(() => null);
      if (mod && typeof mod.toggleTheme === 'function') { mod.toggleTheme(); updateThemeState(); return; }
    } catch (_) {}
    // fallback: flip html[data-theme] / body classes
    try {
      const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
      const next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      document.body.classList.remove('theme-light', 'theme-dark');
      document.body.classList.add(next === 'light' ? 'theme-light' : 'theme-dark');
      updateThemeState();
    } catch (_) {}
  });

  function updateThemeState() {
    const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
    btnTheme.setAttribute('aria-pressed', String(cur === 'dark'));
  }
  updateThemeState();

  // Logout: use session module if present
  btnLogout.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!confirm('Deseja realmente sair?')) return;
    try {
      const sessionMod = await import('/js/auth/session.js').catch(() => null);
      if (sessionMod) {
        if (typeof sessionMod.signOut === 'function') { await sessionMod.signOut(); return; }
        if (typeof sessionMod.clearSession === 'function') { await sessionMod.clearSession(); return; }
      }
    } catch (_) {}
    try { location.replace('/login.html'); } catch (_) {}
  });

  // Populate user email from session module
  (async () => {
    try {
      const sessionMod = await import('/js/auth/session.js').catch(() => null);
      if (!sessionMod) return;
      const s = sessionMod.getState ? sessionMod.getState() : {};
      userEmail.textContent = s?.user?.email ?? '—';
      if (sessionMod.onChange) sessionMod.onChange((st) => {
        userEmail.textContent = st?.user?.email ?? '—';
      });
    } catch (_) {}
  })();

  // Simple reflow API: update CSS var and dispatch event so sidebar can react
  function reflow() {
    try {
      const h = Math.max(48, Math.round(top.getBoundingClientRect().height || 64));
      document.documentElement.style.setProperty('--topbar-height', `${h}px`);
      window.dispatchEvent(new CustomEvent('pandda:topbar:resized', { detail: { height: h } }));
    } catch (_) {}
  }
  // listen to resize to keep value consistent
  window.addEventListener('resize', () => reflow());

  // initial reflow
  setTimeout(reflow, 30);

  const api = { reflow, container };
  container.__topbar_api = api;
  try { window.__PANDDA_TOPBAR_API = api; } catch (_) {}
  return api;
}

// Auto-mount on load if container exists
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { mountTopbar('#topbar-container').catch(()=>{}); } catch (_) {}
  });
}
