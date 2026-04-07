import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@stores/authStore";
import { authApi } from "@api/auth";
import { Send, CheckCircle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  // Resend verification state
  const [resendStatus, setResendStatus] = useState("idle"); // idle | sending | sent | error
  const [resendError, setResendError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrorCode("");
    setResendStatus("idle");
    try {
      setIsLoading(true);
      const user = await login(formData);
      if (user && user.businessId) {
        navigate('/app/dashboard');
      } else if (user) {
        navigate('/setup-workspace');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Incorrect username or password.';
      const code =
        err.response?.data?.error?.code ||
        err.code ||
        '';
      setError(message);
      setErrorCode(code);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    const email = formData.username.trim();
    if (!email || resendStatus === "sending" || resendStatus === "sent") return;
    setResendStatus("sending");
    setResendError("");
    try {
      await authApi.resendVerification(email);
      setResendStatus("sent");
    } catch (err) {
      setResendError(err.message || "Failed to resend. Please try again.");
      setResendStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 font-sans p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-100">

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Please sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {/* Resend verification prompt when email not verified */}
          {errorCode === "EMAIL_NOT_VERIFIED" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              {resendStatus === "sent" ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-green-700 font-medium">
                    <CheckCircle size={15} />
                    Verification email sent!
                  </div>
                  <p className="text-xs text-amber-700 mt-1">Check your inbox and spam/junk folder — it may take a few minutes.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-amber-700 mb-2 text-center">
                    A new verification link will be sent to <span className="font-bold">{formData.username}</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendStatus === "sending"}
                    className="flex items-center justify-center gap-1.5 w-full text-xs font-bold text-amber-800 hover:text-amber-900 underline underline-offset-2 transition disabled:opacity-60"
                  >
                    <Send size={13} />
                    {resendStatus === "sending" ? "Sending..." : "Resend verification email"}
                  </button>
                  {resendStatus === "error" && (
                    <p className="text-xs text-red-600 mt-1 text-center">{resendError}</p>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none"
              placeholder="e.g. admin"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">
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
              className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 shadow-md shadow-slate-300"
          >
            {isLoading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {/* Brand & Version Footer */}
        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-xs text-slate-400">
            v1.4.3 — © 2026 Ayiks Inc.
          </p>
        </div>
      </div>
    </div>
  );
}
