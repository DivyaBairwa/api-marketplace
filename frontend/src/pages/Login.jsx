import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "ADMIN" ? "/admin" : from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function quickFill(kind) {
    if (kind === "admin") {
      setEmail("admin@marketplace.com");
      setPassword("Admin@123");
    } else {
      setEmail("user@marketplace.com");
      setPassword("User@123");
    }
  }

  return (
    <div className="min-h-screen bg-auth-grad text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">API Marketplace</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-white/70">Sign in to access your dashboard and APIs.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-slate-900">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">
              Quick-fill demo accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => quickFill("admin")} className="btn-secondary text-xs">
                Admin
              </button>
              <button onClick={() => quickFill("user")} className="btn-secondary text-xs">
                User
              </button>
            </div>
          </div>

          <p className="text-sm text-center text-slate-600 mt-6">
            New here?{" "}
            <Link to="/signup" className="text-brand-600 hover:text-brand-700 font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
