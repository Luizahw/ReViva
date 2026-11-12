const THEME_KEY = 'reviva_theme';

export function currentTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  const selected = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = selected;
  localStorage.setItem(THEME_KEY, selected);
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-label', selected === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro');
    button.setAttribute('aria-pressed', String(selected === 'dark'));
    const icon = button.querySelector('[data-theme-icon]');
    if (icon) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `assets/ui-icons.svg#${selected === 'dark' ? 'sun' : 'moon'}`);
      svg.append(use); icon.replaceChildren(svg);
    }
  });
}

export function toggleTheme() {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

setTheme(currentTheme());
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-theme-toggle]')) toggleTheme();
});
