export const environment = {
  production: false,
  apiUrl:
    (globalThis as { __API_URL__?: string }).__API_URL__ ??
    'http://localhost:4000/api'
};
