import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@stores/authStore";
import { authApi } from "@api/auth";
import { Loader2, XCircle, Send, CheckCircle } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const [status, setStatus] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const hasAttempted = useRef(false);

  // Resend state
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("idle"); // idle | sending | sent | error
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found.");
      return;
    }

    const processVerification = async () => {
      try {
        await verifyEmail(token);
        setStatus("success");
        setTimeout(() => navigate("/setup-workspace", { replace: true }), 500);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err.message || "Verification failed."
        );
      }
    };

    processVerification();
  }, []);

  const handleResend = async () => {
    if (!resendEmail.trim() || resendStatus === "sending" || resendStatus === "sent") return;
    setResendStatus("sending");
    setResendError("");
    try {
      await authApi.resendVerification(resendEmail.trim());
      setResendStatus("sent");
    } catch (err) {
      setResendError(err.message || "Failed to resend. Please try again.");
      setResendStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 text-black animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">
              Verifying Email...
            </h2>
            <p className="text-gray-500 mt-2">
              Please wait while we confirm your link.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <Loader2 className="w-12 h-12 text-black animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">
              Verified! Redirecting...
            </h2>
          </>
        )}
        {status === "error" && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">
              Verification Failed
            </h2>
            <p className="text-red-600 mt-2 mb-6 font-medium text-sm">
              {errorMessage}
            </p>

            {/* Resend section */}
            <div className="border-t border-gray-100 pt-5 mb-4 text-left">
              <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                Need a new verification link?
              </p>

              {resendStatus === "sent" ? (
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
                    <CheckCircle size={16} />
                    New verification link sent!
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Check your inbox and spam/junk folder — it may take a few minutes.</p>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 text-sm transition focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100 outline-none mb-2"
                  />
                  <button
                    onClick={handleResend}
                    disabled={!resendEmail.trim() || resendStatus === "sending"}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-900 rounded-lg transition disabled:opacity-50"
                  >
                    <Send size={15} />
                    {resendStatus === "sending" ? "Sending..." : "Resend Verification Email"}
                  </button>
                  {resendStatus === "error" && (
                    <p className="text-xs text-red-600 mt-2 text-center">{resendError}</p>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => navigate("/signup")}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium w-full transition-colors text-sm"
            >
              Back to Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
