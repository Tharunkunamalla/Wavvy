const trimTrailingSlash = (value) => value.replace(/\/$/, "");

const getDefaultBackendUrl = () => {
  if (import.meta.env.PROD && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:5001";
};

export const BACKEND_URL = trimTrailingSlash(
  import.meta.env.VITE_BACKEND_URL || getDefaultBackendUrl(),
);

export const API_BASE_URL = `${BACKEND_URL}/api`;
