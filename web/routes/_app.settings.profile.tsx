import { useState, useEffect } from "react";
import { useOutletContext, useRevalidator, Link as RouterLink, useLocation, useNavigate } from "react-router";
import { useAction, useUser } from "@gadgetinc/react";
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
import { SettingsCloseButton } from "@/components/SettingsCloseButton";

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/settings/summary" },
  { id: "profile",      label: "Profile",                icon: User2,        path: "/settings/profile" },
  { id: "users",        label: "Users",                  icon: UsersIcon,    path: "/settings/users" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/settings/ai" },
  { id: "templates",    label: "Templates & Batching",   icon: FileText,     path: "/settings/templates" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/settings/security" },
];

// Admin-only tabs
const adminTabs = [
  { id: "integrations", label: "Integrations",           icon: LinkIcon,     path: "/settings/integrations" },
  { id: "alerts",       label: "Alerts & Notifications", icon: Bell,         path: "/settings/alerts" },
  { id: "advanced",     label: "Advanced Settings",      icon: SettingsIcon, path: "/settings/advanced" },
];

function Sidebar({ currentPath, user }: { currentPath: string; user: any }) {
  const roleKeys = Array.isArray(user?.roleList)
    ? user.roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");
  const visibleTabs = isAdmin ? tabs : tabs.filter((tab) => tab.id === "profile");
  
  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6 flex items-center justify-between px-3">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <SettingsCloseButton className="h-8 w-8 text-slate-400 hover:text-white" />
      </div>
      <nav className="space-y-1">
        {visibleTabs.map(({ id, label, icon: Icon, path }) => (
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
        
        {/* Admin-only section */}
        {isAdmin && (
          <>
            <div className="my-4 border-t border-slate-700" />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin only</p>
            </div>
            {adminTabs.map(({ id, label, icon: Icon, path }) => (
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
          </>
        )}
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
  const { user: contextUser } = useOutletContext<AuthOutletContext>();
  const loggedInUser = useUser(api, {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      googleProfileId: true,
      highContrastMode: true,
      reduceMotion: true,
      textSize: true,
      roleList: {
        key: true,
        name: true
      },
    },
  });
  const roleKeys = Array.isArray(loggedInUser?.roleList)
    ? loggedInUser.roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");
  
  // Always use loggedInUser for display to avoid hydration mismatch
  // Only fall back to contextUser for non-display operations
  const user = loggedInUser || contextUser;
  
  const location = useLocation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [{ fetching: updatingUser, error: updateError }, updateUser] = useAction(api.user.update);

  const saveUser = async (fields: Record<string, any>) => {
    if (!user?.id) return;
    try {
      await (updateUser as any)({ id: user.id, ...fields });
      toast.success("Preference saved");
    } catch {
      toast.error("Failed to save preference");
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Edit profile form state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");

  // User preferences
  const [highContrastMode, setHighContrastMode] = useState(user.highContrastMode ?? false);
  const [reduceMotion, setReduceMotion]         = useState(user.reduceMotion ?? false);
  const [textSize, setTextSize]                 = useState(user.textSize || "medium");

  useEffect(() => {
    if (!loggedInUser) return; // Wait for user data to load
    setHighContrastMode(loggedInUser.highContrastMode ?? false);
    setReduceMotion(loggedInUser.reduceMotion ?? false);
    setTextSize(loggedInUser.textSize || "medium");
    setEditFirstName(loggedInUser.firstName || "");
    setEditLastName(loggedInUser.lastName || "");
    setEditEmail(loggedInUser.email || "");
    const primaryRole = loggedInUser.roleList?.[0];
    const primaryRoleKey = typeof primaryRole === "string" ? primaryRole : primaryRole?.key;
    setEditRole(primaryRoleKey || "signed-in");
  }, [loggedInUser]);

  const handleUserToggle = (field: string, setter: (v: boolean) => void) => async (value: boolean) => {
    setter(value);
    try {
      await saveUser({ [field]: value });
      revalidator.revalidate();
      toast.success("Preference updated");
    } catch (err) {
      toast.error("Failed to update preference");
      setter(!value);
    }
  };

  const handleProfileSave = async () => {
    if (!user?.id) return;
    try {
      // Update basic user info
      await updateUser({
        id: user.id,
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
      });
      
      if (isAdmin) {
        // Update role using internal API
        await api.internal.user.update(user.id, {
          roleList: [editRole],
        });
      }
      
      toast.success("Profile updated successfully");
      setIsEditing(false);
      revalidator.revalidate();
    } catch (err: any) {
      toast.error("Failed to update profile: " + (err.message || err));
      console.error("Error updating profile:", err);
    }
  };

  // Use loggedInUser for display to ensure consistent server/client rendering
  const displayUser = loggedInUser || contextUser;
  const hasName = Boolean(displayUser.firstName || displayUser.lastName);
  const title = hasName
    ? [displayUser.firstName, displayUser.lastName].filter(Boolean).join(" ")
    : displayUser.email;

  // Show loading state if user data isn't loaded yet
  if (!loggedInUser) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar currentPath={location.pathname} user={displayUser} />
        <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar currentPath={location.pathname} user={displayUser} />

      <div className="flex-1 overflow-auto bg-slate-950">
        {/* HEADER */}
        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Profile</h1>
              <p className="text-sm text-slate-400 mt-1">
                Manage your profile and personal preferences
              </p>
            </div>
            <SettingsCloseButton className="h-9 w-9 text-slate-300 hover:text-white" />
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8">
          <div className="space-y-4">

            {/* Personal + Password - 2 column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Profile */}
              <Section
                icon={UserCircle}
                title="Personal"
                description="Your name and email address"
              >
                <div className="px-6 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <UserIcon user={displayUser} className="h-16 w-16 flex-shrink-0" />
                      <div>
                        <p className="text-lg font-semibold text-white">{title}</p>
                        {hasName && <p className="text-sm text-slate-400 mt-0.5">{displayUser.email}</p>}
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="ghost"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-teal-400 hover:bg-slate-700 hover:text-teal-300 transition-colors"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Edit</span>
                    </Button>
                  </div>
                </div>
              </Section>

              {/* Password */}
              {!displayUser.googleProfileId && (
                <Section
                  icon={Lock}
                  title="Password"
                  description="Update your account password"
                >
                  <div className="px-6 py-6 flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                      Choose a strong password to keep your account secure
                    </p>
                    <Button
                      onClick={() => setIsChangingPassword(true)}
                      variant="ghost"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-teal-400 hover:bg-slate-700 hover:text-teal-300 transition-colors flex-shrink-0 ml-4"
                    >
                      <Lock className="h-4 w-4" />
                      <span className="text-sm font-medium">Change</span>
                    </Button>
                  </div>
                </Section>
              )}
            </div>

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
                    <SelectItem value="small" className="text-white hover:bg-slate-700">Small</SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-slate-700">Medium</SelectItem>
                    <SelectItem value="large" className="text-white hover:bg-slate-700">Large</SelectItem>
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
            </Section>

          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      {isEditing && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold text-white">Edit Profile</DialogTitle>
              <p className="text-sm text-slate-400 mt-1">Update your account information</p>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-200">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-200">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  placeholder="Enter last name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-200">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  placeholder="your.email@example.com"
                />
              </div>
              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-slate-200">
                    Account Role
                  </Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger id="role" className="h-10 bg-slate-800/50 border-slate-700 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="signed-in" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                        Standard User
                      </SelectItem>
                      <SelectItem value="system-admin" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                        Administrator (system-admin)
                      </SelectItem>
                      <SelectItem value="sysadmin" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                        Administrator (sysadmin)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)} 
                disabled={updatingUser}
                className="border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleProfileSave}
                disabled={updatingUser}
                className="bg-teal-500 hover:bg-teal-600 text-black font-medium transition-colors"
              >
                {updatingUser ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Change Password Dialog */}
      {isChangingPassword && (
        <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold text-white">Change Password</DialogTitle>
              <p className="text-sm text-slate-400 mt-1">Update your account password</p>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-200">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-slate-200">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  placeholder="Enter new password"
                />
                <p className="text-xs text-slate-500">Must be at least 8 characters long</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
              <Button 
                variant="outline" 
                onClick={() => setIsChangingPassword(false)}
                className="border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </Button>
              <Button className="bg-teal-500 hover:bg-teal-600 text-black font-medium transition-colors">
                Update Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}