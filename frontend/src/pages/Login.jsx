import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@stores/authStore";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await login(formData);
    if (result.success) navigate("/dashboard");
    else setError(result.error || "Login failed. Please try again.");
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* LEFT SIDE: FORM */}
      <div className="flex w-full flex-col justify-center px-8 md:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gray Manager
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900">
              Welcome Back
            </h2>
            <p className="mt-2 text-slate-500">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600 animate-pulse">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Username
              </label>
              <input
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none"
                placeholder="e.g. admin"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  Forgot?
                </a>
              </div>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            {/* <p className="text-xs text-gray-500 text-center mb-2">Demo Credentials:</p> */}
            <div className="text-xs text-gray-600 space-y-1">
              {/* <p><span className="font-medium">Admin:</span> admin / password123</p>
              <p><span className="font-medium">Sales:</span> sales1 / password123</p>
              <p><span className="font-medium">Mechanic:</span> mechanic1 / password123</p> */}
            </div>
          </div>
          {/* Brand & Version Footer */}
          <div className="mt-auto pt-10 pb-4 text-center md:text-left">
            <p className="text-sm text-slate-400">
              v1.1.0 — © 2026
              <span className="mx-2 text-slate-300">|</span>
              Created by{" "}
              <span className="font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-default">
                Ayiks Inc.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: IMAGE */}
      <div className="relative hidden w-1/2 md:block">
        <img
          src="https://thumbs.dreamstime.com/b/car-painting-workshop-evening-hours-spray-gun-protective-gear-person-focused-vehicle-using-inside-dimly-376888431.jpg"
          alt="Workshop"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="text-lg font-medium italic">
            "The most efficient workshop management system for modern garages in
            2026."
          </p>
          <div className="mt-4 h-1 w-12 bg-blue-500"></div>
        </div>
      </div>
    </div>
  );
}
