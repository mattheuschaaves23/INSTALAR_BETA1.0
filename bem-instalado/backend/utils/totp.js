const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

exports.generateSecret = () =>
  speakeasy.generateSecret({
    name: 'InstalaPro',
    issuer: 'InstalaPro',
    length: 20,
  });

exports.verifyToken = (secret, token) =>
  speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });

exports.buildOtpAuthUrl = (secret, email) =>
  speakeasy.otpauthURL({
    secret,
    label: `InstalaPro (${email})`,
    issuer: 'InstalaPro',
    encoding: 'base32',
  });

exports.generateQrCode = async (secret, email) => {
  const otpauthUrl = exports.buildOtpAuthUrl(secret, email);
  return QRCode.toDataURL(otpauthUrl);
};
