import axios from "axios";

export const BACKEND_URL = (import.meta.env.VITE_BACKEND || "http://localhost:8000").replace(/\/$/, "");

export const api = axios.create({ baseURL: BACKEND_URL, timeout: 60000 });

/** Pull the most useful message out of an axios/fetch error. */
export const apiErrorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError(err)) {
    if (!err.response) return null; // network error, caller shows the "server unreachable" text
    const data = err.response.data as { error?: string; detail?: unknown } | undefined;
    if (data?.error) return data.error;
    if (typeof data?.detail === "string") return data.detail;
  }
  return fallback;
};
