const API = 'http://localhost:3300/api';
const TOKEN_KEY = 'reviva_token';
const USER_KEY = 'reviva_usuario';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function readUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
}
function saveUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
function activeToken() { return localStorage.getItem(TOKEN_KEY); }

async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(activeToken() ? { Authorization: `Bearer ${activeToken()}` } : {}), ...options.headers };
  let response;
  try { response = await fetch(`${API}${path}`, { ...options, headers }); }
  catch { throw new Error('Não foi possível conectar à API. Verifique se o servidor está ativo em localhost:3300.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && activeToken()) {
      clearSession();
      showLogin();
    }
    throw new Error(data.mensagem || 'Não foi possível concluir a solicitação.');
  }
  return data;
}

function showLogin() {
  $('#memberApp').hidden = true;
  $('#loginScreen').hidden = false;
  $('#registerScreen').hidden = true;
  if (location.hash !== '#login') history.replaceState(null, '', '#login');
}
function showRegistration() {
  $('#memberApp').hidden = true;
  $('#loginScreen').hidden = true;
  $('#registerScreen').hidden = false;
}
function showMember(route) {
  $('#loginScreen').hidden = true;
  $('#registerScreen').hidden = true;
  $('#memberApp').hidden = false;
  const views = $$('.view');
  views.forEach((view) => { view.hidden = view.dataset.view !== route; });
  $$('.desktop-nav [data-route], .mobile-nav [data-route]').forEach((link) => {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
function message(element, text, type = 'error') {
  element.textContent = text;
  element.className = `${element.classList.contains('form-feedback') ? 'form-feedback' : element.classList.contains('page-feedback') ? 'page-feedback' : 'auth-error'} ${type}`;
  element.hidden = !text;
}
function showLoginError(text = '', type = 'error') { message($('#loginError'), text, type); }
function showRegisterError(text = '') { message($('#registerError'), text); }
function htmlElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}
function formatNumber(value, decimals = 0) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: decimals });
}

async function loadProfile() {
  const data = await api('/usuarios/perfil');
  saveUser(data.usuario);
  $('#userName').textContent = data.usuario.nome.split(' ')[0];
  $('#profileName').textContent = data.usuario.nome;
  $('#profileEmail').textContent = data.usuario.email;
  $('#profileType').textContent = data.usuario.tipo_usuario === 'administrador' ? 'Administrador' : 'Pessoa usuária';
  $('#profileDate').textContent = formatDate(data.usuario.data_cadastro);
  return data.usuario;
}

async function loadSummary() {
  const data = await api('/reciclagens/resumo');
  const summary = data.resumo;
  const score = formatNumber(summary.pontos);
  const count = formatNumber(summary.total_reciclagens);
  const weight = `${formatNumber(summary.quilos_reciclados, 2)} kg`;
  $('#scoreValue').textContent = score;
  $('#countValue').textContent = count;
  $('#weightValue').textContent = weight;
  $('#historyScore').textContent = score;
  $('#impactScore').textContent = score;
  $('#impactCount').textContent = count;
  $('#impactWeight').textContent = weight;
  renderRecent(data.atividades_recentes);
}

function renderRecent(records) {
  const list = $('#recentList');
  list.replaceChildren();
  if (!records.length) {
    list.append(htmlElement('li', '', 'Suas atividades recentes aparecerão aqui.'));
    return;
  }
  records.forEach((record) => {
    list.append(htmlElement('li', '', `${record.nome_material} · ${formatNumber(record.quantidade_kg, 2)} kg · ${formatDate(record.data_reciclagem)}`));
  });
}

function renderHistory(records) {
  const list = $('#recordsList');
  list.replaceChildren();
  if (!records.length) {
    list.append(htmlElement('div', 'empty-state', 'Você ainda não registrou reciclagens.'));
    return;
  }
  records.forEach((record) => {
    const card = htmlElement('article', 'history-card');
    const details = document.createElement('div');
    details.append(htmlElement('h2', '', record.nome_material));
    details.append(htmlElement('p', '', `${formatNumber(record.quantidade_kg, 2)} kg · ${record.nome_ponto} · ${record.cidade}`));
    details.append(htmlElement('p', '', formatDate(record.data_reciclagem)));
    const points = htmlElement('div', 'history-points');
    points.append(document.createTextNode(`${formatNumber(record.pontos_gerados)} pts`));
    points.append(htmlElement('small', '', 'recebidos'));
    const actions = htmlElement('div', 'history-actions');
    const edit = htmlElement('button', 'text-button', 'Editar');
    edit.type = 'button';
    edit.addEventListener('click', () => editRecord(record.id_reciclagem));
    const remove = htmlElement('button', 'text-button danger', 'Excluir');
    remove.type = 'button';
    remove.addEventListener('click', () => deleteRecord(record.id_reciclagem));
    actions.append(edit, remove);
    card.append(details, points, actions);
    list.append(card);
  });
}

