import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useGlobalAction } from "@gadgetinc/react";
import { api } from "../api";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetupPage() {
  const navigate = useNavigate();

  const [{ fetching }, createFirstAdmin] = useGlobalAction(api.createFirstAdmin as any);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordMismatch = useMemo(() => {
    return password.length > 0 && confirm.length > 0 && password !== confirm;
  }, [password, confirm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email");
      return;
    }
    if (!password) {
      toast.error("Please enter a password");
      return;
    }
    if (passwordMismatch) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await (createFirstAdmin as any)({ email: email.trim(), password });
      toast.success("Admin account created! Please log in.");
      navigate("/sign-in");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create admin account";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#2E7C93" }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="Office Wizard"
              className="h-16 w-auto"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          <CardTitle className="text-2xl font-bold text-center">First-time setup</CardTitle>
          <CardDescription className="text-center">Create your admin account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
              />
              {passwordMismatch ? <p className="text-sm text-red-600">Passwords do not match</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={fetching}>
              {fetching ? "Creating..." : "Create Admin Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}