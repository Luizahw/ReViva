import { token, api, logout } from './api.js';

const navigation = [
  ['dashboard', 'dashboard.html', 'Início', 'home'],
  ['impacto', 'impacto.html', 'Meu impacto', 'impact'],
  ['conquistas', 'conquistas.html', 'Conquistas', 'trophy'],
  ['recompensas', 'recompensas.html', 'Recompensas', 'gift'],
  ['ranking', 'ranking.html', 'Ranking', 'star'],
  ['doacoes', 'doacoes.html', 'Doações', 'heart'],
  ['pontos', 'pontos-coleta.html', 'Pontos de coleta', 'pin'],
  ['perfil', 'perfil.html', 'Meu perfil', 'user']
];

function icon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `assets/ui-icons.svg#${name}`); svg.append(use);
  return svg;
}

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
  asideHead.innerHTML = '<a href="dashboard.html" class="brand brand-lockup"><span class="brand-mark"><img class="brand-mark-dark" src="assets/reviva-logo.svg" alt=""><img class="brand-mark-light" src="assets/reviva-logo.svg" alt=""></span><span>ReViva</span></a><p>Recicle o presente,<br>reutilize o futuro.</p>';
  const nav = document.createElement('nav'); nav.className = 'side-nav'; nav.setAttribute('aria-label', 'Navegação principal');
  navigation.forEach(([key, href, label, iconName]) => {
    const link = document.createElement('a'); link.href = href; link.className = 'nav-link'; link.dataset.nav = key;
    const iconBox = document.createElement('span'); iconBox.className = 'nav-icon'; iconBox.append(icon(iconName));
    link.append(iconBox, Object.assign(document.createElement('span'), { textContent: label }));
    if (key === page) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
    nav.append(link);
  });
  if (user.tipo_usuario === 'administrador') {
    [['admin.html', 'Painel administrativo', 'settings'], ['configuracoes.html', 'Gerenciar usuários', 'settings']].forEach(([href, label, iconName]) => {
      const link = document.createElement('a'); link.href = href; link.className = 'nav-link';
      const iconBox = document.createElement('span'); iconBox.className = 'nav-icon'; iconBox.append(icon(iconName));
      link.append(iconBox, Object.assign(document.createElement('span'), { textContent: label }));
      if ((page === 'admin' && href === 'admin.html') || (page === 'configuracoes' && href === 'configuracoes.html')) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
      nav.append(link);
    });
  }
  const sideFoot = document.createElement('div'); sideFoot.className = 'sidebar-footer';
  const accountRow = document.createElement('div'); accountRow.className = 'sidebar-account';
  accountRow.append(Object.assign(document.createElement('span'), { className: 'user-initial', textContent: (user.nome || 'R').trim().charAt(0).toUpperCase() }));
  const identity = document.createElement('span'); identity.className = 'sidebar-identity'; identity.append(Object.assign(document.createElement('strong'), { textContent: user.nome }), Object.assign(document.createElement('small'), { textContent: user.tipo_usuario === 'administrador' ? 'Administrador' : 'Conta ReViva' }));
  accountRow.append(identity);
  const signout = document.createElement('button'); signout.type = 'button'; signout.className = 'sidebar-logout'; signout.setAttribute('aria-label', 'Sair da conta'); signout.append(icon('logout'), Object.assign(document.createElement('span'), { textContent: 'Sair' })); signout.addEventListener('click', logout);
  sideFoot.append(accountRow, signout); sidebar.replaceChildren(asideHead, nav, sideFoot);

  const title = document.querySelector('[data-page-title]')?.textContent || 'ReViva';
  const topbar = document.createElement('div'); topbar.className = 'topbar-inner';
  const heading = document.createElement('div'); heading.className = 'topbar-heading';
  const headerMark = document.createElement('span'); headerMark.className = 'topbar-logo';
  const headerDark = document.createElement('img'); headerDark.className = 'theme-logo-dark'; headerDark.src = 'assets/reviva-logo.svg'; headerDark.alt = '';
  const headerLight = document.createElement('img'); headerLight.className = 'theme-logo-light'; headerLight.src = 'assets/reviva-logo.svg'; headerLight.alt = '';
  headerMark.append(headerDark, headerLight, Object.assign(document.createElement('span'), { className: 'topbar-logo-name', textContent: 'ReViva' }));
  const pageName = document.createElement('div'); pageName.className = 'topbar-title'; pageName.append(Object.assign(document.createElement('span'), { className: 'eyebrow', textContent: 'SUSTENTABILIDADE · RECICLAGEM E REUTILIZAÇÃO' }), Object.assign(document.createElement('strong'), { textContent: title }));
  heading.append(headerMark, pageName);
  const actions = document.createElement('div'); actions.className = 'topbar-actions';
  const themeButton = document.createElement('button'); themeButton.type = 'button'; themeButton.className = 'icon-button theme-toggle'; themeButton.dataset.themeToggle = ''; themeButton.setAttribute('aria-label', 'Alternar tema');
  const themeIcon = document.createElement('span'); themeIcon.dataset.themeIcon = ''; themeIcon.append(icon('moon'));
  themeButton.append(themeIcon);
  const profileMenu = document.createElement('div'); profileMenu.className = 'topbar-profile-menu';
  const profileButton = document.createElement('button'); profileButton.type = 'button'; profileButton.className = 'topbar-profile'; profileButton.setAttribute('aria-label', `Menu de perfil de ${user.nome}`); profileButton.setAttribute('aria-expanded', 'false');
  profileButton.append(Object.assign(document.createElement('span'), { className: 'topbar-user', textContent: (user.nome || 'R').trim().charAt(0).toUpperCase() }), Object.assign(document.createElement('span'), { className: 'topbar-user-name', textContent: (user.nome || '').trim().split(/\s+/)[0] }), icon('chevron'));
  const profileDropdown = document.createElement('div'); profileDropdown.className = 'profile-dropdown'; profileDropdown.hidden = true;
  const profileLink = document.createElement('a'); profileLink.href = 'perfil.html'; profileLink.textContent = 'Meu perfil'; profileDropdown.append(profileLink);
  if (user.tipo_usuario === 'administrador') { const settingsLink = document.createElement('a'); settingsLink.href = 'configuracoes.html'; settingsLink.textContent = 'Configurações'; profileDropdown.append(settingsLink); }
  const logoutLink = document.createElement('button'); logoutLink.type = 'button'; logoutLink.textContent = 'Sair da conta'; logoutLink.addEventListener('click', logout); profileDropdown.append(logoutLink);
  profileButton.addEventListener('click', () => { profileDropdown.hidden = !profileDropdown.hidden; profileButton.setAttribute('aria-expanded', String(!profileDropdown.hidden)); });
  document.addEventListener('click', (event) => { if (!profileMenu.contains(event.target)) { profileDropdown.hidden = true; profileButton.setAttribute('aria-expanded', 'false'); } });
  profileMenu.append(profileButton, profileDropdown);
  actions.append(themeButton, profileMenu); topbar.append(heading, actions); header.replaceChildren(topbar);

  const mobileItems = [['dashboard.html','Início','home'],['historico.html','Histórico','impact'],['reciclar.html','Registrar','recycle'],['doacoes.html','Doações','heart'],['perfil.html','Perfil','user']];
  mobile.replaceChildren();
  mobileItems.forEach(([href,label,iconName]) => {
    const link = document.createElement('a'); link.href = href; link.className = href === 'reciclar.html' ? 'mobile-primary' : '';
    const iconBox = document.createElement('span'); iconBox.append(icon(iconName));
    link.append(iconBox, Object.assign(document.createElement('small'), { textContent: label }));
    if (href === `${page}.html` || (page === 'pontos' && href === 'pontos-coleta.html')) link.setAttribute('aria-current','page');
    mobile.append(link);
  });
}