async function loadHistory() {
  const data = await api('/reciclagens');
  renderHistory(data.reciclagens);
}

async function loadMaterialsAndPoints() {
  const [materialData, pointData] = await Promise.all([api('/materiais'), api('/pontos')]);
  const materialSelect = $('#recordForm [name="id_material"]');
  const pointSelect = $('#recordForm [name="id_ponto"]');
  const selectedMaterial = materialSelect.value;
  const selectedPoint = pointSelect.value;
  materialSelect.replaceChildren();
  pointSelect.replaceChildren();
  materialSelect.add(new Option('Selecione um material', ''));
  pointSelect.add(new Option('Selecione um ponto de coleta', ''));
  materialData.materiais.forEach((item) => materialSelect.add(new Option(item.nome, item.id_material)));
  pointData.pontos.forEach((item) => pointSelect.add(new Option(`${item.nome} — ${item.cidade}`, item.id_ponto)));
  if (selectedMaterial) materialSelect.value = selectedMaterial;
  if (selectedPoint) pointSelect.value = selectedPoint;
}

function renderPoints(points) {
  const list = $('#pointsList');
  list.replaceChildren();
  if (!points.length) {
    list.append(htmlElement('div', 'empty-state', 'Nenhum ponto de coleta foi cadastrado ainda.'));
    return;
  }
  points.forEach((point) => {
    const card = htmlElement('article', 'point-card');
    card.append(htmlElement('span', 'point-icon', '⌖'));
    card.append(htmlElement('h2', '', point.nome));
    card.append(htmlElement('p', 'point-address', point.endereco));
    card.append(htmlElement('p', '', point.cidade));
    if (point.descricao) card.append(htmlElement('p', '', point.descricao));
    const query = encodeURIComponent([point.nome, point.endereco, point.cidade].filter(Boolean).join(', '));
    const map = htmlElement('a', 'map-link', 'Abrir endereço no Google Maps ↗');
    map.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    map.target = '_blank';
    map.rel = 'noopener noreferrer';
    card.append(map);
    list.append(card);
  });
}

async function loadPoints() {
  const feedback = $('#pointsFeedback');
  feedback.hidden = true;
  try {
    const data = await api('/pontos');
    renderPoints(data.pontos);
  } catch (error) {
    feedback.textContent = error.message;
    feedback.hidden = false;
  }
}

async function editRecord(id) {
  try {
    await loadMaterialsAndPoints();
    const { reciclagem } = await api(`/reciclagens/${id}`);
    const form = $('#recordForm');
    form.elements.id_reciclagem.value = reciclagem.id_reciclagem;
    form.elements.id_material.value = reciclagem.id_material;
    form.elements.id_ponto.value = reciclagem.id_ponto;
    form.elements.quantidade_kg.value = Number(reciclagem.quantidade_kg);
    $('#formTitle').textContent = 'Editar reciclagem';
    $('#saveButton').textContent = 'Salvar alterações';
    $('#cancelButton').hidden = false;
    message($('#recordFeedback'), '', 'success');
    location.hash = '#reciclar';
  } catch (error) {
    location.hash = '#historico';
    message($('#historyFeedback'), error.message, 'error');
  }
}

async function deleteRecord(id) {
  if (!window.confirm('Deseja excluir esta reciclagem? Os pontos correspondentes serão descontados.')) return;
  try {
    const result = await api(`/reciclagens/${id}`, { method: 'DELETE' });
    message($('#historyFeedback'), result.mensagem, 'success');
    await Promise.all([loadHistory(), loadSummary()]);
    location.hash = '#historico';
  } catch (error) {
    location.hash = '#historico';
    message($('#historyFeedback'), error.message, 'error');
  }
}

