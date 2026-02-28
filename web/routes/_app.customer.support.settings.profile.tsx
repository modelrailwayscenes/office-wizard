import { useState, useEffect } from "react";
import { useOutletContext, useRevalidator, Link as RouterLink, useLocation, useNavigate } from "react-router";
import { useAction, useGlobalAction, useUser } from "@gadgetinc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../api";
import type { AuthOutletContext } from "./_app";
import { UserIcon } from "@/components/shared/UserIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import {
  ThemePreference,
  applyTheme,
  getStoredThemePreference,
  persistThemePreference,
} from "@/lib/theme";
import {
  User2, Users as UsersIcon, Link as LinkIcon, Layers,
  Sparkles, FileText, Bell, Shield, Settings as SettingsIcon,
  UserCircle, Lock, Accessibility, Sun, Moon, Monitor,
} from "lucide-react";
import { SettingsCloseButton } from "@/components/SettingsCloseButton";
import { SettingsScopePill } from "@/components/settings/SettingsScopePill";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/customer/support/settings/summary" },
  { id: "profile",      label: "Profile",                icon: User2,        path: "/customer/support/settings/profile" },
  { id: "users",        label: "Users",                  icon: UsersIcon,    path: "/customer/support/settings/users" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/customer/support/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/customer/support/settings/ai" },
  { id: "templates",    label: "Playbooks & Batching",   icon: FileText,     path: "/customer/support/settings/templates" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/customer/support/settings/security" },
];

// Admin-only tabs
function Sidebar({ currentPath, user }: { currentPath: string; user: any }) {
  const roleKeys = Array.isArray(user?.roleList)
    ? user.roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");
  const visibleTabs = isAdmin ? tabs : tabs.filter((tab) => tab.id === "profile");
  
  return (
    <div className="w-64 bg-card/50 border-r border-border p-4 flex-shrink-0">
      <div className="mb-6 flex items-center justify-between px-3">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <SettingsCloseButton className="h-8 w-8 text-muted-foreground hover:text-foreground" />
      </div>
      <nav className="space-y-1">
        {visibleTabs.map(({ id, label, icon: Icon, path }) => (
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
        
        {/* Admin-only section */}
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
      <div className="divide-y divide-border">{children}</div>
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
  const { user: contextUser } = useOutletContext<AuthOutletContext>() ?? {};
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
  const [{ fetching: changingPassword }, changeOwnPassword] = useGlobalAction(api.changeOwnPassword);

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

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", email: "", role: "signed-in" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // User preferences
  const [highContrastMode, setHighContrastMode] = useState((user as any)?.highContrastMode ?? false);
  const [reduceMotion, setReduceMotion]         = useState((user as any)?.reduceMotion ?? false);
  const [textSize, setTextSize]                 = useState((user as any)?.textSize || "medium");
  const [themePreference, setThemePreference]   = useState<ThemePreference>("dark");

  useEffect(() => {
    if (!loggedInUser) return; // Wait for user data to load
    setHighContrastMode(loggedInUser.highContrastMode ?? false);
    setReduceMotion(loggedInUser.reduceMotion ?? false);
    setTextSize(loggedInUser.textSize || "medium");
    const primaryRole = loggedInUser.roleList?.[0];
    const primaryRoleKey = typeof primaryRole === "string" ? primaryRole : primaryRole?.key;
    profileForm.reset({
      firstName: loggedInUser.firstName || "",
      lastName: loggedInUser.lastName || "",
      email: loggedInUser.email || "",
      role: primaryRoleKey || "signed-in",
    });
  }, [loggedInUser]);

  useEffect(() => {
    const preference = getStoredThemePreference();
    setThemePreference(preference);
    applyTheme(preference);
  }, []);

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

  const handleProfileSave = async (values: ProfileFormValues) => {
    if (!user?.id) return;
    try {
      await updateUser({
        id: user.id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
      });
      if (isAdmin && values.role) {
        await api.internal.user.update(user.id, { roleList: [values.role] });
      }
      toast.success("Profile updated successfully");
      setIsEditing(false);
      revalidator.revalidate();
    } catch (err: any) {
      toast.error("Failed to update profile: " + (err.message || err));
    }
  };

  const handleThemePreferenceChange = (value: ThemePreference) => {
    setThemePreference(value);
    persistThemePreference(value);
    applyTheme(value);
    toast.success("Theme updated");
  };

  // Use loggedInUser for display to ensure consistent server/client rendering
  const displayUser = loggedInUser || contextUser;
  const hasName = Boolean(displayUser?.firstName || displayUser?.lastName);
  const title = hasName
    ? [displayUser?.firstName, displayUser?.lastName].filter(Boolean).join(" ")
    : displayUser?.email;

  // Show loading state if user data isn't loaded yet
  if (!loggedInUser) {
    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar currentPath={location.pathname} user={displayUser} />
        <div className="flex-1 overflow-auto bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar currentPath={location.pathname} user={displayUser} />

      <div className="flex-1 overflow-auto bg-background">
        {/* HEADER */}
        <div className="border-b border-border bg-card/50 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your profile and personal preferences
              </p>
              <div className="mt-2">
                <SettingsScopePill scope="personal" />
              </div>
            </div>
            <SettingsCloseButton className="h-9 w-9 text-muted-foreground hover:text-foreground" />
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
                        <p className="text-lg font-semibold text-foreground">{title}</p>
                        {hasName && <p className="text-sm text-muted-foreground mt-0.5">{displayUser.email}</p>}
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="ghost"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/70 text-primary hover:bg-muted hover:text-primary/80 transition-colors"
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
                    <p className="text-sm text-muted-foreground">
                      Choose a strong password to keep your account secure
                    </p>
                    <Button
                      onClick={() => setIsChangingPassword(true)}
                      variant="ghost"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/70 text-primary hover:bg-muted hover:text-primary/80 transition-colors flex-shrink-0 ml-4"
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
                  <SelectTrigger className="w-36 bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem value="small" className="text-foreground hover:bg-muted">Small</SelectItem>
                    <SelectItem value="medium" className="text-foreground hover:bg-muted">Medium</SelectItem>
                    <SelectItem value="large" className="text-foreground hover:bg-muted">Large</SelectItem>
                    <SelectItem value="x-large" className="text-foreground hover:bg-muted">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow
                label="Color Theme"
                description="Choose how this app looks for your account"
              >
                <Select
                  value={themePreference}
                  onValueChange={(v) => handleThemePreferenceChange(v as ThemePreference)}
                >
                  <SelectTrigger className="w-40 bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem value="light" className="text-foreground hover:bg-muted">
                      <span className="flex items-center gap-2">
                        <Sun className="h-3.5 w-3.5" />
                        Light
                      </span>
                    </SelectItem>
                    <SelectItem value="dark" className="text-foreground hover:bg-muted">
                      <span className="flex items-center gap-2">
                        <Moon className="h-3.5 w-3.5" />
                        Dark
                      </span>
                    </SelectItem>
                    <SelectItem value="system" className="text-foreground hover:bg-muted">
                      <span className="flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5" />
                        System
                      </span>
                    </SelectItem>
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
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold text-foreground">Edit Profile</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Update your account information</p>
            </DialogHeader>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-5 py-2">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">First Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                          placeholder="Enter first name"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Last Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                          placeholder="Enter last name"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className="h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                          placeholder="your.email@example.com"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                {isAdmin && (
                  <FormField
                    control={profileForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Account Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-muted/50 border-border text-foreground focus:border-primary">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-muted border-border">
                            <SelectItem value="signed-in" className="text-foreground hover:bg-muted">Standard User</SelectItem>
                            <SelectItem value="system-admin" className="text-foreground hover:bg-muted">Administrator (system-admin)</SelectItem>
                            <SelectItem value="sysadmin" className="text-foreground hover:bg-muted">Administrator (sysadmin)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-destructive" />
                      </FormItem>
                    )}
                  />
                )}
                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={updatingUser} className="border-border hover:bg-muted hover:text-foreground">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatingUser} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                    {updatingUser ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Change Password Dialog */}
      {isChangingPassword && (
        <Dialog open={isChangingPassword} onOpenChange={(open) => { if (!open) passwordForm.reset(); setIsChangingPassword(open); }}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold text-foreground">Change Password</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Update your account password</p>
            </DialogHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(async (values) => {
                try {
                  await (changeOwnPassword as any)({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                  });
                  toast.success("Password updated");
                  setIsChangingPassword(false);
                  passwordForm.reset();
                } catch (error: any) {
                  toast.error(error?.message || "Failed to change password");
                }
              })} className="space-y-5 py-2">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Current Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" className="h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary" placeholder="Enter current password" />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">New Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" className="h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary" placeholder="Enter new password" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Confirm New Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" className="h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary" placeholder="Confirm new password" />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsChangingPassword(false)} className="border-border hover:bg-muted hover:text-foreground">Cancel</Button>
                  <Button type="submit" disabled={changingPassword} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}