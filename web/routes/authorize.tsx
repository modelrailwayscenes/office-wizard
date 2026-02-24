import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { toast } from "sonner";
import api from "../api";

export default function Authorize() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (hasProcessed) return;

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        toast.error(errorDescription || error);
        navigate("/customer/support/settings", { replace: true });
        return;
      }

      if (!code) {
        toast.error("Missing authorization code");
        navigate("/customer/support/settings", { replace: true });
        return;
      }

      setHasProcessed(true);

      try {
        const response = await api.exchangeCodeForTokens({ code, state: state || "" });
        const result: any = (response as any)?.data ?? response;

        if (result?.success) {
          toast.success("Successfully connected to Microsoft 365");
          navigate("/customer/support/settings", { replace: true });
          return;
        }

        toast.error(result?.error || "Failed to connect to Microsoft 365");
        navigate("/customer/support/settings", { replace: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to connect to Microsoft 365";
        toast.error(errorMessage);
        navigate("/customer/support/settings", { replace: true });
      }
    };

    void handleCallback();
  }, [searchParams, navigate, hasProcessed]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
        <p className="text-lg text-white">Connecting to Microsoft 365…</p>
        <p className="text-sm text-slate-400 mt-2">
          Please wait while we complete the authentication…
        </p>
      </div>
    </div>
  );
}