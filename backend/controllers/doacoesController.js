import { pool } from '../database/conexao.js';

const estadosValidos = ['novo', 'bom', 'regular', 'para_reparo'];
const statusValidos = ['pendente', 'em_analise', 'aprovada', 'rejeitada', 'concluida'];

async function criarDoacao(req, res, next) {
  const { equipamento, categoria, descricao, estado_conservacao, cidade, contato_nome, contato_email, contato_telefone } = req.body || {};
  const obrigatorios = [equipamento, categoria, descricao, estado_conservacao, cidade, contato_nome, contato_email];
  if (obrigatorios.some((valor) => typeof valor !== 'string' || !valor.trim())) return res.status(400).json({ mensagem: 'Preencha os dados obrigatórios da doação.' });
  if (!estadosValidos.includes(estado_conservacao) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato_email.trim())) return res.status(400).json({ mensagem: 'Estado de conservação ou e-mail inválido.' });
  if (equipamento.length > 140 || categoria.length > 100 || cidade.length > 120 || contato_nome.length > 120 || contato_email.length > 255 || (contato_telefone && contato_telefone.length > 40)) return res.status(400).json({ mensagem: 'Um dos campos excede o tamanho permitido.' });
  try {
    const [resultado] = await pool.execute('INSERT INTO doacoes (id_usuario, equipamento, categoria, descricao, estado_conservacao, cidade, contato_nome, contato_email, contato_telefone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.usuario.id_usuario, equipamento.trim(), categoria.trim(), descricao.trim(), estado_conservacao, cidade.trim(), contato_nome.trim(), contato_email.trim().toLowerCase(), contato_telefone?.trim() || null]);
    return res.status(201).json({ mensagem: 'Doação cadastrada para análise. A entrega só será confirmada após atualização do status.', id_doacao: resultado.insertId, status: 'pendente' });
  } catch (error) { return next(error); }
}

async function listarMinhasDoacoes(req, res, next) {
  try {
    const [doacoes] = await pool.execute('SELECT id_doacao, equipamento, categoria, descricao, estado_conservacao, cidade, contato_nome, contato_email, contato_telefone, status, observacao_admin, criado_em, atualizado_em FROM doacoes WHERE id_usuario = ? ORDER BY criado_em DESC', [req.usuario.id_usuario]);
    return res.status(200).json({ doacoes });
  } catch (error) { return next(error); }
}

async function listarTodasDoacoes(req, res, next) {
  try {
    const [doacoes] = await pool.execute('SELECT d.id_doacao, d.id_usuario, u.nome AS nome_usuario, d.equipamento, d.categoria, d.descricao, d.estado_conservacao, d.cidade, d.contato_nome, d.contato_email, d.contato_telefone, d.status, d.observacao_admin, d.criado_em, d.atualizado_em FROM doacoes d INNER JOIN usuarios u ON u.id_usuario = d.id_usuario ORDER BY d.criado_em DESC');
    return res.status(200).json({ doacoes });
  } catch (error) { return next(error); }
}

async function atualizarStatusDoacao(req, res, next) {
  const id = Number(req.params.id);
  const { status, observacao_admin: observacao } = req.body || {};
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ mensagem: 'ID de doação inválido.' });
  if (!statusValidos.includes(status) || (observacao !== undefined && typeof observacao !== 'string')) return res.status(400).json({ mensagem: 'Status ou observação inválidos.' });
  try {
    const [[existente]] = await pool.execute('SELECT id_doacao FROM doacoes WHERE id_doacao = ?', [id]);
    if (!existente) return res.status(404).json({ mensagem: 'Doação não encontrada.' });
    await pool.execute('UPDATE doacoes SET status = ?, observacao_admin = ? WHERE id_doacao = ?', [status, observacao?.trim() || null, id]);
    return res.status(200).json({ mensagem: 'Status da doação atualizado. A entrega foi registrada somente pelo status informado.' });
  } catch (error) { return next(error); }
}

export { criarDoacao, listarMinhasDoacoes, listarTodasDoacoes, atualizarStatusDoacao };
