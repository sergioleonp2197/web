export const environment = {
  production: true,
  apiUrl:
    (globalThis as { __API_URL__?: string }).__API_URL__ ??
    'http://localhost:4000/api'
};
