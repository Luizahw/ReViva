import { pool } from '../database/conexao.js';

async function listarRecompensas(req, res, next) {
  try {
    const [recompensas] = await pool.execute('SELECT id_recompensa, nome, descricao, parceiro, pontos_necessarios, quantidade, imagem_url FROM recompensas WHERE ativa = 1 AND quantidade > 0 ORDER BY pontos_necessarios, nome');
    return res.status(200).json({ recompensas });
  } catch (error) { return next(error); }
}

async function resgatarRecompensa(req, res, next) {
  const idRecompensa = Number(req.params.id);
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(idRecompensa) || idRecompensa <= 0) return res.status(400).json({ mensagem: 'ID de recompensa inválido.' });
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    const [[usuario]] = await conexao.execute('SELECT pontos FROM usuarios WHERE id_usuario = ? FOR UPDATE', [req.usuario.id_usuario]);
    const [[recompensa]] = await conexao.execute('SELECT id_recompensa, nome, pontos_necessarios, quantidade, ativa FROM recompensas WHERE id_recompensa = ? FOR UPDATE', [idRecompensa]);
    if (!recompensa || !recompensa.ativa) { await conexao.rollback(); return res.status(404).json({ mensagem: 'Recompensa indisponível.' }); }
    if (recompensa.quantidade < 1) { await conexao.rollback(); return res.status(409).json({ mensagem: 'Recompensa sem unidades disponíveis.' }); }
    if (Number(usuario.pontos) < Number(recompensa.pontos_necessarios)) { await conexao.rollback(); return res.status(409).json({ mensagem: 'Você não possui pontos suficientes.' }); }
    const [resultado] = await conexao.execute('INSERT INTO resgates (id_usuario, id_recompensa, pontos_gastos) VALUES (?, ?, ?)', [req.usuario.id_usuario, idRecompensa, recompensa.pontos_necessarios]);
    await conexao.execute('UPDATE usuarios SET pontos = pontos - ? WHERE id_usuario = ?', [recompensa.pontos_necessarios, req.usuario.id_usuario]);
    await conexao.execute('UPDATE recompensas SET quantidade = quantidade - 1 WHERE id_recompensa = ?', [idRecompensa]);
    await conexao.commit();
    return res.status(201).json({ mensagem: 'Resgate solicitado. Consulte o histórico para acompanhar o status.', resgate: { id_resgate: resultado.insertId, recompensa: recompensa.nome, pontos_gastos: recompensa.pontos_necessarios, status: 'pendente' } });
  } catch (error) { if (conexao) await conexao.rollback(); return next(error); } finally { conexao?.release(); }
}

async function listarResgates(req, res, next) {
  try {
    const sql = `SELECT r.id_resgate, r.id_usuario, r.id_recompensa, rw.nome AS recompensa, rw.parceiro,
                        r.pontos_gastos, r.status, r.solicitado_em, r.atualizado_em
                   FROM resgates r INNER JOIN recompensas rw ON rw.id_recompensa = r.id_recompensa
                  WHERE r.id_usuario = ? ORDER BY r.solicitado_em DESC`;
    const [resgates] = await pool.execute(sql, [req.usuario.id_usuario]);
    return res.status(200).json({ resgates });
  } catch (error) { return next(error); }
}

async function atualizarStatusResgate(req, res, next) {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ mensagem: 'ID de resgate inválido.' });
  if (!['concluido', 'cancelado'].includes(status)) return res.status(400).json({ mensagem: 'Status inválido.' });
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    const [[resgate]] = await conexao.execute('SELECT id_usuario, id_recompensa, pontos_gastos, status FROM resgates WHERE id_resgate = ? FOR UPDATE', [id]);
    if (!resgate) { await conexao.rollback(); return res.status(404).json({ mensagem: 'Resgate não encontrado.' }); }
    if (resgate.status !== 'pendente') { await conexao.rollback(); return res.status(409).json({ mensagem: 'Este resgate já foi processado.' }); }
    if (status === 'cancelado') {
      await conexao.execute('UPDATE usuarios SET pontos = pontos + ? WHERE id_usuario = ?', [resgate.pontos_gastos, resgate.id_usuario]);
      await conexao.execute('UPDATE recompensas SET quantidade = quantidade + 1 WHERE id_recompensa = ?', [resgate.id_recompensa]);
    }
    await conexao.execute('UPDATE resgates SET status = ? WHERE id_resgate = ?', [status, id]);
    await conexao.commit();
    return res.status(200).json({ mensagem: status === 'cancelado' ? 'Resgate cancelado; pontos e estoque foram restaurados.' : 'Resgate concluído.' });
  } catch (error) { if (conexao) await conexao.rollback(); return next(error); } finally { conexao?.release(); }
}

export { listarRecompensas, resgatarRecompensa, listarResgates, atualizarStatusResgate };
