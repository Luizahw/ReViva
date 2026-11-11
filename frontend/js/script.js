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
  $('#adminSettingsLink').hidden = data.usuario.tipo_usuario !== 'administrador';
  $('#adminSettingsMobile').hidden = data.usuario.tipo_usuario !== 'administrador';
  $('#adminAdminMobile').hidden = data.usuario.tipo_usuario !== 'administrador';
  $('#adminPanelLink').hidden = data.usuario.tipo_usuario !== 'administrador';
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
  $('#impactLifetime').textContent = formatNumber(summary.pontos_historicos);
  $('#homeCount').textContent = count;
  $('#homeWeight').textContent = weight;
  $('#homeLifetimePoints').textContent = formatNumber(summary.pontos_historicos);
  $('#historyScore').textContent = formatNumber(summary.pontos_historicos);
  renderRecent(data.atividades_recentes);
  renderImpactCharts(data.evolucao_mensal || [], data.materiais || []);
}

function renderImpactCharts(monthly, materials) {
  const colors = ['#527b32', '#9acb43', '#1f552e', '#c1d983', '#729b48', '#b6e53d'];
  const bar = $('#monthlyChart');
  const bctx = bar.getContext('2d');
  const bwidth = Math.max(bar.clientWidth, 260); const bheight = 210;
  bar.width = bwidth * devicePixelRatio; bar.height = bheight * devicePixelRatio;
  bctx.scale(devicePixelRatio, devicePixelRatio); bctx.clearRect(0, 0, bwidth, bheight);
  const series = monthly.slice(-12); const max = Math.max(1, ...series.map((item) => Number(item.quilos)));
  const gap = 10; const slot = (bwidth - 36) / Math.max(series.length, 1); const chartHeight = 155;
  bctx.font = '11px DM Sans, sans-serif'; bctx.textAlign = 'center';
  series.forEach((item, i) => {
    const height = Number(item.quilos) / max * chartHeight; const x = 18 + i * slot + gap / 2; const y = chartHeight - height + 8;
    bctx.fillStyle = colors[1]; bctx.beginPath(); bctx.roundRect(x, y, Math.max(5, slot - gap), height, 5); bctx.fill();
    bctx.fillStyle = '#69756b'; bctx.fillText(String(item.mes).slice(5), x + (slot - gap) / 2, 185);
  });
  const pie = $('#materialsChart'); const pctx = pie.getContext('2d'); const size = Math.min(pie.clientWidth || 260, 210);
  pie.width = size * devicePixelRatio; pie.height = size * devicePixelRatio; pctx.scale(devicePixelRatio, devicePixelRatio); pctx.clearRect(0, 0, size, size);
  const total = materials.reduce((sum, item) => sum + Number(item.quilos), 0); let angle = -Math.PI / 2;
  materials.forEach((item, i) => { const portion = total ? Number(item.quilos) / total * Math.PI * 2 : 0; pctx.beginPath(); pctx.moveTo(size / 2, size / 2); pctx.arc(size / 2, size / 2, size * .43, angle, angle + portion); pctx.closePath(); pctx.fillStyle = colors[i % colors.length]; pctx.fill(); angle += portion; });
  pctx.beginPath(); pctx.arc(size / 2, size / 2, size * .24, 0, Math.PI * 2); pctx.fillStyle = '#fff'; pctx.fill();
  const legend = $('#materialsLegend'); legend.replaceChildren();
  materials.forEach((item, i) => { const li = htmlElement('li', '', `${item.nome} — ${formatNumber(item.quilos, 2)} kg`); li.style.setProperty('--legend-color', colors[i % colors.length]); legend.append(li); });
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
    window.revivaPoints = data.pontos;
    renderPoints(data.pontos);
  } catch (error) {
    feedback.textContent = error.message;
    feedback.hidden = false;
  }
}

