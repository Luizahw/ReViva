async function desbloquearConquistas(conexao, idUsuario) {
  const [[totais]] = await conexao.execute(
    `SELECT COUNT(r.id_reciclagem) AS reciclagens,
            COALESCE(SUM(r.quantidade_kg), 0) AS peso,
            COALESCE(SUM(r.pontos_gerados), 0) AS pontos,
            COUNT(DISTINCT r.id_material) AS diversidade
       FROM reciclagens r WHERE r.id_usuario = ?`,
    [idUsuario]
  );
  const [conquistas] = await conexao.execute('SELECT id_conquista, criterio_tipo, criterio_valor FROM conquistas WHERE ativa = 1');
  const novas = [];
  for (const conquista of conquistas) {
    let valor = conquista.criterio_tipo === 'reciclagens' ? Number(totais.reciclagens)
      : conquista.criterio_tipo === 'peso' ? Number(totais.peso)
        : conquista.criterio_tipo === 'pontos' ? Number(totais.pontos)
          : conquista.criterio_tipo === 'diversidade' ? Number(totais.diversidade)
            : 0;
    if (conquista.criterio_tipo === 'material') {
      const [[material]] = await conexao.execute(
        `SELECT COUNT(*) AS total FROM reciclagens r
           INNER JOIN materiais m ON m.id_material = r.id_material
          WHERE r.id_usuario = ? AND LOWER(m.nome) = LOWER(?)`,
        [idUsuario, conquista.criterio_material || '']
      );
      valor = Number(material.total);
    }
    if (valor < Number(conquista.criterio_valor)) continue;
    const [resultado] = await conexao.execute(
      'INSERT IGNORE INTO usuarios_conquistas (id_usuario, id_conquista) VALUES (?, ?)',
      [idUsuario, conquista.id_conquista]
    );
    if (resultado.affectedRows) novas.push(Number(conquista.id_conquista));
  }
  return novas;
}

export { desbloquearConquistas };
