import 'dotenv/config';
import assert from 'node:assert/strict';
import { pool } from '../database/conexao.js';

const api = process.env.API_URL || 'http://localhost:3300/api';
const identificador = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const emails = ['a', 'b', 'admin'].map((parte) => `reviva.entrega3.${parte}.${identificador}@example.test`);
const idsCriados = [];
async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${api}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
async function espera(status, path, options) {
  const result = await request(path, options);
  assert.equal(result.status, status, `${options?.method || 'GET'} ${path}: esperado ${status}, recebido ${result.status} (${result.data.mensagem || ''})`);
  return result.data;
}
async function criarConta(email) {
  await espera(201, '/usuarios/cadastro', { method: 'POST', body: { nome: 'Teste Entrega 3', email, senha: 'Entrega3#Teste', tipo_usuario: 'administrador' } });
  return (await espera(200, '/usuarios/login', { method: 'POST', body: { email, senha: 'Entrega3#Teste' } })).token;
}

try {
  const [materiais] = await pool.execute('SELECT id_material, pontos_por_kg FROM materiais ORDER BY id_material LIMIT 1');
  const [pontos] = await pool.execute('SELECT id_ponto FROM pontos_coleta ORDER BY id_ponto LIMIT 1');
  assert.ok(materiais.length && pontos.length, 'Execute sql/schema.sql para ter materiais e pontos de teste.');
  const comumA = await criarConta(emails[0]);
  const comumB = await criarConta(emails[1]);
  const perfilNovo = await espera(200, '/usuarios/me', { token: comumA });
  assert.equal(perfilNovo.usuario.tipo_usuario, 'comum', 'cadastro público não concede papel de administrador');
  await espera(403, '/usuarios/admin', { token: comumA });
  const administrador = await criarConta(emails[2]);
  await pool.execute("UPDATE usuarios SET tipo_usuario = 'administrador' WHERE email = ?", [emails[2]]);
  const tokenAdmin = (await espera(200, '/usuarios/login', { method: 'POST', body: { email: emails[2], senha: 'Entrega3#Teste' } })).token;
  const materialId = materiais[0].id_material; const pontoId = pontos[0].id_ponto;
  const payload = { id_material: materialId, id_ponto: pontoId, quantidade_kg: 1.25 };

  await espera(401, '/reciclagens');
  await espera(401, '/reciclagens', { method: 'POST', body: payload });
  await espera(400, '/reciclagens', { method: 'POST', token: comumA, body: {} });
  await espera(400, '/reciclagens', { method: 'POST', token: comumA, body: { ...payload, quantidade_kg: 'abc' } });
  await espera(400, '/reciclagens', { method: 'POST', token: comumA, body: { ...payload, quantidade_kg: 0 } });
  await espera(400, '/reciclagens', { method: 'POST', token: comumA, body: { ...payload, quantidade_kg: -1 } });
  await espera(400, '/reciclagens', { method: 'POST', token: comumA, body: { id_material: 99999999, id_ponto: pontoId, quantidade_kg: 1 } });
  await espera(400, '/reciclagens', { method: 'POST', token: comumA, body: { id_material: materialId, id_ponto: 99999999, quantidade_kg: 1 } });
  await espera(400, '/reciclagens/abc', { token: comumA });
  await espera(404, '/reciclagens/99999999', { token: comumA });

  const criado = await espera(201, '/reciclagens', { method: 'POST', token: comumA, body: { ...payload, id_usuario: 99999999, pontos_gerados: 999999 } });
  idsCriados.push(criado.id_reciclagem);
  const pontosIniciais = Math.round(1.25 * Number(materiais[0].pontos_por_kg));
  assert.equal(Number(criado.pontos_gerados), pontosIniciais, 'pontos do cadastro');
  const propria = await espera(200, '/reciclagens', { token: comumA });
  assert.equal(propria.reciclagens.length, 1, 'usuário lista seu registro');
  const perfilA = await espera(200, '/usuarios/me', { token: comumA });
  assert.equal(Number(propria.reciclagens[0].id_usuario), Number(perfilA.usuario.id_usuario), 'backend ignora proprietário enviado no corpo');
  await espera(200, `/reciclagens/${criado.id_reciclagem}`, { token: comumA });
  await espera(403, `/reciclagens/${criado.id_reciclagem}`, { token: comumB });
  await espera(403, `/reciclagens/${criado.id_reciclagem}`, { method: 'PUT', token: comumB, body: payload });
  await espera(403, `/reciclagens/${criado.id_reciclagem}`, { method: 'DELETE', token: comumB });

  const atualizado = await espera(200, `/reciclagens/${criado.id_reciclagem}`, { method: 'PUT', token: tokenAdmin, body: { ...payload, quantidade_kg: 2 } });
  const pontosNovos = Math.round(2 * Number(materiais[0].pontos_por_kg));
  assert.equal(Number(atualizado.pontos_gerados), pontosNovos, 'pontos recalculados na edição por admin');
  const [[saldoA]] = await pool.execute('SELECT pontos FROM usuarios WHERE email = ?', [emails[0]]);
  const [[saldoAdmin]] = await pool.execute('SELECT pontos FROM usuarios WHERE email = ?', [emails[2]]);
  assert.equal(Number(saldoA.pontos), pontosNovos, 'edição administrativa atualiza o proprietário');
  assert.equal(Number(saldoAdmin.pontos), 0, 'edição administrativa não altera saldo do administrador');
  const global = await espera(200, '/reciclagens', { token: tokenAdmin });
  assert.ok(global.reciclagens.some((item) => Number(item.id_reciclagem) === Number(criado.id_reciclagem)), 'admin lista registros globais');
  await espera(200, '/reciclagens/resumo', { token: comumA });
  await espera(400, '/reciclagens/0', { method: 'PUT', token: comumA, body: payload });
  await espera(404, '/reciclagens/99999999', { method: 'PUT', token: comumA, body: payload });

  await espera(200, `/reciclagens/${criado.id_reciclagem}`, { method: 'PUT', token: comumA, body: { ...payload, quantidade_kg: 3 } });
  const [[saldoEditado]] = await pool.execute('SELECT pontos FROM usuarios WHERE email = ?', [emails[0]]);
  assert.equal(Number(saldoEditado.pontos), Math.round(3 * Number(materiais[0].pontos_por_kg)), 'saldo acompanha diferença da edição');
  await espera(200, `/reciclagens/${criado.id_reciclagem}`, { method: 'DELETE', token: comumA });
  const [[saldoFinal]] = await pool.execute('SELECT pontos FROM usuarios WHERE email = ?', [emails[0]]);
  assert.equal(Number(saldoFinal.pontos), 0, 'exclusão desconta pontos do proprietário');
  await espera(404, `/reciclagens/${criado.id_reciclagem}`, { token: comumA });
  await espera(404, `/reciclagens/99999999`, { method: 'DELETE', token: comumA });
  await espera(200, '/materiais'); await espera(200, '/pontos');
  console.log('OK: autenticação, validações, CRUD, propriedade, administrador e pontuação.');
} finally {
  const [usuarios] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email IN (?, ?, ?)', emails);
  const idsUsuarios = usuarios.map((usuario) => usuario.id_usuario);
  if (idsUsuarios.length) {
    const placeholders = idsUsuarios.map(() => '?').join(',');
    await pool.execute(`DELETE FROM reciclagens WHERE id_usuario IN (${placeholders})`, idsUsuarios);
    await pool.execute(`DELETE FROM usuarios WHERE id_usuario IN (${placeholders})`, idsUsuarios);
  }
  await pool.end();
}
