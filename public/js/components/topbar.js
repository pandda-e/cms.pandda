// public/js/components/topbar.js
import { getState, onChange, clearSession } from '/js/auth/session.js';

const container = document.getElementById('topbar-container');
let mounted = false;

async function mountTopbar(){
  if (!container) { console.warn('topbar: container not found'); return; }
  const tpl = await fetch('/views/layout/topbar.html').then(r=>r.text());
  container.innerHTML = tpl;
  container.querySelectorAll && wire();
  renderUser();

  // subscribe once
  onChange(renderUser);
  mounted = true;
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

  async function handleLogout(ev) {
    try { ev?.preventDefault(); } catch(_) {}
    try {
      await clearSession();
      console.info('topbar: clearSession completed');
    } catch (err) {
      console.warn('topbar logout error', err);
      try { if(window.__SUPABASE_CLIENT) await window.__SUPABASE_CLIENT.auth.signOut(); } catch(_){}
    } finally {
      window.location.href = '/login.html';
    }
  }

  if (btnLogout) btnLogout.addEventListener('click', handleLogout);

  // global delegated fallback
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('#btn-logout');
    if (t) handleLogout(ev);
  });
}

function renderUser(){
  const emailEl = container.querySelector && container.querySelector('#user-email');
  const s = getState();
  if (!container) return;
  if (emailEl) emailEl.textContent = s.user?.email || '—';
}

mountTopbar().catch(err => console.error('mountTopbar error', err));
