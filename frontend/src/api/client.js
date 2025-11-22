// src/api/client.js
import axios from 'axios';

// Ajusta esta URL si tu backend no está en localhost:8080
const API_BASE_URL = 'http://localhost:8080';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

// Cliente axios con interceptor para el token
export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
