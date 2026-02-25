import { useState, useEffect } from "react";
import { useOutletContext, useRevalidator, Link as RouterLink, useLocation } from "react-router";
import { useAction } from "@gadgetinc/react";
import { useUser } from "@gadgetinc/react";
import { useActionForm } from "@gadgetinc/react";
import { api } from "../api";
import type { AuthOutletContext } from "./_app";
import { UserIcon } from "@/components/shared/UserIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  User2, Users as UsersIcon, Link as LinkIcon, Layers,
  Sparkles, FileText, Bell, Shield, Settings as SettingsIcon,
  UserCircle, Lock, Accessibility,
} from "lucide-react";

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/customer/support/settings/summary" },
  { id: "account",      label: "Profile",                icon: User2,        path: "/customer/support/settings/profile" },
  { id: "team",         label: "Users",                  icon: UsersIcon,    path: "/customer/support/settings/users" },
  { id: "integrations", label: "Integrations",           icon: LinkIcon,     path: "/customer/support/settings/integrations" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/customer/support/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/customer/support/settings/ai" },
  { id: "templates",    label: "Templates & Batching",   icon: FileText,     path: "/customer/support/settings/templates" },
  { id: "alerts",       label: "Alerts & Notifications", icon: Bell,         path: "/customer/support/settings/alerts" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/customer/support/settings/security" },
  { id: "advanced",     label: "Advanced",               icon: SettingsIcon, path: "/customer/support/settings/advanced" },
];

function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <div className="w-64 bg-card/50 border-r border-border p-4 flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground px-3">Settings</h2>
      </div>
      <nav className="space-y-1">
        {tabs.map(({ id, label, icon: Icon, path }) => (
          <RouterLink
            key={id}
            to={path}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              currentPath === path
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{label}</span>
          </RouterLink>
        ))}
      </nav>
    </div>
  );
}

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/50 border border-border rounded-xl overflow-hidden hover:border-border transition-colors">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-700/60">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex-1 pr-8">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center flex-shrink-0">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useOutletContext<AuthOutletContext>();
  const location   = useLocation();
  const revalidator = useRevalidator();

  const [isEditing, setIsEditing]               = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const hasName = user.firstName || user.lastName;
  const title   = hasName ? `${user.firstName} ${user.lastName}` : user.email;

  // ── Accessibility (per-user) ───────────────────────────────────────────────
  const currentUser = useUser(api) as any;
  const [{ fetching: updatingUser }, updateUser] = useAction(api.user.update);

  const [highContrastMode,      setHighContrastMode]      = useState(false);
  const [textSize,              setTextSize]              = useState("medium");
  const [reduceMotion,          setReduceMotion]          = useState(false);
  const [screenReaderOptimised, setScreenReaderOptimised] = useState(false);
  const [keyboardNavEnabled,    setKeyboardNavEnabled]    = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setHighContrastMode(currentUser.highContrastMode           ?? false);
    setTextSize(currentUser.textSize                           ?? "medium");
    setReduceMotion(currentUser.reduceMotion                   ?? false);
    setScreenReaderOptimised(currentUser.screenReaderOptimised ?? false);
    setKeyboardNavEnabled(currentUser.keyboardNavEnabled       ?? true);
  }, [currentUser]);

  const saveUser = async (fields: Record<string, any>) => {
    if (!currentUser?.id) return;
    try {
      await (updateUser as any)({ id: currentUser.id, ...fields });
      toast.success("Preference saved");
    } catch {
      toast.error("Failed to save preference");
    }
  };

  const handleUserToggle = (field: string, setter: (v: boolean) => void) => async (value: boolean) => {
    setter(value);
    try {
      await (updateUser as any)({ id: currentUser.id, [field]: value });
      toast.success("Preference saved");
    } catch {
      toast.error("Failed to save preference");
      setter(!value);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar currentPath={location.pathname} />

      <div className="flex-1 overflow-auto bg-background p-8">

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Account</h1>
          <p className="text-lg text-muted-foreground">Manage your profile and personal preferences</p>
        </div>

        <div className="space-y-4">

          {/* Profile */}
          <Section
            icon={UserCircle}
            title="Profile"
            description="Your name and email address"
          >
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <UserIcon user={user} className="h-16 w-16 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{title}</p>
                    {hasName && <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>}
                  </div>
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Edit profile
                </Button>
              </div>
            </div>
          </Section>

          {/* Password */}
          {!user.googleProfileId && (
            <Section
              icon={Lock}
              title="Password"
              description="Update your account password"
            >
              <div className="px-6 py-5 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Choose a strong password to keep your account secure
                </p>
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="outline"
                  className="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0 ml-8"
                >
                  Change password
                </Button>
              </div>
            </Section>
          )}

          {/* Accessibility */}
          <Section
            icon={Accessibility}
            title="Accessibility"
            description="Your personal display preferences — saved to your account only"
          >
            <SettingRow
              label="High Contrast Mode"
              description="Increase colour contrast for better visibility"
            >
              <Switch
                checked={highContrastMode}
                onCheckedChange={handleUserToggle("highContrastMode", setHighContrastMode)}
                disabled={updatingUser}
              />
            </SettingRow>

            <SettingRow label="Text Size">
              <Select
                value={textSize}
                onValueChange={(v) => { setTextSize(v); saveUser({ textSize: v }); }}
              >
                <SelectTrigger className="w-36 bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="small"   className="text-foreground hover:bg-muted">Small</SelectItem>
                  <SelectItem value="medium"  className="text-foreground hover:bg-muted">Medium</SelectItem>
                  <SelectItem value="large"   className="text-foreground hover:bg-muted">Large</SelectItem>
                  <SelectItem value="x-large" className="text-foreground hover:bg-muted">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              label="Reduce Motion"
              description="Minimise animations and transitions throughout the interface"
            >
              <Switch
                checked={reduceMotion}
                onCheckedChange={handleUserToggle("reduceMotion", setReduceMotion)}
                disabled={updatingUser}
              />
            </SettingRow>

            <SettingRow
              label="Screen Reader Optimisation"
              description="Enhanced compatibility with screen reader software"
            >
              <Switch
                checked={screenReaderOptimised}
                onCheckedChange={handleUserToggle("screenReaderOptimised", setScreenReaderOptimised)}
                disabled={updatingUser}
              />
            </SettingRow>

            <SettingRow
              label="Keyboard Navigation"
              description="Enhanced keyboard navigation and focus indicators"
            >
              <Switch
                checked={keyboardNavEnabled}
                onCheckedChange={handleUserToggle("keyboardNavEnabled", setKeyboardNavEnabled)}
                disabled={updatingUser}
              />
            </SettingRow>
          </Section>

        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={isEditing}
        onClose={() => { setIsEditing(false); revalidator.revalidate(); }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={isChangingPassword}
        onClose={() => { setIsChangingPassword(false); revalidator.revalidate(); }}
      />
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────

const EditProfileModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useOutletContext<AuthOutletContext>();
  const { register, submit, formState: { isSubmitting } } = useActionForm(api.user.update, {
    defaultValues: user,
    onSuccess: onClose,
    send: ["firstName", "lastName"],
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">Edit profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="flex flex-col gap-5 py-2">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">First Name</Label>
              <Input
                placeholder="First name"
                {...register("firstName")}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Last Name</Label>
              <Input
                placeholder="Last name"
                {...register("lastName")}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              type="button"
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-foreground"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ── Change Password Modal ─────────────────────────────────────────────────────

const ChangePasswordModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useOutletContext<AuthOutletContext>();
  const {
    register, submit, reset,
    formState: { errors, isSubmitting },
  } = useActionForm(api.user.changePassword, {
    defaultValues: user,
    onSuccess: onClose,
  });

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">Change password</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="flex flex-col gap-5 py-2">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Current Password</Label>
              <Input
                type="password"
                autoComplete="off"
                {...register("currentPassword")}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
              {errors?.root?.message && (
                <p className="text-red-400 text-sm">{errors.root.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">New Password</Label>
              <Input
                type="password"
                autoComplete="off"
                {...register("newPassword")}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
              {errors?.user?.password?.message && (
                <p className="text-red-400 text-sm">New password {errors.user.password.message}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              type="button"
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-foreground"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
