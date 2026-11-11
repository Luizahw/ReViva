const API = 'http://localhost:3300/api';
const tokenKey = 'reviva_token';
const userKey = 'reviva_usuario';
const tokenAtual = () => localStorage.getItem(tokenKey);
const usuarioAtual = () => { try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch { return null; } };
const $ = (seletor) => document.querySelector(seletor);
const feedback = $('#feedback');

async function requisicao(caminho, opcoes = {}) {
  const headers = { ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}), ...(tokenAtual() ? { Authorization: `Bearer ${tokenAtual()}` } : {}), ...opcoes.headers };
  let resposta;
  try { resposta = await fetch(`${API}${caminho}`, { ...opcoes, headers }); }
  catch { throw new Error('Não foi possível acessar a API. Confirme se o servidor está ativo em localhost:3300.'); }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível concluir a operação.');
  return dados;
}
function avisar(mensagem, erro = false) { feedback.textContent = mensagem; feedback.classList.toggle('error', erro); feedback.hidden = !mensagem; }
function alternarAutenticacao(autenticado) {
  $('#acesso').hidden = autenticado;
  $('#logoutButton').hidden = !autenticado;
  $('#welcomeText').textContent = autenticado ? `Olá, ${usuarioAtual()?.nome || 'pessoa usuária'}! Seu histórico está pronto.` : 'Entre ou crie sua conta para começar.';
  if (!autenticado) { $('#recordsBody').replaceChildren(); $('#emptyState').textContent = 'Entre para consultar suas reciclagens.'; $('#emptyState').hidden = false; $('#scoreValue').textContent = '—'; $('#countValue').textContent = '—'; $('#weightValue').textContent = '—'; $('#recentList').replaceChildren(); }
}
function option(el, valor, texto) { const item = document.createElement('option'); item.value = valor; item.textContent = texto; el.append(item); }
async function carregarCatalogos() {
  const [materiaisDados, pontosDados] = await Promise.all([requisicao('/materiais'), requisicao('/pontos')]);
  const materialSelect = $('#recordForm [name="id_material"]'); const pontoSelect = $('#recordForm [name="id_ponto"]');
  materialSelect.replaceChildren(); pontoSelect.replaceChildren();
  option(materialSelect, '', 'Selecione um material'); option(pontoSelect, '', 'Selecione um ponto de coleta');
  materiaisDados.materiais.forEach((item) => option(materialSelect, item.id_material, item.nome));
  pontosDados.pontos.forEach((item) => option(pontoSelect, item.id_ponto, `${item.nome} — ${item.cidade}`));
  const materiaisUl = $('#materialsList'); materiaisUl.replaceChildren();
  materiaisDados.materiais.forEach((item) => { const li = document.createElement('li'); li.textContent = `${item.nome} · ${item.pontos_por_kg} pontos/kg`; materiaisUl.append(li); });
  if (!materiaisDados.materiais.length) { const li = document.createElement('li'); li.textContent = 'Nenhum material cadastrado.'; materiaisUl.append(li); }
  const pontosUl = $('#pointsList'); pontosUl.replaceChildren();
  pontosDados.pontos.forEach((item) => { const li = document.createElement('li'); const strong = document.createElement('strong'); strong.textContent = item.nome; const small = document.createElement('small'); small.textContent = `${item.endereco} · ${item.cidade}`; li.append(strong, small); pontosUl.append(li); });
  if (!pontosDados.pontos.length) { const li = document.createElement('li'); li.textContent = 'Nenhum ponto de coleta cadastrado.'; pontosUl.append(li); }
}
function dataFormatada(valor) { const data = new Date(valor); return Number.isNaN(data.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR').format(data); }
function celula(tr, texto) { const td = document.createElement('td'); td.textContent = texto; tr.append(td); return td; }
async function carregarReciclagens() {
  const dados = await requisicao('/reciclagens'); const corpo = $('#recordsBody'); corpo.replaceChildren();
  $('#emptyState').hidden = dados.reciclagens.length > 0;
  $('#emptyState').textContent = dados.reciclagens.length ? '' : 'Você ainda não registrou reciclagens.';
  for (const registro of dados.reciclagens) {
    const linha = document.createElement('tr'); celula(linha, registro.nome_material); celula(linha, `${Number(registro.quantidade_kg).toLocaleString('pt-BR')} kg`);
    celula(linha, `${registro.nome_ponto} · ${registro.cidade}`); celula(linha, String(registro.pontos_gerados)); celula(linha, dataFormatada(registro.data_reciclagem));
    const actions = document.createElement('td'); actions.className = 'row-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'text-button'; edit.textContent = 'Editar'; edit.addEventListener('click', () => editarRegistro(registro.id_reciclagem));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'text-button danger'; remove.textContent = 'Excluir'; remove.addEventListener('click', () => excluirRegistro(registro.id_reciclagem));
    actions.append(edit, remove); linha.append(actions); corpo.append(linha);
  }
}
async function carregarResumo() {
  const dados = await requisicao('/reciclagens/resumo'); const resumo = dados.resumo;
  $('#scoreValue').textContent = Number(resumo.pontos).toLocaleString('pt-BR'); $('#countValue').textContent = Number(resumo.total_reciclagens).toLocaleString('pt-BR'); $('#weightValue').textContent = `${Number(resumo.quilos_reciclados).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
  const lista = $('#recentList'); lista.replaceChildren();
  dados.atividades_recentes.forEach((item) => { const li = document.createElement('li'); li.textContent = `${item.nome_material} · ${Number(item.quantidade_kg).toLocaleString('pt-BR')} kg · ${dataFormatada(item.data_reciclagem)}`; lista.append(li); });
  if (!dados.atividades_recentes.length) { const li = document.createElement('li'); li.textContent = 'Suas atividades recentes aparecerão aqui.'; lista.append(li); }
}
async function atualizarPainel() { await Promise.all([carregarReciclagens(), carregarResumo()]); }
async function editarRegistro(id) {
  try {
    const { reciclagem } = await requisicao(`/reciclagens/${id}`); const form = $('#recordForm');
    form.elements.id_reciclagem.value = reciclagem.id_reciclagem; form.elements.id_material.value = reciclagem.id_material;
    form.elements.id_ponto.value = reciclagem.id_ponto; form.elements.quantidade_kg.value = Number(reciclagem.quantidade_kg);
    $('#formTitle').textContent = 'Editar reciclagem'; $('#saveButton').textContent = 'Salvar alterações'; form.hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) { avisar(error.message, true); }
}
async function excluirRegistro(id) {
  if (!window.confirm('Deseja excluir esta reciclagem? Os pontos correspondentes serão descontados.')) return;
  try { const dados = await requisicao(`/reciclagens/${id}`, { method: 'DELETE' }); avisar(dados.mensagem); await atualizarPainel(); }
  catch (error) { avisar(error.message, true); }
}
async function autenticarFormulario(form, rota) {
  const dadosFormulario = Object.fromEntries(new FormData(form).entries());
  try {
    const dados = await requisicao(rota, { method: 'POST', body: JSON.stringify(dadosFormulario) });
    if (rota.endsWith('/cadastro')) { avisar('Conta criada. Agora entre com seu e-mail e senha.'); $('#loginForm [name="email"]').value = dadosFormulario.email; $('#loginForm [name="senha"]').focus(); form.reset(); return; }
    localStorage.setItem(tokenKey, dados.token); localStorage.setItem(userKey, JSON.stringify(dados.usuario)); form.reset(); alternarAutenticacao(true); avisar(`Bem-vinda, ${dados.usuario.nome}!`); await atualizarPainel();
  } catch (error) { avisar(error.message, true); }
}
$('#loginForm').addEventListener('submit', (event) => { event.preventDefault(); autenticarFormulario(event.currentTarget, '/usuarios/login'); });
$('#registerForm').addEventListener('submit', (event) => { event.preventDefault(); autenticarFormulario(event.currentTarget, '/usuarios/cadastro'); });
$('#logoutButton').addEventListener('click', () => { localStorage.removeItem(tokenKey); localStorage.removeItem(userKey); $('#recordForm').hidden = true; alternarAutenticacao(false); avisar('Você saiu da sua conta.'); });
$('#newRecordButton').addEventListener('click', () => { if (!tokenAtual()) { avisar('Entre na sua conta para registrar uma reciclagem.', true); $('#acesso').scrollIntoView({ behavior: 'smooth' }); return; } $('#recordForm').reset(); $('#recordForm').elements.id_reciclagem.value = ''; $('#formTitle').textContent = 'Registrar reciclagem'; $('#saveButton').textContent = 'Salvar reciclagem'; $('#recordForm').hidden = false; $('#recordForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
$('#cancelButton').addEventListener('click', () => { $('#recordForm').reset(); $('#recordForm').hidden = true; });
$('#recordForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const id = form.elements.id_reciclagem.value;
  const body = { id_material: form.elements.id_material.value, id_ponto: form.elements.id_ponto.value, quantidade_kg: form.elements.quantidade_kg.value };
  try { const dados = await requisicao(id ? `/reciclagens/${id}` : '/reciclagens', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) }); form.reset(); form.hidden = true; avisar(dados.mensagem); await atualizarPainel(); }
  catch (error) { avisar(error.message, true); }
});

(async function iniciar() {
  alternarAutenticacao(Boolean(tokenAtual()));
  try { await carregarCatalogos(); } catch (error) { avisar(error.message, true); }
  if (tokenAtual()) { try { await atualizarPainel(); } catch (error) { avisar(error.message, true); } }
})();
