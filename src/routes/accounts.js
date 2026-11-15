import { Router } from 'express';
import { hashPassword, verifyPassword } from '../accountsDatabase.js';

export function accountsRouter(db) {
  const router = Router();

  const insertAccount = db.prepare(`
    INSERT INTO contas (usuario, modo, senha_armazenada)
    VALUES (?, ?, ?)
  `);

  const findAccount = db.prepare(`
    SELECT id, usuario, modo, senha_armazenada
    FROM contas
    WHERE usuario = ? AND modo = ?
  `);

  router.post('/cadastro', async (req, res, next) => {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ erro: 'Envie os dados de cadastro em um objeto JSON.' });
      }

      const { usuario, senha, modo = 'vulneravel' } = body;

      if (!['vulneravel', 'corrigido'].includes(modo)) {
        return res.status(400).json({ erro: 'Modo deve ser vulneravel ou corrigido.' });
      }

      if (typeof usuario !== 'string' || usuario.trim().length === 0 || usuario.length > 50) {
        return res.status(400).json({ erro: 'Usuário deve ser informado e ter até 50 caracteres.' });
      }

      const cleanUser = usuario.trim();

      if (typeof senha !== 'string' || senha.length === 0 || senha.length > 128) {
        return res.status(400).json({ erro: 'Senha deve ser informada e ter até 128 caracteres.' });
      }

      const existing = findAccount.get(cleanUser, modo);
      if (existing) {
        return res.status(409).json({ erro: 'Usuário já cadastrado neste modo.' });
      }

      let storedPassword;
      if (modo === 'vulneravel') {
        storedPassword = senha;
      } else {
        storedPassword = await hashPassword(senha);
      }

      insertAccount.run(cleanUser, modo, storedPassword);

      return res.status(201).json({
        mensagem: 'Conta cadastrada com sucesso.',
        usuario: cleanUser,
        modo
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ erro: 'Envie as credenciais em um objeto JSON.' });
      }

      const { usuario, senha, modo = 'vulneravel' } = body;

      if (!['vulneravel', 'corrigido'].includes(modo)) {
        return res.status(400).json({ erro: 'Modo deve ser vulneravel ou corrigido.' });
      }

      if (typeof usuario !== 'string' || usuario.trim().length === 0 || usuario.length > 50) {
        return res.status(400).json({ erro: 'Usuário deve ser informado e ter até 50 caracteres.' });
      }

      const cleanUser = usuario.trim();

      if (typeof senha !== 'string' || senha.length === 0 || senha.length > 128) {
        return res.status(400).json({ erro: 'Senha deve ser informada e ter até 128 caracteres.' });
      }

      const account = findAccount.get(cleanUser, modo);
      if (!account) {
        return res.status(401).json({ erro: 'Credenciais inválidas.' });
      }

      let valid = false;
      if (modo === 'vulneravel') {
        valid = account.senha_armazenada === senha;
      } else {
        valid = await verifyPassword(senha, account.senha_armazenada);
      }

      if (!valid) {
        return res.status(401).json({ erro: 'Credenciais inválidas.' });
      }

      return res.status(200).json({
        mensagem: 'Autenticação realizada com sucesso.',
        usuario: cleanUser,
        modo
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
