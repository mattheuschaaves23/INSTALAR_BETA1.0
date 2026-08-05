module.exports = (req, res, next) => {
  if (req.user?.email_verified || req.user?.is_admin) {
    return next();
  }

  return res.status(403).json({
    error: 'Confirme seu e-mail antes de continuar.',
    code: 'EMAIL_VERIFICATION_REQUIRED',
  });
};
