import { create } from "zustand";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const getToken = () => localStorage.getItem("token");
const setToken = (token) => localStorage.setItem("token", token);
const clearToken = () => localStorage.removeItem("token");

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

export const useApiStore = create((set, get) => {
  const setError = (msg) => set({ error: msg, isLoading: false });

  const checkAuthStatus = async () => {
    const token = getToken();
    if (!token) {
      set({ auth: { ...get().auth, user: null, isAuthenticated: false }, isLoading: false });
      return false;
    }
    set({ isLoading: true, error: null });
    try {
      const user = await request("/auth/me");
      set({ auth: { ...get().auth, user, isAuthenticated: true }, isLoading: false });
      return true;
    } catch (err) {
      clearToken();
      set({ auth: { ...get().auth, user: null, isAuthenticated: false }, isLoading: false });
      return false;
    }
  };

  const signIn = async ({ email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(token);
      set({ auth: { ...get().auth, user, isAuthenticated: true }, isLoading: false });
    } catch (err) {
      setError(err.message || "Sign in failed");
    }
  };

  const signUp = async ({ email, password, name }) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      setToken(token);
      set({ auth: { ...get().auth, user, isAuthenticated: true }, isLoading: false });
    } catch (err) {
      setError(err.message || "Sign up failed");
    }
  };

  const signOut = async () => {
    clearToken();
    set({ auth: { ...get().auth, user: null, isAuthenticated: false } });
  };

  const uploadResume = async ({ file, companyName, jobTitle, jobDescription }) => {
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("companyName", companyName);
    formData.append("jobTitle", jobTitle);
    formData.append("jobDescription", jobDescription);
    return request("/resumes/upload", { method: "POST", body: formData });
  };

  const getResume = async (id) => request(`/resumes/${id}`);
  const listResumes = async () => request("/resumes");
  const deleteResume = async (id) => request(`/resumes/${id}`, { method: "DELETE" });
  const wipeAll = async () => request("/resumes/wipe", { method: "DELETE" });

  const init = () => {
    checkAuthStatus();
  };

  return {
    isLoading: true,
    error: null,
    auth: {
      user: null,
      isAuthenticated: false,
      signIn,
      signUp,
      signOut,
      checkAuthStatus,
    },
    resumes: {
      upload: uploadResume,
      get: getResume,
      list: listResumes,
      delete: deleteResume,
      wipeAll,
    },
    init,
    clearError: () => set({ error: null }),
  };
});
