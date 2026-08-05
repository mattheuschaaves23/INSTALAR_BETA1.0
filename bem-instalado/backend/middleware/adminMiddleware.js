const pool = require('../config/database');

module.exports = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT id, is_admin, two_factor_enabled
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [req.userId]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: 'Acesso restrito ao administrador do sistema.' });
    }

    if (user.two_factor_enabled === false) {
      return res.status(403).json({
        error: 'Ative a autenticação em duas etapas no seu perfil antes de acessar a administração.',
        code: 'ADMIN_TWO_FACTOR_REQUIRED',
      });
    }

    return next();
  } catch (_error) {
    return res.status(500).json({ error: 'Erro ao validar permissão de administrador.' });
  }
};
