// public/js/components/topbar.js
// Versão robusta: confirma existência do botão, faz fallback para signOut no cliente Supabase
import { getState, onChange, clearSession, getState as _getState } from '/js/auth/session.js';

const container = document.getElementById('topbar-container');
let onChangeUnsub = null;

async function loadTemplate() {
  try {
    const tpl = await fetch('/views/layout/topbar.html').then(r=>r.text());
    if (!container) {
      console.warn('topbar: host element #topbar-container not found');
      return;
    }
    container.innerHTML = tpl;
    wire();
    renderUser();

    if (!onChangeUnsub) {
      onChangeUnsub = onChange(() => {
        try { renderUser(); } catch (e) { console.error(e); }
      });
    }
  } catch (err) {
    console.error('topbar.loadTemplate error', err);
  }
}

function wire(){
  const btnTheme = container.querySelector && container.querySelector('#btn-theme-toggle');
  const btnSidebar = container.querySelector && container.querySelector('#btn-sidebar-toggle');
  const btnLogout = container.querySelector && container.querySelector('#btn-logout');

  if (btnTheme) {
    btnTheme.addEventListener('click', ()=>{
      const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      if(next === 'light'){ document.body.classList.remove('theme-dark'); document.body.classList.add('theme-light'); }
      else { document.body.classList.remove('theme-light'); document.body.classList.add('theme-dark'); }
      localStorage.setItem('cms_pandda_theme', next);
    });
  }

  if (btnSidebar) {
    btnSidebar.addEventListener('click', () => {
      const evt = new CustomEvent('pandda:toggleSidebar');
      window.dispatchEvent(evt);
    });
  }

  // Robust logout: ensure handler exists even if template reloaded; use event delegation fallback
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  } else {
    // fallback: delegated handler on container (covers dynamic changes)
    container.addEventListener('click', (ev) => {
      const target = ev.target.closest && ev.target.closest('#btn-logout');
      if (target) handleLogout(ev);
    });
  }

  // second fallback: global delegated handler (covers overlays and other fragments)
  document.addEventListener('click', (ev) => {
    const target = ev.target.closest && ev.target.closest('#btn-logout');
    if (target) handleLogout(ev);
  });
}

async function handleLogout(ev) {
  try {
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
  } catch (_) {}

  console.info('Logout requested');

  try {
    // primary: try session.clearSession()
    await clearSession();
    console.info('Session cleared via clearSession()');
  } catch (err) {
    console.warn('clearSession() failed:', err);
    // try to call any global supabase client signOut as fallback
    try {
      if (window.__SUPABASE_CLIENT && typeof window.__SUPABASE_CLIENT.auth?.signOut === 'function') {
        await window.__SUPABASE_CLIENT.auth.signOut();
        console.info('Fallback: supabaseClient.auth.signOut() succeeded');
      }
    } catch (err2) {
      console.warn('Fallback supabase signOut failed:', err2);
    }
  } finally {
    // ensure redirect happens regardless
    try {
      window.location.href = '/login.html';
    } catch (e) {
      console.error('Redirect to /login.html failed', e);
    }
  }
}

function renderUser(){
  const emailEl = container.querySelector && container.querySelector('#user-email');
  const s = _getState();
  if (emailEl) emailEl.textContent = s.user?.email || '—';
}

loadTemplate();
