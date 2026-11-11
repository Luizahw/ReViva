import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/conexao.js';

const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function cadastrar(req, res, next) {
  try {
    const { nome, email, senha } = req.body || {};
    if (typeof nome !== 'string' || typeof email !== 'string' || typeof senha !== 'string' || !nome.trim() || !email.trim() || !senha) {
      return res.status(400).json({ mensagem: 'Nome, e-mail e senha são obrigatórios.' });
    }
    if (!emailValido(email.trim())) return res.status(400).json({ mensagem: 'Formato de e-mail inválido.' });
    if (senha.length < 8) return res.status(400).json({ mensagem: 'A senha deve ter pelo menos 8 caracteres.' });
    if (nome.trim().length > 100 || email.trim().length > 150) {
      return res.status(400).json({ mensagem: 'Nome ou e-mail excede o tamanho permitido.' });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const [existentes] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ? LIMIT 1', [emailNormalizado]);
    if (existentes.length) return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });

    const hash = await bcrypt.hash(senha, 12);
    const [resultado] = await pool.execute(
      "INSERT INTO usuarios (nome, email, senha, tipo_usuario, pontos) VALUES (?, ?, ?, 'comum', 0)",
      [nome.trim(), emailNormalizado, hash]
    );
    return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso.', usuario: {
      id_usuario: resultado.insertId, nome: nome.trim(), email: emailNormalizado, tipo_usuario: 'comum', pontos: 0
    } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, senha } = req.body || {};
    if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha) {
      return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
    }
    const [usuarios] = await pool.execute(
      'SELECT id_usuario, nome, email, senha, tipo_usuario, pontos FROM usuarios WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );
    const usuario = usuarios[0];
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    const duracao = process.env.JWT_EXPIRES_IN || '1h';
    const token = jwt.sign(
      { tipo_usuario: usuario.tipo_usuario },
      process.env.JWT_SECRET,
      { subject: String(usuario.id_usuario), expiresIn: duracao, algorithm: 'HS256' }
    );
    return res.status(200).json({ mensagem: 'Login realizado com sucesso.', token, tipo: 'Bearer', expiresIn: duracao, usuario: {
      id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email,
      tipo_usuario: usuario.tipo_usuario, pontos: usuario.pontos
    } });
  } catch (error) {
    return next(error);
  }
}

async function perfil(req, res, next) {
  try {
    const [usuarios] = await pool.execute(
      'SELECT id_usuario, nome, email, tipo_usuario, pontos, data_cadastro FROM usuarios WHERE id_usuario = ? LIMIT 1',
      [req.usuario.id_usuario]
    );
    if (!usuarios.length) return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    return res.status(200).json({ usuario: usuarios[0] });
  } catch (error) {
    return next(error);
  }
}

async function listarUsuarios(req, res, next) {
  try {
    const [usuarios] = await pool.execute(
      'SELECT id_usuario, nome, email, tipo_usuario, pontos, data_cadastro FROM usuarios ORDER BY id_usuario'
    );
    return res.status(200).json({ usuarios });
  } catch (error) {
    return next(error);
  }
}

async function atualizarTipoUsuario(req, res, next) {
  const idInformado = req.params.id;
  const idUsuario = Number(idInformado);
  const { tipo_usuario: tipoUsuario } = req.body || {};
  if (!/^[1-9]\d*$/.test(idInformado) || !Number.isSafeInteger(idUsuario)) {
    return res.status(400).json({ mensagem: 'ID de usuário inválido.' });
  }
  if (!['comum', 'administrador'].includes(tipoUsuario)) {
    return res.status(400).json({ mensagem: 'Tipo de usuário inválido. Use comum ou administrador.' });
  }
  if (idUsuario === req.usuario.id_usuario) {
    return res.status(403).json({ mensagem: 'Não é permitido alterar o próprio nível de acesso.' });
  }

  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    const [administradores] = await conexao.execute(
      "SELECT id_usuario FROM usuarios WHERE tipo_usuario = 'administrador' FOR UPDATE"
    );
    const [alvos] = await conexao.execute(
      'SELECT id_usuario, tipo_usuario FROM usuarios WHERE id_usuario = ? FOR UPDATE',
      [idUsuario]
    );
    if (!alvos.length) {
      await conexao.rollback();
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    if (alvos[0].tipo_usuario === 'administrador' && tipoUsuario === 'comum' && administradores.length <= 1) {
      await conexao.rollback();
      return res.status(409).json({ mensagem: 'Não é possível rebaixar o último administrador.' });
    }
    await conexao.execute('UPDATE usuarios SET tipo_usuario = ? WHERE id_usuario = ?', [tipoUsuario, idUsuario]);
    await conexao.commit();
    return res.status(200).json({ mensagem: 'Nível de acesso atualizado. O usuário afetado deve entrar novamente.', usuario: { id_usuario: idUsuario, tipo_usuario: tipoUsuario } });
  } catch (error) {
    if (conexao) await conexao.rollback();
    return next(error);
  } finally {
    if (conexao) conexao.release();
  }
}

export { cadastrar, login, perfil, listarUsuarios, atualizarTipoUsuario };
