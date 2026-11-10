import express from 'express';
import { cadastrar, login, perfil, listarUsuarios } from '../controllers/usuariosController.js';
import { autenticar, exigirAdministrador } from '../middlewares/usuariosMiddleware.js';

const router = express.Router();

router.get('/', autenticar, exigirAdministrador, listarUsuarios);
router.post('/cadastro', cadastrar);
router.post('/login', login);
router.get('/perfil', autenticar, perfil);
router.get('/administrador', autenticar, exigirAdministrador, (req, res) => {
  res.status(200).json({ mensagem: 'Acesso de administrador autorizado.' });
});

// Mantém os caminhos curtos já disponibilizados anteriormente.
router.get('/me', autenticar, perfil);
router.get('/admin', autenticar, exigirAdministrador, (req, res) => {
  res.status(200).json({ mensagem: 'Acesso de administrador autorizado.' });
});

export default router;
