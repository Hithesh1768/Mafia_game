import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mafia_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  register: (username, password) => 
    api.post('/auth/register', { username, password }),
  
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    // Returns plain JWT token string
    const token = response.data;
    if (token) {
      localStorage.setItem('mafia_token', token);
    }
    return token;
  },

  loginAsGuest: async (nickname) => {
    const response = await api.post(`/auth/guest?nickname=${encodeURIComponent(nickname)}`);
    const token = response.data;
    if (token) {
      localStorage.setItem('mafia_token', token);
    }
    return token;
  },

  loginWithGoogle: async (credential) => {
    const response = await api.post('/auth/google', { credential });
    const token = response.data;
    if (token) {
      localStorage.setItem('mafia_token', token);
    }
    return token;
  },

  registerWithGoogle: async (credential, username, password) => {
    const response = await api.post('/auth/register/google', { credential, username, password });
    const token = response.data;
    if (token) {
      localStorage.setItem('mafia_token', token);
    }
    return token;
  },
  
  logout: () => {
    localStorage.removeItem('mafia_token');
  }
};

export const playerService = {
  getMe: () => api.get('/player/me'),
  joinLobby: (lobbyId, password = '') => api.post(`/player/join?lobbyId=${lobbyId}&password=${encodeURIComponent(password || '')}`),
  leaveLobby: () => api.post('/player/leave'),
};

export const lobbyService = {
  createLobby: (name, isPrivate = false, password = '') => 
    api.post(`/lobby/create?name=${encodeURIComponent(name || '')}&isPrivate=${isPrivate}&password=${encodeURIComponent(password || '')}`),
  listLobbies: () => api.get('/lobby/list'),
  getLobbyDetails: (lobbyId) => api.get(`/lobby/${lobbyId}`),
  dismissLobby: () => api.post('/lobby/dismiss'),
};

export const gameService = {
  getPlayers: () => api.get('/game/players'),
  startGame: () => api.post('/game/start'),
  resetGame: () => api.post('/game/reset'),
  returnToLobby: () => api.post('/game/return-to-lobby'),
};

export const chatService = {
  getChat: () => api.get('/chat'),
  sendMessage: (content) => api.post('/chat', { content }),
};

export const dayService = {
  getDayStatus: () => api.get('/day/start'),
  submitVote: (targetId) => api.post('/day/vote', { targetId }),
  resolveDay: () => api.post('/day/resolve'),
};

export const nightService = {
  submitNightAction: (targetId) => api.post('/night/action', { targetId }),
};

export default api;
