import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function SettingsIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings/summary", { replace: true });
  }, [navigate]);

  return null;
}