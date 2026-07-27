const { getInstallerPlanAccess } = require('../services/planAccess');

module.exports = async (req, res, next) => {
  try {
    if (req.user?.account_type === 'client') {
      return res.status(403).json({
        error: 'Acesso restrito a instaladores.',
        code: 'ACCOUNT_TYPE_FORBIDDEN',
        account_type: 'client',
        required_account_type: 'installer',
      });
    }

    req.planAccess = await getInstallerPlanAccess(req.userId);
    req.subscriptionAccessMode = req.planAccess.access_mode;
    return next();
  } catch (_error) {
    return res.status(500).json({ error: 'Erro ao validar assinatura.' });
  }
};
