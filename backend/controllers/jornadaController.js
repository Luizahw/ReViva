import { pool } from '../database/conexao.js';

async function consultarJornada(req, res, next) {
  try {
    const idUsuario = req.usuario.id_usuario;
    const [[estatisticas]] = await pool.execute(
      `SELECT COUNT(*) AS reciclagens, COALESCE(SUM(quantidade_kg), 0) AS peso,
              COALESCE(SUM(pontos_gerados), 0) AS pontos_historicos
         FROM reciclagens WHERE id_usuario = ?`, [idUsuario]
    );
    const [niveis] = await pool.execute('SELECT codigo, nome, pontos_minimos, ordem, icone FROM niveis_jornada ORDER BY ordem');
    const [conquistas] = await pool.execute(
      `SELECT c.id_conquista, c.codigo, c.nome, c.descricao, c.icone, c.criterio_tipo,
              c.criterio_valor, uc.desbloqueada_em
         FROM conquistas c LEFT JOIN usuarios_conquistas uc
           ON uc.id_conquista = c.id_conquista AND uc.id_usuario = ?
        WHERE c.ativa = 1 ORDER BY c.id_conquista`, [idUsuario]
    );
    const pontos = Number(estatisticas.pontos_historicos);
    const nivel = [...niveis].reverse().find((item) => pontos >= Number(item.pontos_minimos)) || niveis[0] || null;
    const proximoNivel = niveis.find((item) => Number(item.pontos_minimos) > pontos) || null;
    return res.status(200).json({ jornada: { estatisticas, nivel, proximo_nivel: proximoNivel, niveis, conquistas } });
  } catch (error) { return next(error); }
}

async function consultarRanking(req, res, next) {
  const periodo = req.query.periodo || 'geral';
  if (!['semanal', 'mensal', 'geral'].includes(periodo)) return res.status(400).json({ mensagem: 'Período inválido.' });
  const filtro = periodo === 'semanal' ? 'AND r.data_reciclagem >= CURRENT_DATE - INTERVAL 7 DAY'
    : periodo === 'mensal' ? 'AND r.data_reciclagem >= CURRENT_DATE - INTERVAL 1 MONTH' : '';
  try {
    const [usuarios] = await pool.execute(
      `SELECT u.id_usuario, u.nome, SUM(r.pontos_gerados) AS pontos
         FROM usuarios u INNER JOIN reciclagens r ON r.id_usuario = u.id_usuario
        WHERE u.tipo_usuario = 'comum' ${filtro}
        GROUP BY u.id_usuario, u.nome
        ORDER BY pontos DESC, u.nome ASC, u.id_usuario ASC`,
      []
    );
    const ranking = usuarios.map((usuario, index) => ({ posicao: index + 1, e_minha: Number(usuario.id_usuario) === idUsuarioAtual(req), nome: usuario.nome, pontos: Number(usuario.pontos) }));
    const posicao = ranking.find((item) => item.e_minha)?.posicao || null;
    return res.status(200).json({ periodo, ranking: ranking.slice(0, 100), minha_posicao: posicao });
  } catch (error) { return next(error); }
}

function idUsuarioAtual(req) { return Number(req.usuario.id_usuario); }

export { consultarJornada, consultarRanking };
