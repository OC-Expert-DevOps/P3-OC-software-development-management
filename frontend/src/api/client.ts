import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh tokens rotate on every use (the old one is revoked server-side), so
// if two requests 401 around the same time and each called /auth/refresh
// independently, the second would present an already-revoked cookie and get
// rejected — logging out a user whose session the first call had just
// renewed. This in-flight promise makes concurrent 401s share a single
// refresh call instead of racing each other.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/auth/refresh', {}, { withCredentials: true })
      .then(({ data }) => {
        localStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        // Both keys must go: leaving `user` behind means useAuth's initial
        // state (read from localStorage on mount) still reports the user as
        // authenticated after the hard navigation below, so the Navbar kept
        // showing "Mon espace"/"Se déconnecter" and looping back to /login.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
