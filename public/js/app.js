// public/js/app.js
// Router + bootstrap that assumes session.initialize was called earlier in page
const viewRoot = document.getElementById('view-root');

const routes = {
  dashboard: '/views/dashboard.html',
  clientes: '/views/clientes.html',
  planos: '/views/planos.html',
  aplicativos: '/views/aplicativos.html',
  indicacoes: '/views/indicacoes.html',
  descontos: '/views/descontos.html'
};

window.addEventListener('hashchange', router);
window.addEventListener('load', router);

async function router(){
  const route = (location.hash || '#/dashboard').replace('#/','');
  const path = routes[route] || routes.dashboard;
  try {
    const html = await fetch(path).then(r=>r.text());
    viewRoot.innerHTML = html;
    // dynamic import of view script (fails silently if no script)
    import(`/js/views/${route}.js`).catch(()=>{/* no script for this view */});
  } catch (err) {
    viewRoot.innerHTML = `<div class="card"><h2>Erro ao carregar a view</h2><pre>${err.message}</pre></div>`;
  }
}
