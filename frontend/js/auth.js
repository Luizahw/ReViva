import { api, token, TOKEN_KEY, USER_KEY, feedback } from './api.js';
import './theme.js';

if (token()) location.replace('dashboard.html');
const loginForm = document.querySelector('#loginForm');
const registerForm = document.querySelector('#registerForm');

if (loginForm) {
  const queryEmail = new URLSearchParams(location.search).get('email');
  if (queryEmail) loginForm.elements.email.value = queryEmail;
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true; submit.textContent = 'Entrando...';
    try {
      const values = Object.fromEntries(new FormData(loginForm).entries());
      const result = await api('/usuarios/login', { method: 'POST', body: JSON.stringify(values) });
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.usuario));
      location.replace('dashboard.html');
    } catch (error) { feedback(document.querySelector('#loginError'), error.message); }
    finally { submit.disabled = false; submit.textContent = 'Entrar'; }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;
    const values = Object.fromEntries(new FormData(registerForm).entries());
    if (values.senha !== values.confirmar_senha) { feedback(document.querySelector('#registerError'), 'As senhas não são iguais.'); return; }
    const submit = registerForm.querySelector('[type="submit"]');
    submit.disabled = true; submit.textContent = 'Criando conta...';
    try {
      await api('/usuarios/cadastro', { method: 'POST', body: JSON.stringify({ nome: values.nome, email: values.email, senha: values.senha }) });
      location.replace(`index.html?email=${encodeURIComponent(values.email)}&criada=1`);
    } catch (error) { feedback(document.querySelector('#registerError'), error.message); }
    finally { submit.disabled = false; submit.textContent = 'Criar conta'; }
  });
}

document.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-toggle-password]');
  if (!toggle) return;
  const input = toggle.parentElement.querySelector('input');
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  toggle.textContent = reveal ? 'Ocultar' : 'Ver';
  toggle.setAttribute('aria-label', reveal ? 'Ocultar senha' : 'Mostrar senha');
});

if (new URLSearchParams(location.search).get('criada') === '1') {
  const note = document.createElement('p'); note.className = 'feedback success'; note.setAttribute('role', 'status'); note.setAttribute('aria-live', 'polite'); note.textContent = 'Conta criada. Entre para começar.';
  loginForm?.querySelector('.auth-switch')?.before(note);
}
