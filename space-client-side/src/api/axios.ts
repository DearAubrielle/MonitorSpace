import axios from 'axios';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const api = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true, // Include cookies in requests
});

export default api;
