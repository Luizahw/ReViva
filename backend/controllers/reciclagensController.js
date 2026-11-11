import { pool } from '../database/conexao.js';
import { desbloquearConquistas } from '../services/jornadaService.js';

const idValido = (valor) => /^\d+$/.test(String(valor)) && Number(valor) > 0 && Number.isSafeInteger(Number(valor));
const validarEntrada = (body) => {
  const id_material = Number(body?.id_material);
  const id_ponto = Number(body?.id_ponto);
  const quantidadeRecebida = body?.quantidade_kg;
  if (!['number', 'string'].includes(typeof quantidadeRecebida) || (typeof quantidadeRecebida === 'string' && !quantidadeRecebida.trim())) return null;
  const quantidade_kg = Number(quantidadeRecebida);
  if (!idValido(body?.id_material) || !idValido(body?.id_ponto) || !Number.isFinite(quantidade_kg) || quantidade_kg <= 0 || quantidade_kg > 99999999.99) return null;
  return { id_material, id_ponto, quantidade_kg };
};
const selectJoin = `SELECT r.id_reciclagem, r.id_usuario, u.nome AS nome_usuario, r.id_material, m.nome AS nome_material, r.id_ponto, p.nome AS nome_ponto, p.cidade, r.quantidade_kg, r.pontos_gerados, r.data_reciclagem FROM reciclagens r INNER JOIN materiais m ON m.id_material = r.id_material INNER JOIN pontos_coleta p ON p.id_ponto = r.id_ponto INNER JOIN usuarios u ON u.id_usuario = r.id_usuario`;
const permitido = (usuario, proprietario) => usuario.tipo_usuario === 'administrador' || Number(usuario.id_usuario) === Number(proprietario);

async function listar(req, res, next) {
  try {
    const admin = req.usuario.tipo_usuario === 'administrador';
    const [reciclagens] = admin
      ? await pool.execute(`${selectJoin} ORDER BY r.data_reciclagem DESC, r.id_reciclagem DESC`)
      : await pool.execute(`${selectJoin} WHERE r.id_usuario = ? ORDER BY r.data_reciclagem DESC, r.id_reciclagem DESC`, [req.usuario.id_usuario]);
    return res.status(200).json({ reciclagens });
  } catch (error) { return next(error); }
}

