import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../api";

export default function Authorize() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // Prevent multiple calls
    if (hasProcessed) return;

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Handle OAuth errors from Microsoft
      if (error) {
        toast.error(errorDescription || error);
        navigate("/settings/integrations", { replace: true });
        return;
      }

      // Validate required parameters
      if (!code) {
        toast.error("Missing authorization code");
        navigate("/settings/integrations", { replace: true });
        return;
      }

      // Mark as processed to prevent double-calls
      setHasProcessed(true);

      try {
        console.log("Exchanging code for tokens...", { code: code.substring(0, 10) + "..." });
        
        // Call the exchangeCodeForTokens action
        const response = await api.exchangeCodeForTokens({ code, state: state || "" });
        
        console.log("Token exchange response:", response);
        
        // Access the actual result from response.data
        const result = response.data || response;
        
        if (result.success) {
          toast.success("Successfully connected to Outlook");
          navigate("/settings/integrations", { replace: true });
        } else {
          const errorMessage = result.error || "Failed to connect to Outlook";
          console.error("Token exchange failed:", errorMessage);
          toast.error(errorMessage);
          navigate("/settings/integrations", { replace: true });
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to connect to Outlook";
        toast.error(errorMessage);
        navigate("/settings/integrations", { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, hasProcessed]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p className="text-lg text-white">Connecting to Outlook...</p>
        <p className="text-sm text-slate-400 mt-2">Please wait while we complete the authentication...</p>
      </div>
    </div>
  );
}
