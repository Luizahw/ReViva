const THEME_KEY = 'reviva_theme';
const TEXT_KEY = 'reviva_text_size';
const CONTRAST_KEY = 'reviva_high_contrast';
const MOTION_KEY = 'reviva_reduce_motion';

export function currentTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function accessibilityPreferences() {
  return {
    textSize: ['small', 'large', 'larger'].includes(localStorage.getItem(TEXT_KEY)) ? localStorage.getItem(TEXT_KEY) : 'normal',
    highContrast: localStorage.getItem(CONTRAST_KEY) === 'true',
    reduceMotion: localStorage.getItem(MOTION_KEY) === 'true'
  };
}

export function setAccessibilityPreference(name, value) {
  const keys = { textSize: TEXT_KEY, highContrast: CONTRAST_KEY, reduceMotion: MOTION_KEY };
  if (!Object.hasOwn(keys, name)) return;
  localStorage.setItem(keys[name], String(value));
  applyAccessibilityPreferences();
}

export function applyAccessibilityPreferences() {
  const preferences = accessibilityPreferences();
  document.documentElement.dataset.textSize = preferences.textSize;
  document.documentElement.dataset.highContrast = String(preferences.highContrast);
  document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion);
  document.querySelectorAll('[data-a11y-status]').forEach((status) => {
    status.textContent = `Texto ${preferences.textSize === 'normal' ? 'padrão' : preferences.textSize === 'small' ? 'menor' : preferences.textSize === 'large' ? 'grande' : 'maior'}; alto contraste ${preferences.highContrast ? 'ativado' : 'desativado'}; movimento reduzido ${preferences.reduceMotion ? 'ativado' : 'desativado'}.`;
    status.hidden = false;
  });
  document.querySelectorAll('[data-a11y-toggle]').forEach((button) => {
    const active = button.dataset.a11yToggle === 'contrast' ? preferences.highContrast : preferences.reduceMotion;
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-text-size]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.textSize === preferences.textSize));
  });
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
applyAccessibilityPreferences();
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-theme-toggle]')) toggleTheme();
});