function renderAchievements(jornada) {
  $('#journeyLevel').textContent = jornada.nivel?.nome || 'Semente';
  $('#journeyLevelIcon').textContent = jornada.nivel?.icone === 'tree' ? '♧' : jornada.nivel?.icone === 'shield-leaf' ? '♢' : '♧';
  const lifetime = Number(jornada.estatisticas.pontos_historicos || 0);
  const next = jornada.proximo_nivel;
  $('#journeyProgress').textContent = next ? `${formatNumber(lifetime)} de ${formatNumber(next.pontos_minimos)} pontos históricos para ${next.nome}.` : `${formatNumber(lifetime)} pontos históricos. Nível máximo alcançado.`;
  const list = $('#achievementsList'); list.replaceChildren();
  jornada.conquistas.forEach((item) => {
    const card = htmlElement('article', `achievement-card${item.desbloqueada_em ? ' unlocked' : ''}`);
    card.append(htmlElement('span', 'achievement-icon', item.desbloqueada_em ? '✦' : '◇'));
    card.append(htmlElement('h2', '', item.nome)); card.append(htmlElement('p', '', item.descricao));
    card.append(htmlElement('small', '', item.desbloqueada_em ? `Desbloqueada em ${formatDate(item.desbloqueada_em)}` : 'Ainda bloqueada'));
    list.append(card);
  });
}

async function loadJourney() {
  const data = await api('/jornada');
  renderAchievements(data.jornada);
}

async function loadRanking() {
  const data = await api(`/jornada/ranking?periodo=${encodeURIComponent($('#rankingPeriod').value)}`);
  const body = $('#rankingBody'); body.replaceChildren();
  data.ranking.forEach((item) => {
    const row = document.createElement('tr');
    [item.posicao, item.nome, formatNumber(item.pontos)].forEach((value) => row.append(htmlElement('td', '', value)));
    if (item.e_minha) row.className = 'current-user-row';
    body.append(row);
  });
  if (!data.ranking.length) { const row = document.createElement('tr'); row.append(htmlElement('td', '', 'Ainda não há pontos registrados neste período.')); row.firstChild.colSpan = 3; body.append(row); }
  $('#myRankingPosition').textContent = data.minha_posicao ? `Sua posição neste período: ${data.minha_posicao}º` : 'Você ainda não tem pontos neste período.';
}

function renderRedemptions(records, target = $('#redemptionsBody')) {
  target.replaceChildren();
  records.forEach((item) => {
    const row = document.createElement('tr');
    [item.recompensa, item.parceiro, formatNumber(item.pontos_gastos), formatDate(item.solicitado_em), item.status].forEach((value) => row.append(htmlElement('td', '', value)));
    target.append(row);
  });
  if (!records.length) { const row = document.createElement('tr'); const cell = htmlElement('td', '', 'Nenhum resgate registrado.'); cell.colSpan = 5; row.append(cell); target.append(row); }
}

async function loadRewards() {
  const [catalog, history] = await Promise.all([api('/recompensas'), api('/recompensas/resgates')]);
  const list = $('#rewardsList'); list.replaceChildren();
  if (!catalog.recompensas.length) list.append(htmlElement('div', 'empty-state', 'Nenhuma recompensa ativa com estoque disponível.'));
  catalog.recompensas.forEach((item) => {
    const card = htmlElement('article', 'reward-card');
    if (item.imagem_url) { const image = document.createElement('img'); image.src = item.imagem_url; image.alt = ''; image.loading = 'lazy'; card.append(image); }
    else card.append(htmlElement('span', 'feature-icon reward-placeholder', '♧'));
    card.append(htmlElement('p', 'eyebrow', item.parceiro)); card.append(htmlElement('h2', '', item.nome)); card.append(htmlElement('p', '', item.descricao));
    card.append(htmlElement('strong', 'reward-cost', `${formatNumber(item.pontos_necessarios)} pontos`));
    const button = htmlElement('button', 'button button-primary', 'Resgatar'); button.type = 'button'; button.dataset.redeemId = item.id_recompensa; button.dataset.redeemName = item.nome; card.append(button); list.append(card);
  });
  renderRedemptions(history.resgates);
}

