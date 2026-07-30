import axios from 'axios';

const api = axios.create({
  // URL de ton backend Django avec le préfixe /api/v1
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Requis si tu utilises les cookies de session / CSRF Django
});

export default api;