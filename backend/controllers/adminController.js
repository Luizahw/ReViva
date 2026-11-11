import { pool } from '../database/conexao.js';

const texto = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
const idValido = (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

async function indicadoresAdmin(req, res, next) {
  try {
    const [[usuarios]] = await pool.execute('SELECT COUNT(*) AS total FROM usuarios');
    const [[reciclagens]] = await pool.execute('SELECT COUNT(*) AS total, COALESCE(SUM(quantidade_kg), 0) AS quilos, COALESCE(SUM(pontos_gerados), 0) AS pontos FROM reciclagens');
    const [[recompensas]] = await pool.execute("SELECT COUNT(*) AS total FROM resgates WHERE status <> 'cancelado'");
    const [[doacoes]] = await pool.execute('SELECT COUNT(*) AS total FROM doacoes');
    return res.status(200).json({ indicadores: { usuarios: Number(usuarios.total), reciclagens: Number(reciclagens.total), quilos: Number(reciclagens.quilos), pontos_gerados: Number(reciclagens.pontos), recompensas_resgatadas: Number(recompensas.total), doacoes: Number(doacoes.total) } });
  } catch (error) { return next(error); }
}

async function criarMaterial(req, res, next) {
  const { nome, descricao, pontos_por_kg: pontos } = req.body || {};
  const taxa = Number(pontos);
  if (!texto(nome, 100) || (descricao != null && typeof descricao !== 'string') || !Number.isFinite(taxa) || taxa <= 0 || taxa > 100000) return res.status(400).json({ mensagem: 'Informe nome, descrição e pontos por kg válidos.' });
  try { const [resultado] = await pool.execute('INSERT INTO materiais (nome, descricao, pontos_por_kg) VALUES (?, ?, ?)', [nome.trim(), descricao?.trim() || null, taxa]); return res.status(201).json({ mensagem: 'Material cadastrado.', id_material: resultado.insertId }); }
  catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensagem: 'Já existe um material com esse nome.' }); return next(error); }
}

async function atualizarMaterial(req, res, next) {
  const { nome, descricao, pontos_por_kg: pontos } = req.body || {};
  const taxa = Number(pontos);
  if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de material inválido.' });
  if (!texto(nome, 100) || (descricao != null && typeof descricao !== 'string') || !Number.isFinite(taxa) || taxa <= 0 || taxa > 100000) return res.status(400).json({ mensagem: 'Informe nome, descrição e pontos por kg válidos.' });
  try { const [[existente]] = await pool.execute('SELECT id_material FROM materiais WHERE id_material = ?', [Number(req.params.id)]); if (!existente) return res.status(404).json({ mensagem: 'Material não encontrado.' }); await pool.execute('UPDATE materiais SET nome = ?, descricao = ?, pontos_por_kg = ? WHERE id_material = ?', [nome.trim(), descricao?.trim() || null, taxa, Number(req.params.id)]); return res.status(200).json({ mensagem: 'Material atualizado.' }); }
  catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensagem: 'Já existe um material com esse nome.' }); return next(error); }
}

async function excluirMaterial(req, res, next) {
  if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de material inválido.' });
  try { const [resultado] = await pool.execute('DELETE FROM materiais WHERE id_material = ?', [Number(req.params.id)]); if (!resultado.affectedRows) return res.status(404).json({ mensagem: 'Material não encontrado.' }); return res.status(200).json({ mensagem: 'Material excluído.' }); }
  catch (error) { if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ mensagem: 'Este material está vinculado a reciclagens e não pode ser excluído.' }); return next(error); }
}

async function criarPonto(req, res, next) {
  const { nome, endereco, cidade, descricao } = req.body || {};
  if (!texto(nome, 100) || !texto(endereco, 200) || !texto(cidade, 100) || (descricao != null && typeof descricao !== 'string')) return res.status(400).json({ mensagem: 'Informe nome, endereço e cidade válidos.' });
  try { const [resultado] = await pool.execute('INSERT INTO pontos_coleta (nome, endereco, cidade, descricao) VALUES (?, ?, ?, ?)', [nome.trim(), endereco.trim(), cidade.trim(), descricao?.trim() || null]); return res.status(201).json({ mensagem: 'Ponto de coleta cadastrado.', id_ponto: resultado.insertId }); }
  catch (error) { return next(error); }
}

async function atualizarPonto(req, res, next) {
  const { nome, endereco, cidade, descricao } = req.body || {};
  if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de ponto inválido.' });
  if (!texto(nome, 100) || !texto(endereco, 200) || !texto(cidade, 100) || (descricao != null && typeof descricao !== 'string')) return res.status(400).json({ mensagem: 'Informe nome, endereço e cidade válidos.' });
  try { const [[existente]] = await pool.execute('SELECT id_ponto FROM pontos_coleta WHERE id_ponto = ?', [Number(req.params.id)]); if (!existente) return res.status(404).json({ mensagem: 'Ponto de coleta não encontrado.' }); await pool.execute('UPDATE pontos_coleta SET nome = ?, endereco = ?, cidade = ?, descricao = ? WHERE id_ponto = ?', [nome.trim(), endereco.trim(), cidade.trim(), descricao?.trim() || null, Number(req.params.id)]); return res.status(200).json({ mensagem: 'Ponto de coleta atualizado.' }); }
  catch (error) { return next(error); }
}

