const trimTrailingSlash = (value) => value.replace(/\/$/, "");

const getDefaultBackendUrl = () => {
  return "http://localhost:3001";
};

export const BACKEND_URL = trimTrailingSlash(
  import.meta.env.VITE_BACKEND_URL || "https://wavvyy.onrender.com",
);

export const API_BASE_URL = `${BACKEND_URL}/api`;
