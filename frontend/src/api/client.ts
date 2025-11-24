import axios from "axios";

export const api = axios.create({
  // For now, just point at your local FastAPI backend
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000",
});