async function excluirPonto(req, res, next) {
  if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de ponto inválido.' });
  try { const [resultado] = await pool.execute('DELETE FROM pontos_coleta WHERE id_ponto = ?', [Number(req.params.id)]); if (!resultado.affectedRows) return res.status(404).json({ mensagem: 'Ponto de coleta não encontrado.' }); return res.status(200).json({ mensagem: 'Ponto de coleta excluído.' }); }
  catch (error) { if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ mensagem: 'Este ponto está vinculado a reciclagens e não pode ser excluído.' }); return next(error); }
}

async function listarRecompensasAdmin(req, res, next) {
  try { const [recompensas] = await pool.execute('SELECT id_recompensa, nome, descricao, parceiro, pontos_necessarios, quantidade, imagem_url, ativa, criado_em, atualizado_em FROM recompensas ORDER BY criado_em DESC'); return res.status(200).json({ recompensas }); }
  catch (error) { return next(error); }
}

async function salvarRecompensa(req, res, next) {
  const { nome, descricao, parceiro, pontos_necessarios: pontos, quantidade, imagem_url: imagemUrl, ativa = true } = req.body || {};
  const valorPontos = Number(pontos); const estoque = Number(quantidade);
  if (!texto(nome, 140) || typeof descricao !== 'string' || !descricao.trim() || !texto(parceiro, 140) || !Number.isSafeInteger(valorPontos) || valorPontos <= 0 || !Number.isSafeInteger(estoque) || estoque < 0 || (imagemUrl != null && (typeof imagemUrl !== 'string' || imagemUrl.length > 500)) || ![true, false, 0, 1].includes(ativa)) return res.status(400).json({ mensagem: 'Dados da recompensa inválidos.' });
  const dados = [nome.trim(), descricao.trim(), parceiro.trim(), valorPontos, estoque, imagemUrl?.trim() || null, ativa ? 1 : 0];
  try {
    if (req.params.id) {
      if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de recompensa inválido.' });
      const [[existente]] = await pool.execute('SELECT id_recompensa FROM recompensas WHERE id_recompensa = ?', [Number(req.params.id)]);
      if (!existente) return res.status(404).json({ mensagem: 'Recompensa não encontrada.' });
      await pool.execute('UPDATE recompensas SET nome = ?, descricao = ?, parceiro = ?, pontos_necessarios = ?, quantidade = ?, imagem_url = ?, ativa = ? WHERE id_recompensa = ?', [...dados, Number(req.params.id)]);
      return res.status(200).json({ mensagem: 'Recompensa atualizada.' });
    }
    const [resultado] = await pool.execute('INSERT INTO recompensas (nome, descricao, parceiro, pontos_necessarios, quantidade, imagem_url, ativa) VALUES (?, ?, ?, ?, ?, ?, ?)', dados);
    return res.status(201).json({ mensagem: 'Recompensa cadastrada.', id_recompensa: resultado.insertId });
  } catch (error) { return next(error); }
}

async function excluirRecompensa(req, res, next) {
  if (!idValido(req.params.id)) return res.status(400).json({ mensagem: 'ID de recompensa inválido.' });
  try { const [resultado] = await pool.execute('DELETE FROM recompensas WHERE id_recompensa = ?', [Number(req.params.id)]); if (!resultado.affectedRows) return res.status(404).json({ mensagem: 'Recompensa não encontrada.' }); return res.status(200).json({ mensagem: 'Recompensa excluída.' }); }
  catch (error) { if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ mensagem: 'A recompensa possui resgates no histórico. Desative-a em vez de excluir.' }); return next(error); }
}

async function listarTodosResgates(req, res, next) {
  try { const [resgates] = await pool.execute('SELECT r.id_resgate, r.id_usuario, u.nome AS nome_usuario, rw.nome AS recompensa, rw.parceiro, r.pontos_gastos, r.status, r.solicitado_em, r.atualizado_em FROM resgates r INNER JOIN usuarios u ON u.id_usuario = r.id_usuario INNER JOIN recompensas rw ON rw.id_recompensa = r.id_recompensa ORDER BY r.solicitado_em DESC'); return res.status(200).json({ resgates }); }
  catch (error) { return next(error); }
}

export { indicadoresAdmin, criarMaterial, atualizarMaterial, excluirMaterial, criarPonto, atualizarPonto, excluirPonto, listarRecompensasAdmin, salvarRecompensa, excluirRecompensa, listarTodosResgates };
