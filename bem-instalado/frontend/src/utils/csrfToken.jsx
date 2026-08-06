let csrfToken = '';

export function getCsrfToken() {
  return csrfToken || null;
}

export function setCsrfToken(value) {
  csrfToken = String(value || '').trim();
  return getCsrfToken();
}

export function clearCsrfToken() {
  csrfToken = '';
}
