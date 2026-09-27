import { useApiStore } from "~/lib/api";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

export const meta = () => [
  { title: "Resumind | Auth" },
  { name: "description", content: "Log into your account" },
];

const Auth = () => {
  const { isLoading, auth } = useApiStore();
  const location = useLocation();
  const next = location.search.split("next=")[1] || "/";
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  useEffect(() => {
    if (auth.isAuthenticated) navigate(next);
  }, [auth.isAuthenticated, next]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "login") {
      auth.signIn({ email: form.email, password: form.password });
    } else {
      auth.signUp({ email: form.email, password: form.password, name: form.name });
    }
  };

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
      <div className="gradient-border shadow-lg">
        <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Welcome</h1>
            <h2>{mode === "login" ? "Log In to Continue Your Job Journey" : "Create an Account"}</h2>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Name"
                className="form-div"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              required
              className="form-div"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              required
              className="form-div"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button className="auth-button" type="submit" disabled={isLoading}>
              <p>{isLoading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}</p>
            </button>
          </form>
          <button className="text-sm text-gray-500 underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>
        </section>
      </div>
    </main>
  );
};

export default Auth;
