// public/js/components/sidebar.js
import { getState, onChange } from '/js/auth/session.js';

const sidebarHost = document.getElementById('sidebar-container');
let overlayEl = null;
let mounted = false;

async function mountSidebar(){
  if (!sidebarHost) { console.warn('sidebar: container not found'); return; }
  const tpl = await fetch('/views/layout/sidebar.html').then(r=>r.text());
  sidebarHost.innerHTML = tpl;
  sidebarHost.classList.add('sidebar-container');
  sidebarHost.setAttribute('aria-hidden', 'false');

  // overlay
  overlayEl = document.createElement('div');
  overlayEl.className = 'sidebar-overlay';
  overlayEl.setAttribute('aria-hidden', 'true');
  overlayEl.innerHTML = tpl;
  document.body.appendChild(overlayEl);

  wire();
  applyPermissionVisibility();
  highlightRoute();

  onChange(() => { applyPermissionVisibility(); });
  mounted = true;
}

function wire(){
  window.addEventListener('pandda:toggleSidebar', ()=>{
    if (window.innerWidth <= 920) {
      overlayEl.classList.toggle('open');
      overlayEl.setAttribute('aria-hidden', overlayEl.classList.contains('open') ? 'false' : 'true');
    } else {
      sidebarHost.classList.toggle('sidebar-collapsed');
    }
  });

  overlayEl.addEventListener('click', (ev) => {
    if (ev.target === overlayEl) overlayEl.classList.remove('open');
  });

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('[data-route]');
    if (!a) return;
    ev.preventDefault();
    const route = a.getAttribute('data-route');
    navigateTo(route);
    if (overlayEl.classList.contains('open')) overlayEl.classList.remove('open');
  });

  window.addEventListener('hashchange', ()=> highlightRoute());
  window.addEventListener('resize', ()=> {
    if(window.innerWidth > 920 && overlayEl.classList.contains('open')) overlayEl.classList.remove('open');
  });
}

function navigateTo(route){
  location.hash = `#/${route}`;
}

function highlightRoute(){
  const route = (location.hash || '#/dashboard').replace('#/','');
  const all = sidebarHost.querySelectorAll && sidebarHost.querySelectorAll('.nav-item');
  if(!all) return;
  all.forEach(el => el.classList.toggle('active', el.getAttribute('data-route') === route));
}

function applyPermissionVisibility(){
  if(!sidebarHost) return;
  const s = getState();
  const adminLink = sidebarHost.querySelector && sidebarHost.querySelector('[data-route="administradores"]');
  if (adminLink && !s.isSuper) adminLink.remove();
  if (overlayEl) {
    const adminLinkOverlay = overlayEl.querySelector && overlayEl.querySelector('[data-route="administradores"]');
    if (adminLinkOverlay && !s.isSuper) adminLinkOverlay.remove();
  }
}

mountSidebar().catch(err => console.error('mountSidebar error', err));
