import { token, api, logout } from './api.js';

const navigation = [
  ['dashboard', 'dashboard.html', 'Início', '⌂'],
  ['reciclar', 'reciclar.html', 'Registrar reciclagem', '＋'],
  ['historico', 'historico.html', 'Histórico', '◷'],
  ['impacto', 'impacto.html', 'Meu impacto', '◷'],
  ['conquistas', 'conquistas.html', 'Conquistas', '✦'],
  ['recompensas', 'recompensas.html', 'Recompensas', '◇'],
  ['ranking', 'ranking.html', 'Ranking', '♜'],
  ['doacoes', 'doacoes.html', 'Doações', '♡'],
  ['pontos', 'pontos-coleta.html', 'Pontos de coleta', '⌖'],
  ['perfil', 'perfil.html', 'Meu perfil', '♙']
];

export async function requireUser() {
  if (!token()) { location.href = 'index.html'; throw new Error('Sessão encerrada.'); }
  const { usuario } = await api('/usuarios/perfil');
  localStorage.setItem('reviva_usuario', JSON.stringify(usuario));
  return usuario;
}

export function mountLayout(page, user) {
  const sidebar = document.querySelector('#appSidebar');
  const header = document.querySelector('#appHeader');
  const mobile = document.querySelector('#mobileNav');
  if (!sidebar || !header || !mobile) return;

  const asideHead = document.createElement('div');
  asideHead.className = 'sidebar-brand';
  asideHead.innerHTML = '<a href="dashboard.html" class="brand"><span class="brand-mark"><img src="assets/recycle-mark.svg" alt=""></span><span>ReViva</span></a><p>Recicle o presente,<br>reutilize o futuro.</p>';
  const nav = document.createElement('nav'); nav.className = 'side-nav'; nav.setAttribute('aria-label', 'Navegação principal');
  navigation.forEach(([key, href, label, icon]) => {
    const link = document.createElement('a'); link.href = href; link.className = 'nav-link'; link.dataset.nav = key;
    link.append(Object.assign(document.createElement('span'), { className: 'nav-icon', textContent: icon }), Object.assign(document.createElement('span'), { textContent: label }));
    if (key === page) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
    nav.append(link);
  });
  if (user.tipo_usuario === 'administrador') {
    [['admin.html', 'Painel administrativo', '▦'], ['configuracoes.html', 'Gerenciar usuários', '⚙']].forEach(([href, label, icon]) => {
      const link = document.createElement('a'); link.href = href; link.className = 'nav-link';
      link.append(Object.assign(document.createElement('span'), { className: 'nav-icon', textContent: icon }), Object.assign(document.createElement('span'), { textContent: label }));
      if ((page === 'admin' && href === 'admin.html') || (page === 'configuracoes' && href === 'configuracoes.html')) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
      nav.append(link);
    });
  }
  const sideFoot = document.createElement('div'); sideFoot.className = 'sidebar-footer';
  sideFoot.append(Object.assign(document.createElement('span'), { className: 'user-initial', textContent: (user.nome || 'R').trim().charAt(0).toUpperCase() }));
  const identity = document.createElement('span'); identity.className = 'sidebar-identity'; identity.append(Object.assign(document.createElement('strong'), { textContent: user.nome }), Object.assign(document.createElement('small'), { textContent: user.tipo_usuario === 'administrador' ? 'Administrador' : 'Conta ReViva' }));
  const signout = document.createElement('button'); signout.type = 'button'; signout.className = 'icon-button signout-button'; signout.setAttribute('aria-label', 'Sair'); signout.textContent = '↗'; signout.addEventListener('click', logout);
  sideFoot.append(identity, signout); sidebar.replaceChildren(asideHead, nav, sideFoot);

  const title = document.querySelector('[data-page-title]')?.textContent || 'ReViva';
  const topbar = document.createElement('div'); topbar.className = 'topbar-inner';
  const pageName = document.createElement('div'); pageName.className = 'topbar-title'; pageName.append(Object.assign(document.createElement('span'), { className: 'eyebrow', textContent: 'REVIVA · RECICLAGEM E REUTILIZAÇÃO' }), Object.assign(document.createElement('strong'), { textContent: title }));
  const actions = document.createElement('div'); actions.className = 'topbar-actions';
  const themeButton = document.createElement('button'); themeButton.type = 'button'; themeButton.className = 'icon-button theme-toggle'; themeButton.dataset.themeToggle = ''; themeButton.setAttribute('aria-label', 'Alternar tema');
  const themeIcon = document.createElement('span'); themeIcon.dataset.themeIcon = ''; themeIcon.textContent = '☾';
  themeButton.append(themeIcon);
  const initials = document.createElement('a'); initials.href = 'perfil.html'; initials.className = 'topbar-user'; initials.setAttribute('aria-label', `Perfil de ${user.nome}`); initials.textContent = (user.nome || 'R').trim().charAt(0).toUpperCase();
  actions.append(themeButton, initials); topbar.append(pageName, actions); header.replaceChildren(topbar);

  const mobileItems = [['dashboard.html','Início','⌂'],['historico.html','Histórico','◷'],['reciclar.html','Registrar','＋'],['doacoes.html','Doações','♡'],['perfil.html','Perfil','♙']];
  mobile.replaceChildren();
  mobileItems.forEach(([href,label,icon]) => {
    const link = document.createElement('a'); link.href = href; link.className = href === 'reciclar.html' ? 'mobile-primary' : '';
    link.append(Object.assign(document.createElement('span'), { textContent: icon }), Object.assign(document.createElement('small'), { textContent: label }));
    if (href === `${page}.html` || (page === 'pontos' && href === 'pontos-coleta.html')) link.setAttribute('aria-current','page');
    mobile.append(link);
  });
}
