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
  { id: "summary",      label: "Summary",                icon: User2,        path: "/settings/summary" },
  { id: "account",      label: "Profile",                icon: User2,        path: "/settings/account" },
  { id: "team",         label: "Users",                  icon: UsersIcon,    path: "/settings/team" },
  { id: "integrations", label: "Integrations",           icon: LinkIcon,     path: "/settings/integrations" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/settings/ai" },
  { id: "templates",    label: "Templates & Batching",   icon: FileText,     path: "/settings/templates" },
  { id: "alerts",       label: "Alerts & Notifications", icon: Bell,         path: "/settings/alerts" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/settings/security" },
  { id: "advanced",     label: "Advanced",               icon: SettingsIcon, path: "/settings/advanced" },
];

function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white px-3">Settings</h2>
      </div>
      <nav className="space-y-1">
        {tabs.map(({ id, label, icon: Icon, path }) => (
          <RouterLink
            key={id}
            to={path}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              currentPath === path
                ? "bg-teal-600/10 text-teal-400 font-medium"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
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
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
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
        <Label className="text-sm font-medium text-white">{label}</Label>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
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
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar currentPath={location.pathname} />

      <div className="flex-1 overflow-auto bg-slate-950 p-8">

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Account</h1>
          <p className="text-lg text-slate-400">Manage your profile and personal preferences</p>
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
                    <p className="text-lg font-semibold text-white">{title}</p>
                    {hasName && <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>}
                  </div>
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
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
                <p className="text-sm text-slate-400">
                  Choose a strong password to keep your account secure
                </p>
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="outline"
                  className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white flex-shrink-0 ml-8"
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
                <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="small"   className="text-white hover:bg-slate-700">Small</SelectItem>
                  <SelectItem value="medium"  className="text-white hover:bg-slate-700">Medium</SelectItem>
                  <SelectItem value="large"   className="text-white hover:bg-slate-700">Large</SelectItem>
                  <SelectItem value="x-large" className="text-white hover:bg-slate-700">Extra Large</SelectItem>
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
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Edit profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="flex flex-col gap-5 py-2">
            <div className="grid gap-2">
              <Label className="text-slate-300">First Name</Label>
              <Input
                placeholder="First name"
                {...register("firstName")}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-300">Last Name</Label>
              <Input
                placeholder="Last name"
                {...register("lastName")}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              type="button"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-500 hover:bg-teal-600 text-white"
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
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Change password</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="flex flex-col gap-5 py-2">
            <div className="grid gap-2">
              <Label className="text-slate-300">Current Password</Label>
              <Input
                type="password"
                autoComplete="off"
                {...register("currentPassword")}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              {errors?.root?.message && (
                <p className="text-red-400 text-sm">{errors.root.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-300">New Password</Label>
              <Input
                type="password"
                autoComplete="off"
                {...register("newPassword")}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
