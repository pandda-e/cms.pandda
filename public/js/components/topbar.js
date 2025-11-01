// public/js/components/topbar.js
// Topbar que oferece API pública com método reflow().
// Quando reflow é chamado, o topbar recalcula sua altura e emite 'pandda:topbar:resized'.
// Mantém handlers para toggle de sidebar, tema, logout e atualização do e-mail do usuário.

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

function debounce(fn, ms = 120) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function createTopbarStructure() {
  const hamburger = createEl('button', {
    class: 'topbar-hamburger',
    'aria-label': 'Abrir menu',
    'aria-expanded': 'false',
    'data-sidebar-toggle': '1',
    type: 'button'
  }, ['☰']);

  const brand = createEl('div', { class: 'brand' }, [
    createEl('div', { class: 'logo', 'aria-hidden': 'true' }, []),
    createEl('div', { class: 'title', html: '<strong>Pandda</strong>' }, [])
  ]);

  const left = createEl('div', { class: 'left' }, [hamburger, brand]);

  const themeBtn = createEl('button', {
    id: 'btn-theme-toggle',
    class: 'button',
    title: 'Alternar tema',
    type: 'button',
    'aria-pressed': 'false'
  }, ['🌓']);

  const userEmail = createEl('div', { id: 'topbar-user-email', class: 'small', text: '—' });
  const logoutBtn = createEl('button', { id: 'btn-logout', class: 'button', type: 'button' }, ['Sair']);
  const userMenu = createEl('div', { id: 'user-menu', class: 'row' }, [userEmail, logoutBtn]);

  const actions = createEl('div', { class: 'actions row' }, [themeBtn, userMenu]);

  const topbar = createEl('div', { class: 'topbar' }, [left, actions]);
  return { topbar, hamburger, themeBtn, logoutBtn, userEmail, brand };
}

export async function mountTopbar(containerSelector = '#topbar-container', opts = {}) {
  const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
  if (!container) {
    console.warn('mountTopbar: container not found:', containerSelector);
    return null;
  }

  if (container.__topbar_mounted) return container.__topbar_api || null;
  container.__topbar_mounted = true;

  while (container.firstChild) container.removeChild(container.firstChild);

  const { topbar, hamburger, themeBtn, logoutBtn, userEmail, brand } = createTopbarStructure();
  container.appendChild(topbar);

  // ensure container accessible properties
  try { container.removeAttribute('aria-hidden'); } catch(_) {}

  async function ensureSidebarAndToggle() {
    if (typeof window.togglePanddaSidebar === 'function') {
      try {
        window.togglePanddaSidebar('topbar');
        try { window.dispatchEvent(new CustomEvent('pandda:sidebar:request-toggle', { detail: { source: 'topbar' } })); } catch(_) {}
        return true;
      } catch (e) { console.warn('topbar: togglePanddaSidebar threw', e); }
    }

    try {
      const mod = await import('/js/components/sidebar.js').catch(err => { throw err; });
      if (mod && typeof mod.setupSidebar === 'function') {
        await mod.setupSidebar();
        await new Promise(r => setTimeout(r, 20));
        if (typeof window.togglePanddaSidebar === 'function') {
          window.togglePanddaSidebar('topbar');
          try { window.dispatchEvent(new CustomEvent('pandda:sidebar:request-toggle', { detail: { source: 'topbar', via: 'lazy-load' } })); } catch(_) {}
          return true;
        }
      }
    } catch (err) { console.warn('topbar: failed to lazy-load sidebar module', err); }

    try { window.dispatchEvent(new CustomEvent('pandda:sidebar:request-toggle', { detail: { source: 'topbar', via: 'none' } })); } catch(_) {}
    return false;
  }

  function bindHandlers() {
    if (!hamburger.__pandda_attached) {
      hamburger.__pandda_attached = true;
      hamburger.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await ensureSidebarAndToggle(); } catch (err) { console.warn('topbar: error in hamburger click', err); }
      }, { passive: false });
      hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hamburger.click();
        }
      });
    }

    if (!document.__pandda_topbar_delegation) {
      document.__pandda_topbar_delegation = true;
      document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-sidebar-toggle]');
        if (!btn) return;
        e.preventDefault();
        try { await ensureSidebarAndToggle(); } catch (err) { console.warn('topbar: delegated handler error', err); }
      }, { capture: false });
    }

    themeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const theme = await import('/src/core/theme.js').catch(()=>null);
        if (theme && typeof theme.toggleTheme === 'function') {
          theme.toggleTheme();
          const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
          themeBtn.setAttribute('aria-pressed', String(cur === 'dark'));
          return;
        }
      } catch(_) {}
      try {
        const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        document.body.classList.remove('theme-dark','theme-light');
        document.body.classList.add(next === 'light' ? 'theme-light' : 'theme-dark');
        themeBtn.setAttribute('aria-pressed', String(next === 'dark'));
      } catch (err) { console.warn('theme toggle failed', err); }
    });

    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const ok = confirm('Deseja realmente sair?');
      if (!ok) return;
      try {
        const sessionMod = await import('/js/auth/session.js');
        if (sessionMod && typeof sessionMod.signOut === 'function') { await sessionMod.signOut(); return; }
        if (sessionMod && typeof sessionMod.clearSession === 'function') { await sessionMod.clearSession(); return; }
      } catch (err) { console.warn('logout via session module failed', err); }
      try { location.replace('/login.html'); } catch(_) {}
    });

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

  bindHandlers();

  // reflow: recompute topbar height and dispatch a custom event so listeners (sidebar) can adjust
  function reflow() {
    try {
      // measure height and set CSS variable --topbar-height on :root so CSS can adapt
      const rect = topbar.getBoundingClientRect();
      const h = Math.max(48, Math.round(rect.height || 64));
      document.documentElement.style.setProperty('--topbar-height', `${h}px`);
      // Notify interested listeners
      const ev = new CustomEvent('pandda:topbar:resized', { detail: { height: h } });
      window.dispatchEvent(ev);
    } catch (e) {
      console.warn('topbar.reflow failed', e);
    }
  }

  // Debounced reflow on resize/DOM changes
  const debouncedReflow = debounce(reflow, 80);
  window.addEventListener('resize', debouncedReflow);

  // Observe mutations inside topbar that can change its height (e.g., dynamic user label)
  const mo = new MutationObserver(debouncedReflow);
  try { mo.observe(topbar, { childList: true, subtree: true, characterData: true, attributes: true }); } catch(_) {}

  // Expose API
  const api = {
    container,
    reflow,
    refresh: async () => {
      container.__topbar_mounted = false;
      return mountTopbar(containerSelector, opts);
    }
  };

  // publish API on container and window for convenience
  container.__topbar_api = api;
  try { window.__PANDDA_TOPBAR_API = api; } catch(_) {}

  // initial reflow after mount
  setTimeout(reflow, 30);

  return api;
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { mountTopbar('#topbar-container').catch(()=>{}); } catch(_) {}
  });
}
