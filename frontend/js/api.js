export const API = 'http://localhost:3300/api';
export const TOKEN_KEY = 'reviva_token';
export const USER_KEY = 'reviva_usuario';

export function token() { return localStorage.getItem(TOKEN_KEY); }
export function cachedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
}
export function saveUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
export function logout() { clearSession(); location.href = 'index.html'; }

export async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    ...options.headers
  };
  let response;
  try { response = await fetch(`${API}${path}`, { ...options, headers }); }
  catch { throw new Error('Não foi possível conectar à API em localhost:3300.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token()) {
      clearSession();
      location.href = 'index.html';
    }
    const error = new Error(data.mensagem || 'Não foi possível concluir a solicitação.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}
export function formatNumber(value, decimals = 0) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: decimals });
}
export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function feedback(node, text, type = 'error') {
  node.textContent = text;
  node.className = `feedback ${type}`;
  node.hidden = !text;
}