async function navigate(route) {
  const validRoutes = ['inicio', 'reciclar', 'pontos', 'historico', 'impacto', 'recompensas', 'doar', 'perfil'];
  if (!activeToken()) {
    if (route === 'cadastro') { showRegistration(); return; }
    showLogin();
    return;
  }
  if (route === 'login' || route === 'cadastro' || !validRoutes.includes(route)) route = 'inicio';
  showMember(route);
  try {
    if (route === 'inicio' || route === 'perfil') await loadProfile();
    if (['inicio', 'historico', 'impacto'].includes(route)) await loadSummary();
    if (route === 'historico') await loadHistory();
    if (route === 'pontos') await loadPoints();
    if (route === 'reciclar') await loadMaterialsAndPoints();
  } catch (error) {
    if (activeToken()) window.alert(error.message);
  }
}

function routeFromHash() {
  const route = decodeURIComponent(location.hash.slice(1) || (activeToken() ? 'inicio' : 'login'));
  if (!activeToken()) {
    if (route === 'cadastro') showRegistration();
    else showLogin();
    return;
  }
  if (route === 'login' || route === 'cadastro') {
    history.replaceState(null, '', '#inicio');
    navigate('inicio');
    return;
  }
  navigate(route);
}

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  showLoginError('');
  if (!form.reportValidity()) return;
  const submit = $('button[type="submit"]', form);
  submit.disabled = true;
  submit.textContent = 'Entrando…';
  try {
    const body = Object.fromEntries(new FormData(form).entries());
    const data = await api('/usuarios/login', { method: 'POST', body: JSON.stringify(body) });
    localStorage.setItem(TOKEN_KEY, data.token);
    saveUser(data.usuario);
    location.hash = '#inicio';
  } catch (error) {
    showLoginError(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Entrar';
  }
});

$('#registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  showRegisterError('');
  if (!form.reportValidity()) return;
  const body = Object.fromEntries(new FormData(form).entries());
  if (body.senha !== body.confirmar_senha) { showRegisterError('As senhas não são iguais.'); return; }
  const submit = $('button[type="submit"]', form);
  submit.disabled = true;
  submit.textContent = 'Criando conta…';
  try {
    await api('/usuarios/cadastro', { method: 'POST', body: JSON.stringify({ nome: body.nome, email: body.email, senha: body.senha }) });
    $('#loginForm [name="email"]').value = body.email;
    form.reset();
    location.hash = '#login';
    showLoginError('Conta criada. Entre com seu e-mail e senha.', 'success');
  } catch (error) {
    showRegisterError(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Criar conta';
  }
});

$('#recordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const id = form.elements.id_reciclagem.value;
  const body = { id_material: form.elements.id_material.value, id_ponto: form.elements.id_ponto.value, quantidade_kg: form.elements.quantidade_kg.value };
  const submit = $('#saveButton');
  submit.disabled = true;
  submit.textContent = id ? 'Salvando…' : 'Registrando…';
  try {
    const result = await api(id ? `/reciclagens/${id}` : '/reciclagens', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    form.reset();
    form.elements.id_reciclagem.value = '';
    $('#formTitle').textContent = 'Registrar reciclagem';
    $('#cancelButton').hidden = true;
    message($('#recordFeedback'), result.mensagem, 'success');
    await Promise.all([loadSummary(), loadHistory()]);
  } catch (error) {
    message($('#recordFeedback'), error.message, 'error');
  } finally {
    submit.disabled = false;
    submit.textContent = form.elements.id_reciclagem.value ? 'Salvar alterações' : 'Salvar registro';
  }
});

$('#cancelButton').addEventListener('click', () => {
  const form = $('#recordForm');
  const wasEditing = Boolean(form.elements.id_reciclagem.value);
  form.reset();
  form.elements.id_reciclagem.value = '';
  $('#formTitle').textContent = 'Registrar reciclagem';
  $('#saveButton').textContent = 'Salvar registro';
  message($('#recordFeedback'), wasEditing ? 'Edição cancelada.' : '', 'success');
  if (!wasEditing) location.hash = '#inicio';
});

function logout() {
  clearSession();
  $('#loginForm').reset();
  showLoginError('');
  location.hash = '#login';
  showLogin();
}
$('#logoutButton').addEventListener('click', logout);
$('#profileLogout').addEventListener('click', logout);
document.addEventListener('click', (event) => {
  const routeLink = event.target.closest('[data-route]');
  if (routeLink) {
    event.preventDefault();
    location.hash = `#${routeLink.dataset.route}`;
  }
  const toggle = event.target.closest('[data-toggle-password]');
  if (toggle) {
    const input = toggle.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  }
});
window.addEventListener('hashchange', routeFromHash);

(async function initialize() {
  if (!activeToken()) { routeFromHash(); return; }
  try {
    await loadProfile();
    routeFromHash();
  } catch {
    clearSession();
    showLogin();
  }
})();