async function loadDonations() {
  const data = await api('/doacoes'); const list = $('#donationsList'); list.replaceChildren();
  if (!data.doacoes.length) list.append(htmlElement('div', 'empty-state', 'Você ainda não cadastrou doações.'));
  data.doacoes.forEach((item) => {
    const card = htmlElement('article', 'history-card'); const details = document.createElement('div');
    details.append(htmlElement('h2', '', item.equipamento)); details.append(htmlElement('p', '', `${item.categoria} · ${item.cidade} · ${item.estado_conservacao}`));
    details.append(htmlElement('p', '', `${item.status.replace('_', ' ')} · ${formatDate(item.criado_em)}`));
    if (item.observacao_admin) details.append(htmlElement('p', '', `Observação: ${item.observacao_admin}`));
    card.append(details); list.append(card);
  });
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

function renderUsers(users) {
  const body = $('#usersTableBody');
  body.replaceChildren();
  if (!users.length) {
    const row = document.createElement('tr');
    const cell = htmlElement('td', 'users-empty', 'Nenhum usuário cadastrado.');
    cell.colSpan = 6;
    row.append(cell);
    body.append(row);
    return;
  }
  users.forEach((user) => {
    const row = document.createElement('tr');
    [user.nome, user.email, user.tipo_usuario === 'administrador' ? 'Administrador' : 'Usuário comum', formatNumber(user.pontos), formatDate(user.data_cadastro)].forEach((value) => row.append(htmlElement('td', '', value)));
    const actionCell = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'user-role-select';
    select.setAttribute('aria-label', `Nível de acesso de ${user.nome}`);
    select.dataset.userId = user.id_usuario;
    select.dataset.currentRole = user.tipo_usuario;
    select.add(new Option('Usuário comum', 'comum'));
    select.add(new Option('Administrador', 'administrador'));
    select.value = user.tipo_usuario;
    if (Number(user.id_usuario) === Number(readUser()?.id_usuario)) {
      select.disabled = true;
      select.title = 'Não é permitido alterar o próprio nível de acesso.';
    }
    actionCell.append(select);
    row.append(actionCell);
    body.append(row);
  });
}

async function loadUsers() {
  const data = await api('/usuarios');
  renderUsers(data.usuarios);
}

async function updateUserRole(select) {
  const previousRole = select.dataset.currentRole;
  const newRole = select.value;
  if (newRole === previousRole) return;
  const roleName = newRole === 'administrador' ? 'administrador' : 'usuário comum';
  if (!window.confirm(`Confirma alterar o nível desta conta para ${roleName}? O usuário deverá entrar novamente para aplicar as novas permissões.`)) {
    select.value = previousRole;
    return;
  }
  select.disabled = true;
  try {
    const result = await api(`/usuarios/${encodeURIComponent(select.dataset.userId)}/tipo`, {
      method: 'PATCH', body: JSON.stringify({ tipo_usuario: newRole })
    });
    message($('#usersFeedback'), result.mensagem, 'success');
    await loadUsers();
  } catch (error) {
    select.value = previousRole;
    select.disabled = false;
    message($('#usersFeedback'), error.message, 'error');
  }
}

async function submitDonation(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  try {
    const result = await api('/doacoes', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
    form.reset(); message($('#donationFeedback'), result.mensagem, 'success'); await loadDonations();
  } catch (error) { message($('#donationFeedback'), error.message, 'error'); }
}

async function redeemReward(id, name) {
  if (!window.confirm(`Confirma resgatar "${name}"? Os pontos serão descontados do seu saldo.`)) return;
  try { const result = await api(`/recompensas/${encodeURIComponent(id)}/resgatar`, { method: 'POST', body: '{}' }); message($('#rewardsFeedback'), result.mensagem, 'success'); await Promise.all([loadRewards(), loadProfile(), loadSummary()]); }
  catch (error) { message($('#rewardsFeedback'), error.message, 'error'); }
}

function renderAdminList(target, items, kind) {
  const list = $(target); list.replaceChildren();
  items.forEach((item) => {
    const li = htmlElement('li', 'admin-list-item'); const label = htmlElement('span', '', item.nome);
    const edit = htmlElement('button', 'text-button', 'Editar'); edit.type = 'button'; edit.dataset.adminAction = 'edit'; edit.dataset.adminKind = kind; edit.dataset.adminId = item.id_material || item.id_ponto || item.id_recompensa;
    const remove = htmlElement('button', 'text-button danger', 'Excluir'); remove.type = 'button'; remove.dataset.adminAction = 'delete'; remove.dataset.adminKind = kind; remove.dataset.adminId = item.id_material || item.id_ponto || item.id_recompensa;
    li.append(label, edit, remove); list.append(li);
  });
  if (!items.length) list.append(htmlElement('li', 'admin-list-item', 'Nenhum item cadastrado.'));
}

function renderAdminRequests(target, items, kind) {
  const list = $(target); list.replaceChildren();
  items.forEach((item) => {
    const card = htmlElement('article', 'history-card'); const info = document.createElement('div');
    info.append(htmlElement('h2', '', kind === 'donation' ? `${item.equipamento} — ${item.nome_usuario}` : `${item.recompensa} — ${item.nome_usuario}`));
    info.append(htmlElement('p', '', kind === 'donation' ? `${item.categoria} · ${item.cidade} · ${item.status}` : `${item.parceiro} · ${formatNumber(item.pontos_gastos)} pontos · ${item.status}`));
    if (kind === 'donation') info.append(htmlElement('p', '', `${item.contato_nome} · ${item.contato_email}${item.contato_telefone ? ` · ${item.contato_telefone}` : ''}`));
    const controls = document.createElement('div'); controls.className = 'history-actions';
    const select = document.createElement('select'); select.className = 'admin-status-select'; select.dataset.adminKind = kind; select.dataset.adminId = kind === 'donation' ? item.id_doacao : item.id_resgate;
    const states = kind === 'donation' ? [['pendente','Pendente'],['em_analise','Em análise'],['aprovada','Aprovada'],['rejeitada','Rejeitada'],['concluida','Concluída']] : [['concluido','Concluído'],['cancelado','Cancelar e devolver pontos']];
    states.forEach(([value,label]) => select.add(new Option(label,value)));
    if (kind === 'donation') select.value = item.status;
    else select.disabled = item.status !== 'pendente';
    controls.append(select);
    if (kind === 'donation') { const note = document.createElement('input'); note.className = 'admin-note-input'; note.placeholder = 'Observação ao usuário'; note.value = item.observacao_admin || ''; note.dataset.adminId = item.id_doacao; controls.append(note); }
    const save = htmlElement('button', 'button button-quiet', 'Atualizar'); save.type = 'button'; save.dataset.adminAction = 'status'; save.dataset.adminKind = kind; save.dataset.adminId = select.dataset.adminId; controls.append(save);
    card.append(info, controls); list.append(card);
  });
  if (!items.length) list.append(htmlElement('div', 'empty-state', 'Nenhum registro para analisar.'));
}

async function loadAdminPanel() {
  const [stats, materials, points, rewards, donations, redemptions] = await Promise.all([
    api('/admin/indicadores'), api('/materiais'), api('/pontos'), api('/admin/recompensas'), api('/admin/doacoes'), api('/admin/resgates')
  ]);
  const metrics = $('#adminMetrics'); metrics.replaceChildren();
  [['Usuários',stats.indicadores.usuarios],['Reciclagens',stats.indicadores.reciclagens],['Quilos',`${formatNumber(stats.indicadores.quilos,2)} kg`],['Pontos gerados',stats.indicadores.pontos_gerados],['Resgates',stats.indicadores.recompensas_resgatadas],['Doações',stats.indicadores.doacoes]].forEach(([label,value])=>{const card=htmlElement('article','impact-card');card.append(htmlElement('small','',label),htmlElement('strong','',formatNumber(value)));metrics.append(card);});
  renderAdminList('#adminMaterials', materials.materiais, 'material'); renderAdminList('#adminPoints', points.pontos, 'point'); renderAdminList('#adminRewards', rewards.recompensas, 'reward');
  renderAdminRequests('#adminDonations', donations.doacoes, 'donation'); renderAdminRequests('#adminRedemptions', redemptions.resgates, 'redemption');
  window.revivaAdminData = { materials: materials.materiais, points: points.pontos, rewards: rewards.recompensas };
}

async function saveAdminForm(event, kind) {
  event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const fieldId = { material: 'id_material', point: 'id_ponto', reward: 'id_recompensa' }[kind];
  const id = values[fieldId]; delete values[fieldId];
  if (kind === 'reward') values.ativa = form.elements.ativa.checked;
  const path = kind === 'material' ? '/admin/materiais' : kind === 'point' ? '/admin/pontos' : '/admin/recompensas';
  try {
    const result = await api(id ? `${path}/${encodeURIComponent(id)}` : path, { method: id ? 'PUT' : 'POST', body: JSON.stringify(values) });
    form.reset(); form.elements[fieldId].value = ''; if (kind === 'reward') form.elements.ativa.checked = true;
    message($('#adminFeedback'), result.mensagem, 'success'); await loadAdminPanel();
  } catch (error) { message($('#adminFeedback'), error.message, 'error'); }
}

async function handleAdminAction(button) {
  const id = button.dataset.adminId; const kind = button.dataset.adminKind;
  if (button.dataset.adminAction === 'edit') {
    const collection = { material: 'materials', point: 'points', reward: 'rewards' }[kind];
    const item = window.revivaAdminData[collection].find((entry) => Number(entry.id_material || entry.id_ponto || entry.id_recompensa) === Number(id));
    const form = $(`#${kind === 'material' ? 'materialForm' : kind === 'point' ? 'pointForm' : 'rewardForm'}`);
    Object.entries(item).forEach(([key,value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
    if (kind === 'reward') form.elements.ativa.checked = Boolean(item.ativa);
    form.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
  }
  if (button.dataset.adminAction === 'delete') {
    if (!window.confirm('Confirma excluir este item? Registros vinculados serão preservados pelo banco.')) return;
    const path = kind === 'material' ? 'materiais' : kind === 'point' ? 'pontos' : 'recompensas';
    try { const result = await api(`/admin/${path}/${encodeURIComponent(id)}`, { method: 'DELETE' }); message($('#adminFeedback'), result.mensagem, 'success'); await loadAdminPanel(); }
    catch (error) { message($('#adminFeedback'), error.message, 'error'); }
  }
  if (button.dataset.adminAction === 'status') {
    const select = $(`.admin-status-select[data-admin-id="${CSS.escape(id)}"]`);
    const path = kind === 'donation' ? `/admin/doacoes/${id}/status` : `/admin/resgates/${id}/status`;
    const body = { status: select.value };
    if (kind === 'donation') body.observacao_admin = $(`.admin-note-input[data-admin-id="${CSS.escape(id)}"]`).value;
    try { const result = await api(path, { method: 'PATCH', body: JSON.stringify(body) }); message($('#adminFeedback'), result.mensagem, 'success'); await loadAdminPanel(); }
    catch (error) { message($('#adminFeedback'), error.message, 'error'); }
  }
}

async function navigate(route) {
  const validRoutes = ['inicio', 'reciclar', 'pontos', 'historico', 'impacto', 'recompensas', 'doar', 'perfil', 'configuracoes', 'conquistas', 'ranking', 'admin'];
  if (!activeToken()) {
    if (route === 'cadastro') { showRegistration(); return; }
    showLogin();
    return;
  }
  if (route === 'login' || route === 'cadastro' || !validRoutes.includes(route)) route = 'inicio';
  showMember(['configuracoes', 'admin'].includes(route) ? 'inicio' : route);
  try {
    if (['inicio', 'perfil', 'configuracoes', 'admin'].includes(route)) await loadProfile();
    if (route === 'configuracoes') {
      await loadUsers();
      showMember('configuracoes');
    }
    if (route === 'admin') { await loadAdminPanel(); showMember('admin'); }
    if (['inicio', 'historico', 'impacto'].includes(route)) await loadSummary();
    if (route === 'historico') await loadHistory();
    if (route === 'pontos') await loadPoints();
    if (route === 'reciclar') await loadMaterialsAndPoints();
    if (route === 'conquistas') await loadJourney();
    if (route === 'ranking') await loadRanking();
    if (route === 'recompensas') await loadRewards();
    if (route === 'doar') await loadDonations();
  } catch (error) {
    if (['configuracoes', 'admin'].includes(route)) {
      if (!activeToken()) return;
      showMember('inicio');
      if (location.hash !== '#inicio') history.replaceState(null, '', '#inicio');
      window.alert(error.message);
    } else if (activeToken()) window.alert(error.message);
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

$('#donationForm').addEventListener('submit', submitDonation);
$('#materialForm').addEventListener('submit', (event) => saveAdminForm(event, 'material'));
$('#pointForm').addEventListener('submit', (event) => saveAdminForm(event, 'point'));
$('#rewardForm').addEventListener('submit', (event) => saveAdminForm(event, 'reward'));
$('#rankingPeriod').addEventListener('change', async () => {
  try { await loadRanking(); } catch (error) { $('#rankingFeedback').textContent = error.message; $('#rankingFeedback').hidden = false; }
});
$('#pointsSearch').addEventListener('input', (event) => {
  const search = event.currentTarget.value.trim().toLocaleLowerCase('pt-BR');
  renderPoints((window.revivaPoints || []).filter((point) => `${point.nome} ${point.cidade}`.toLocaleLowerCase('pt-BR').includes(search)));
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
    const desbloqueios = result.conquistas_desbloqueadas?.length || 0;
    message($('#recordFeedback'), `${result.mensagem}${desbloqueios ? ` Nova conquista desbloqueada${desbloqueios > 1 ? 's' : ''}!` : ''}`, 'success');
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
  const redeem = event.target.closest('[data-redeem-id]');
  if (redeem) redeemReward(redeem.dataset.redeemId, redeem.dataset.redeemName);
  const adminAction = event.target.closest('[data-admin-action]');
  if (adminAction) handleAdminAction(adminAction);
});
document.addEventListener('change', (event) => {
  if (event.target.matches('.user-role-select')) updateUserRole(event.target);
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
