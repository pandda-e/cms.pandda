// public/js/components/sidebar.js
import { getState, onChange } from '/js/auth/session.js';

const sidebarHost = document.getElementById('sidebar-container');
let overlayEl = null;
let collapsed = false;
let onChangeUnsub = null;

async function loadTemplate(){
  const tpl = await fetch('/views/layout/sidebar.html').then(r=>r.text());
  // ensure host exists
  if (!sidebarHost) {
    console.warn('sidebar: host element #sidebar-container not found');
    return;
  }

  sidebarHost.innerHTML = tpl;
  sidebarHost.classList.add('sidebar-container');

  // prepare overlay clone for mobile (create once)
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.className = 'sidebar-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlayEl);
  }
  overlayEl.innerHTML = tpl;

  wire();
  // apply visibility only after DOM nodes exist
  applyPermissionVisibility();
  highlightRoute();

  // subscribe to session changes now that templates exist
  if (!onChangeUnsub) {
    onChangeUnsub = onChange(() => {
      try { applyPermissionVisibility(); } catch(e){ console.error(e); }
    });
  }
}

function wire(){
  // toggle from topbar
  window.addEventListener('pandda:toggleSidebar', ()=>{
    if (window.innerWidth <= 920) {
      overlayEl.classList.toggle('open');
      overlayEl.setAttribute('aria-hidden', overlayEl.classList.contains('open') ? 'false' : 'true');
    } else {
      collapsed = !collapsed;
      sidebarHost.classList.toggle('sidebar-collapsed', collapsed);
    }
  });

  // close overlay when clicking outside
  overlayEl.addEventListener('click', (ev) => {
    if(ev.target === overlayEl) overlayEl.classList.remove('open');
  });

  // route handling: delegate clicks inside both sidebar host and overlay
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('[data-route]');
    if(!a) return;
    ev.preventDefault();
    const route = a.getAttribute('data-route');
    navigateTo(route);
    if (overlayEl && overlayEl.classList.contains('open')) overlayEl.classList.remove('open');
  });

  window.addEventListener('hashchange', ()=> highlightRoute());
  window.addEventListener('resize', ()=> {
    if(window.innerWidth > 920 && overlayEl && overlayEl.classList.contains('open')) overlayEl.classList.remove('open');
  });
}

function navigateTo(route){
  location.hash = `#/${route}`;
}

function highlightRoute(){
  const route = (location.hash || '#/dashboard').replace('#/','');
  const all = sidebarHost.querySelectorAll && sidebarHost.querySelectorAll('.nav-item');
  if (!all) return;
  all.forEach(el=>{
    el.classList.toggle('active', el.getAttribute('data-route') === route);
  });
}

function applyPermissionVisibility(){
  // guard for DOM readiness
  if (!sidebarHost) return;
  const s = getState();
  // desktop link
  const adminLink = sidebarHost.querySelector && sidebarHost.querySelector('[data-route="administradores"]');
  if (adminLink && !s.isSuper) adminLink.remove();
  // overlay link
  if (overlayEl) {
    const adminLinkOverlay = overlayEl.querySelector && overlayEl.querySelector('[data-route="administradores"]');
    if (adminLinkOverlay && !s.isSuper) adminLinkOverlay.remove();
  }
}

loadTemplate().catch(err => {
  console.error('sidebar.loadTemplate error', err);
});
