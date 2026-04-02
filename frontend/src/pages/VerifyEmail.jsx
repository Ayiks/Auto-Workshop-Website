import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuthStore } from "@stores/authStore";
import { Loader2, XCircle } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams(); 
  const token = searchParams.get("token"); // ✅ reads ?token=xxx
  const navigate = useNavigate();
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const [status, setStatus] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const hasAttempted = useRef(false);

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
          err.response?.data?.message || err.message || "Verification failed."
        );
      }
    };

    processVerification();
  }, []);

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
            <button
              onClick={() => navigate("/signup")}
              className="px-6 py-3 bg-black hover:bg-gray-900 text-white rounded-lg font-bold w-full transition-colors"
            >
              Back to Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
