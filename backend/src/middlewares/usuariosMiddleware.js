import jwt from 'jsonwebtoken';

function autenticar(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ mensagem: 'Token de autenticação necessário.' });
  }

  try {
    const token = authorization.slice(7).trim();
    if (!token) return res.status(401).json({ mensagem: 'Token de autenticação necessário.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const idUsuario = Number(payload.sub);
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0 || !['comum', 'administrador'].includes(payload.tipo_usuario)) {
      return res.status(401).json({ mensagem: 'Token inválido.' });
    }
    req.usuario = { id_usuario: idUsuario, tipo_usuario: payload.tipo_usuario };
    return next();
  } catch (error) {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }
}

function exigirAdministrador(req, res, next) {
  if (!req.usuario) return res.status(401).json({ mensagem: 'Autenticação necessária.' });
  if (req.usuario.tipo_usuario !== 'administrador') {
    return res.status(403).json({ mensagem: 'Acesso permitido somente a administradores.' });
  }
  return next();
}

export { autenticar, exigirAdministrador };
