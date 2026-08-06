import api from './api';
import { clearCsrfToken, getCsrfToken, setCsrfToken } from '../utils/csrfToken';

let pendingRequest = null;

export { clearCsrfToken, getCsrfToken };

export async function refreshCsrfToken() {
  if (!pendingRequest) {
    pendingRequest = api
      .get('/auth/csrf', { timeout: 10000 })
      .then((response) => {
        return setCsrfToken(response.data?.csrf_token);
      })
      .catch(() => null)
      .finally(() => {
        pendingRequest = null;
      });
  }

  return pendingRequest;
}