async function consultar(req, res, next) {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de reciclagem inválido.' });
    const [rows] = await pool.execute(`${selectJoin} WHERE r.id_reciclagem = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ mensagem: 'Reciclagem não encontrada.' });
    if (!permitido(req.usuario, rows[0].id_usuario)) return res.status(403).json({ mensagem: 'Você não tem permissão para consultar este registro.' });
    return res.status(200).json({ reciclagem: rows[0] });
  } catch (error) { return next(error); }
}

async function criar(req, res, next) {
  const dados = validarEntrada(req.body);
  if (!dados) return res.status(400).json({ mensagem: 'Informe material, ponto de coleta e quantidade numérica maior que zero.' });
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    const [[material]] = await conexao.execute('SELECT pontos_por_kg FROM materiais WHERE id_material = ? FOR UPDATE', [dados.id_material]);
    if (!material) { await conexao.rollback(); return res.status(400).json({ mensagem: 'Material não encontrado.' }); }
    const [[ponto]] = await conexao.execute('SELECT id_ponto FROM pontos_coleta WHERE id_ponto = ?', [dados.id_ponto]);
    if (!ponto) { await conexao.rollback(); return res.status(400).json({ mensagem: 'Ponto de coleta não encontrado.' }); }
    const pontos = Math.round(dados.quantidade_kg * Number(material.pontos_por_kg));
    const [resultado] = await conexao.execute('INSERT INTO reciclagens (id_usuario, id_material, id_ponto, quantidade_kg, pontos_gerados) VALUES (?, ?, ?, ?, ?)', [req.usuario.id_usuario, dados.id_material, dados.id_ponto, dados.quantidade_kg, pontos]);
    await conexao.execute('UPDATE usuarios SET pontos = pontos + ? WHERE id_usuario = ?', [pontos, req.usuario.id_usuario]);
    const conquistas = await desbloquearConquistas(conexao, req.usuario.id_usuario);
    await conexao.commit();
    return res.status(201).json({ mensagem: 'Reciclagem registrada.', id_reciclagem: resultado.insertId, pontos_gerados: pontos, conquistas_desbloqueadas: conquistas });
  } catch (error) { if (conexao) await conexao.rollback(); return next(error); } finally { conexao?.release(); }
}

async function atualizar(req, res, next) {
  if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de reciclagem inválido.' });
  const dados = validarEntrada(req.body);
  if (!dados) return res.status(400).json({ mensagem: 'Informe material, ponto de coleta e quantidade numérica maior que zero.' });
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    const [[anterior]] = await conexao.execute('SELECT id_usuario, pontos_gerados FROM reciclagens WHERE id_reciclagem = ? FOR UPDATE', [Number(req.params.id)]);
    if (!anterior) { await conexao.rollback(); return res.status(404).json({ mensagem: 'Reciclagem não encontrada.' }); }
    if (!permitido(req.usuario, anterior.id_usuario)) { await conexao.rollback(); return res.status(403).json({ mensagem: 'Você não tem permissão para editar este registro.' }); }
    const [[material]] = await conexao.execute('SELECT pontos_por_kg FROM materiais WHERE id_material = ?', [dados.id_material]);
    if (!material) { await conexao.rollback(); return res.status(400).json({ mensagem: 'Material não encontrado.' }); }
    const [[ponto]] = await conexao.execute('SELECT id_ponto FROM pontos_coleta WHERE id_ponto = ?', [dados.id_ponto]);
    if (!ponto) { await conexao.rollback(); return res.status(400).json({ mensagem: 'Ponto de coleta não encontrado.' }); }
    const pontos = Math.round(dados.quantidade_kg * Number(material.pontos_por_kg));
    const ajuste = pontos - Number(anterior.pontos_gerados);
    const [[saldo]] = await conexao.execute('SELECT pontos FROM usuarios WHERE id_usuario = ? FOR UPDATE', [anterior.id_usuario]);
    if (Number(saldo.pontos) + ajuste < 0) { await conexao.rollback(); return res.status(409).json({ mensagem: 'A edição reduziria pontos já utilizados em resgates.' }); }
    await conexao.execute('UPDATE reciclagens SET id_material = ?, id_ponto = ?, quantidade_kg = ?, pontos_gerados = ? WHERE id_reciclagem = ?', [dados.id_material, dados.id_ponto, dados.quantidade_kg, pontos, Number(req.params.id)]);
    await conexao.execute('UPDATE usuarios SET pontos = pontos + ? WHERE id_usuario = ?', [ajuste, anterior.id_usuario]);
    const conquistas = await desbloquearConquistas(conexao, anterior.id_usuario);
    await conexao.commit();
    return res.status(200).json({ mensagem: 'Reciclagem atualizada.', pontos_gerados: pontos, conquistas_desbloqueadas: conquistas });
  } catch (error) { if (conexao) await conexao.rollback(); return next(error); } finally { conexao?.release(); }
}

async function excluir(req, res, next) {
  if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de reciclagem inválido.' });
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    const [[registro]] = await conexao.execute('SELECT id_usuario, pontos_gerados FROM reciclagens WHERE id_reciclagem = ? FOR UPDATE', [Number(req.params.id)]);
    if (!registro) { await conexao.rollback(); return res.status(404).json({ mensagem: 'Reciclagem não encontrada.' }); }
    if (!permitido(req.usuario, registro.id_usuario)) { await conexao.rollback(); return res.status(403).json({ mensagem: 'Você não tem permissão para excluir este registro.' }); }
    const [[saldo]] = await conexao.execute('SELECT pontos FROM usuarios WHERE id_usuario = ? FOR UPDATE', [registro.id_usuario]);
    if (Number(saldo.pontos) < Number(registro.pontos_gerados)) { await conexao.rollback(); return res.status(409).json({ mensagem: 'A reciclagem gerou pontos já utilizados em resgates e não pode ser excluída.' }); }
    await conexao.execute('DELETE FROM reciclagens WHERE id_reciclagem = ?', [Number(req.params.id)]);
    await conexao.execute('UPDATE usuarios SET pontos = pontos - ? WHERE id_usuario = ?', [registro.pontos_gerados, registro.id_usuario]);
    await conexao.commit();
    return res.status(200).json({ mensagem: 'Reciclagem excluída.' });
  } catch (error) { if (conexao) await conexao.rollback(); return next(error); } finally { conexao?.release(); }
}

async function resumo(req, res, next) {
  try {
    const [rows] = await pool.execute('SELECT u.pontos, COUNT(r.id_reciclagem) AS total_reciclagens, COALESCE(SUM(r.quantidade_kg), 0) AS quilos_reciclados FROM usuarios u LEFT JOIN reciclagens r ON r.id_usuario = u.id_usuario WHERE u.id_usuario = ? GROUP BY u.id_usuario, u.pontos', [req.usuario.id_usuario]);
    const [recentes] = await pool.execute(`${selectJoin} WHERE r.id_usuario = ? ORDER BY r.data_reciclagem DESC, r.id_reciclagem DESC LIMIT 5`, [req.usuario.id_usuario]);
    const [[historico]] = await pool.execute('SELECT COALESCE(SUM(pontos_gerados), 0) AS pontos_historicos FROM reciclagens WHERE id_usuario = ?', [req.usuario.id_usuario]);
    const [mensal] = await pool.execute(`SELECT DATE_FORMAT(data_reciclagem, '%Y-%m') AS mes, SUM(quantidade_kg) AS quilos, SUM(pontos_gerados) AS pontos, COUNT(*) AS reciclagens FROM reciclagens WHERE id_usuario = ? AND data_reciclagem >= CURRENT_DATE - INTERVAL 11 MONTH GROUP BY DATE_FORMAT(data_reciclagem, '%Y-%m') ORDER BY mes`, [req.usuario.id_usuario]);
    const [materiais] = await pool.execute('SELECT m.nome, SUM(r.quantidade_kg) AS quilos, SUM(r.pontos_gerados) AS pontos, COUNT(*) AS reciclagens FROM reciclagens r INNER JOIN materiais m ON m.id_material = r.id_material WHERE r.id_usuario = ? GROUP BY m.id_material, m.nome ORDER BY quilos DESC', [req.usuario.id_usuario]);
    return res.status(200).json({ resumo: { ...rows[0], pontos_historicos: historico.pontos_historicos }, atividades_recentes: recentes, evolucao_mensal: mensal, materiais });
  } catch (error) { return next(error); }
}

export { listar, consultar, criar, atualizar, excluir, resumo };
