// public/js/components/topbar.js
// Topbar resilient: ensures hamburger always triggers window.togglePanddaSidebar,
// uses delegation fallback, emits a diagnostic event and logs for easier debugging.

function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') el.className = attrs[k];
    else if (k === 'text') el.textContent = attrs[k];
    else if (k === 'html') el.innerHTML = attrs[k];
    else if (k.startsWith('data-')) el.setAttribute(k, attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  children.forEach(c => {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else if (c instanceof Node) el.appendChild(c);
  });
  return el;
}

function createTopbarStructure() {
  const hamburger = createEl('button', {
    class: 'topbar-hamburger',
    'aria-label': 'Abrir menu',
    'data-sidebar-toggle': '1',
    type: 'button'
  }, ['☰']);

  const brand = createEl('div', { class: 'brand' }, [
    createEl('div', { class: 'logo', 'aria-hidden': 'true' }, []),
    createEl('div', { class: 'title', html: '<strong>Pandda</strong>' }, [])
  ]);

  const left = createEl('div', { class: 'left' }, [hamburger, brand]);

  const themeBtn = createEl('button', { id: 'btn-theme-toggle', class: 'button', title: 'Alternar tema', type: 'button' }, ['🌓']);
  const userEmail = createEl('div', { id: 'topbar-user-email', class: 'small', text: '—' });
  const logoutBtn = createEl('button', { id: 'btn-logout', class: 'button', type: 'button' }, ['Sair']);
  const userMenu = createEl('div', { id: 'user-menu', class: 'row' }, [userEmail, logoutBtn]);

  const actions = createEl('div', { class: 'actions row' }, [themeBtn, userMenu]);

  const topbar = createEl('div', { class: 'topbar' }, [left, actions]);
  return { topbar, hamburger, themeBtn, logoutBtn, userEmail };
}

export async function mountTopbar(containerSelector = '#topbar-container', opts = {}) {
  const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
  if (!container) {
    console.warn('mountTopbar: container not found:', containerSelector);
    return null;
  }

  // Accessibility: ensure container interactive content is not hidden from AT
  try { container.removeAttribute('aria-hidden'); } catch(_) {}

  if (container.__topbar_mounted) return container.__topbar_api || null;
  container.__topbar_mounted = true;

  while (container.firstChild) container.removeChild(container.firstChild);

  const { topbar, hamburger, themeBtn, logoutBtn, userEmail } = createTopbarStructure();
  container.appendChild(topbar);

  // Ensure the hamburger always triggers toggle - robust handler
  async function ensureSidebarAndToggle() {
    // primary: call global toggle if present
    if (typeof window.togglePanddaSidebar === 'function') {
      try {
        window.togglePanddaSidebar('topbar');
        try { window.dispatchEvent(new CustomEvent('pandda:sidebar:request-toggle', { detail: { source: 'topbar', via: 'global-fn' } })); } catch(_) {}
        console.debug('topbar: invoked window.togglePanddaSidebar()');
        return true;
      } catch (e) {
        console.warn('topbar: window.togglePanddaSidebar threw', e);
      }
    }

    // secondary: try to lazy-load the sidebar module and then call toggle
    try {
      const mod = await import('/js/components/sidebar.js').catch(err => { throw err; });
      if (mod && typeof mod.setupSidebar === 'function') {
        await mod.setupSidebar();
        await new Promise(r => setTimeout(r, 20));
        if (typeof window.togglePanddaSidebar === 'function') {
          window.togglePanddaSidebar('topbar');
          try { window.dispatchEvent(new CustomEvent('pandda:sidebar:request-toggle', { detail: { source: 'topbar', via: 'lazy-load' } })); } catch(_) {}
          console.debug('topbar: lazy-loaded sidebar and invoked togglePanddaSidebar()');
          return true;
        }
      }
    } catch (err) {
      console.warn('topbar: failed to lazy-load sidebar module', err);
    }

    // last resort: dispatch a request event for external listeners to react
    try {
      window.dispatchEvent(new CustomEvent('pandda:sidebar:request-toggle', { detail: { source: 'topbar', via: 'none' } }));
      console.debug('topbar: dispatched pandda:sidebar:request-toggle for external handlers');
    } catch (_) {}
    return false;
  }

  function bindHandlers() {
    // Attach direct handler to hamburger element (if present)
    if (!hamburger.__pandda_attached) {
      hamburger.__pandda_attached = true;
      hamburger.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          console.debug('topbar: hamburger clicked (direct handler)');
          await ensureSidebarAndToggle();
        } catch (err) {
          console.warn('topbar: error in hamburger click', err);
        }
      }, { passive: false });
    }

    // Delegation fallback: ensure any element with [data-sidebar-toggle] triggers toggle
    if (!document.__pandda_topbar_delegation) {
      document.__pandda_topbar_delegation = true;
      document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-sidebar-toggle]');
        if (!btn) return;
        e.preventDefault();
        try {
          console.debug('topbar: delegated click on [data-sidebar-toggle] element');
          await ensureSidebarAndToggle();
        } catch (err) {
          console.warn('topbar: delegated handler error', err);
        }
      }, { capture: false });
    }

    // theme toggle fallback
    themeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const theme = await import('/src/core/theme.js').catch(()=>null);
        if (theme && typeof theme.toggleTheme === 'function') { theme.toggleTheme(); return; }
      } catch(_) {}
      try {
        const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        document.body.classList.remove('theme-dark','theme-light');
        document.body.classList.add(next === 'light' ? 'theme-light' : 'theme-dark');
      } catch (err) { console.warn('theme toggle failed', err); }
    });

    // logout with confirmation
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const ok = confirm('Deseja realmente sair?');
      if (!ok) return;
      try {
        const sessionMod = await import('/js/auth/session.js');
        if (sessionMod && typeof sessionMod.signOut === 'function') { await sessionMod.signOut(); return; }
        if (sessionMod && typeof sessionMod.clearSession === 'function') { await sessionMod.clearSession(); return; }
      } catch (err) {
        console.warn('logout via session module failed', err);
      }
      try { location.replace('/login.html'); } catch(_) {}
    });

    // populate user email and keep updated
    (async () => {
      try {
        const sessionMod = await import('/js/auth/session.js');
        const state = sessionMod.getState ? sessionMod.getState() : {};
        const email = state?.user?.email ?? '—';
        userEmail.textContent = email;
        sessionMod.onChange && sessionMod.onChange((st) => {
          const e = st?.user?.email ?? '—';
          userEmail.textContent = e;
        });
      } catch (_) {}
    })();
  }

  try { bindHandlers(); } catch (err) { console.warn('mountTopbar: bindHandlers failed', err); }

  const api = {
    container,
    refresh: async () => {
      container.__topbar_mounted = false;
      return mountTopbar(containerSelector, opts);
    }
  };

  container.__topbar_api = api;
  return api;
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { mountTopbar('#topbar-container').catch(()=>{}); } catch(_) {}
  });
}
