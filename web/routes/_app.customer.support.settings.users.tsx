import { useState, useEffect } from "react";
import { useFindMany, useAction, useUser } from "@gadgetinc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../api";
import { Link as RouterLink, useLocation, useSearchParams, useNavigate } from "react-router";
import { User2, Users as UsersIcon, Link as LinkIcon, Layers, Sparkles, FileText, Bell, Shield, Settings as SettingsIcon, Plus, Edit as EditIcon, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { toast } from "sonner";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.string().min(1, "Role is required"),
});

const newUserSchema = userSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type UserFormValues = z.infer<typeof userSchema>;
type NewUserFormValues = z.infer<typeof newUserSchema>;
import { SettingsCloseButton } from "@/components/SettingsCloseButton";

// FIX 2: locale-safe date formatter — avoids SSR/client hydration mismatch
function formatDate(date: string | Date) {
  const d = new Date(date);
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/customer/support/settings/summary" },
  { id: "profile",      label: "Profile",                icon: User2,        path: "/customer/support/settings/profile" },
  { id: "users",         label: "Users",                  icon: UsersIcon,    path: "/customer/support/settings/users" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/customer/support/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/customer/support/settings/ai" },
  { id: "templates",    label: "Templates & Batching",   icon: FileText,     path: "/customer/support/settings/templates" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/customer/support/settings/security" },
];

const adminTabs = [
  { id: "integrations", label: "Integrations",           icon: LinkIcon,     path: "/customer/support/settings/integrations" },
  { id: "alerts",       label: "Alerts & Notifications", icon: Bell,         path: "/customer/support/settings/alerts" },
  { id: "advanced",     label: "Advanced Settings",      icon: SettingsIcon, path: "/customer/support/settings/advanced" },
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
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPath === tab.path;
          return (
            <RouterLink
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-teal-600/10 text-teal-400 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{tab.label}</span>
            </RouterLink>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-slate-700" />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin only</p>
            </div>
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentPath === tab.path;
              return (
                <RouterLink
                  key={tab.id}
                  to={tab.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-teal-600/10 text-teal-400 font-medium"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{tab.label}</span>
                </RouterLink>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}

export default function TeamPage() {
  const getPrimaryRoleKey = (roleList: any[] | undefined) => {
    const primaryRole = roleList?.[0];
    return typeof primaryRole === "string" ? primaryRole : primaryRole?.key;
  };
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useUser(api, { select: { roleList: { key: true } } });
  const [showDeleted, setShowDeleted] = useState(false);

  const [{ data: usersRaw, fetching, error }, refetch] = useFindMany(api.user, {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      emailVerified: true,
      lastSignedIn: true,
      roleList: { key: true, name: true },
      logicallyDeleted: true,
    },
    filter: showDeleted
      ? { logicallyDeleted: { equals: true } }
      : {
          OR: [
            { logicallyDeleted: { equals: false } },
            { logicallyDeleted: { isSet: false } }
          ]
        },
  });

  // FIX 1: cast as any[] — resolves all "Property X does not exist on type 'never'" errors
  const users = usersRaw as any[];

  const [editingUser, setEditingUser] = useState<any>(null);

  const editForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", firstName: "", lastName: "", role: "signed-in" },
  });

  const newUserForm = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { email: "", firstName: "", lastName: "", role: "signed-in", password: "" },
  });

  const [{ fetching: updating }] = useAction(api.user.update);
  const [{ fetching: creating }, signUp] = useAction(api.user.signUp);

  const isAddMemberOpen = searchParams.get("addMember") === "1";

  const handleEdit = (user: any) => {
    setEditingUser(user);
    editForm.reset({
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: getPrimaryRoleKey(user.roleList) || "signed-in",
    });
  };

  const handleSave = async (values: UserFormValues) => {
    if (!editingUser) return;
    try {
      await api.user.update(editingUser.id, { email: values.email, firstName: values.firstName, lastName: values.lastName });
      await api.internal.user.update(editingUser.id, { roleList: [values.role] });
      toast.success("User updated successfully");
      setEditingUser(null);
      void refetch();
    } catch (err: any) {
      toast.error("Failed to update user: " + (err.message || err));
    }
  };

  const handleAddUser = async (values: NewUserFormValues) => {
    try {
      await (signUp as any)({ email: values.email, password: values.password });
      const newUsers = await api.user.findMany({ filter: { email: { equals: values.email } } });
      if (newUsers.length > 0) {
        await api.user.update(newUsers[0].id, { firstName: values.firstName, lastName: values.lastName });
        if (values.role !== "signed-in") {
          await api.internal.user.update(newUsers[0].id, { roleList: [values.role] });
        }
      }
      toast.success("User added successfully");
      navigate("/customer/support/settings/users");
      newUserForm.reset();
      void refetch();
    } catch (err) {
      toast.error("Failed to add user");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "system-admin":
      case "sysadmin":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "signed-in":    return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      default:             return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "system-admin":
      case "sysadmin":
        return "Admin";
      case "signed-in":    return "Standard user";
      default:             return role;
    }
  };

  const isUserAdmin = (checkUser: any) => {
    const roleKeys = Array.isArray(checkUser?.roleList)
      ? checkUser.roleList.map((role: any) => (typeof role === "string" ? role : role?.key))
      : [];
    return roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");
  };

  const canModifyUser = (targetUser: any) => {
    // Current user must be admin
    if (!isUserAdmin(user)) return false;
    // Can't modify yourself through this interface
    if (targetUser.id === user.id) return false;
    return true;
  };

  if (error) {
    return (
      <div className="flex-1 overflow-auto bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-red-400">Error loading users: {error.toString()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentPath={location.pathname} user={user} />

      <div className="flex-1 overflow-auto bg-slate-950">
        {/* HEADER with buttons */}
        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Users</h1>
              <p className="text-sm text-slate-400 mt-1">
                {showDeleted ? "Manage deleted users and restore them if needed" : "Manage users and their roles"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowDeleted(!showDeleted)}
                variant="outline"
                className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {showDeleted ? "Show Active Users" : "Show Deleted Users"}
              </Button>
              <Button
                onClick={() => navigate("/customer/support/settings/users?addMember=1")}
                className="bg-teal-500 text-white hover:bg-teal-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
              <SettingsCloseButton className="h-9 w-9 text-slate-300 hover:text-white" />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8">
          {fetching && !users ? (
            <div className="text-slate-400">Loading users...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users?.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col justify-between h-full min-h-[160px]">
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                          {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-semibold text-white truncate">
                              {user.firstName} {user.lastName}
                            </h3>
                            <UnifiedBadge 
                              type={getPrimaryRoleKey(user.roleList) || "signed-in"} 
                              label={getRoleDisplayName(getPrimaryRoleKey(user.roleList) || "")} 
                            />
                          </div>
                          <p className="text-slate-400 text-sm truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-slate-500 mt-3 min-h-[36px]">
                        <span>
                          {user.emailVerified ? (
                            <span className="text-teal-400">✓ Verified</span>
                          ) : (
                            <span className="text-slate-500">Not verified</span>
                          )}
                        </span>
                        {user.lastSignedIn && (
                          <span>Last signed in: {formatDate(user.lastSignedIn)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      {!showDeleted ? (
                        <Button
                          onClick={async () => {
                            if (!canModifyUser(user)) {
                              toast.error("You don't have permission to delete this user");
                              return;
                            }
                            try {
                              await api.internal.user.update(user.id, { logicallyDeleted: true });
                              toast.success("User deleted successfully");
                              void refetch();
                            } catch (err: any) {
                              toast.error("Failed to delete user: " + (err.message || err));
                              console.error("Error deleting user:", err);
                            }
                          }}
                          variant="ghost"
                          disabled={!canModifyUser(user)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Delete</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={async () => {
                            if (!canModifyUser(user)) {
                              toast.error("You don't have permission to restore this user");
                              return;
                            }
                            try {
                              await api.internal.user.update(user.id, { logicallyDeleted: false });
                              toast.success("User restored successfully");
                              void refetch();
                            } catch (err: any) {
                              toast.error("Failed to restore user: " + (err.message || err));
                              console.error("Error restoring user:", err);
                            }
                          }}
                          variant="ghost"
                          disabled={!canModifyUser(user)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-green-400 hover:bg-green-900/20 hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span className="text-sm font-medium">Restore</span>
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          if (!canModifyUser(user)) {
                            toast.error("You don't have permission to edit this user");
                            return;
                          }
                          handleEdit(user);
                        }}
                        variant="ghost"
                        disabled={!canModifyUser(user)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-teal-400 hover:bg-slate-700 hover:text-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <EditIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">Edit</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input id="email" type="email" value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                <Input id="firstName" value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                <Input id="lastName" value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-300">Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="signed-in"    className="text-white hover:bg-slate-700">Standard user</SelectItem>
                    <SelectItem value="system-admin" className="text-white hover:bg-slate-700">Admin (system-admin)</SelectItem>
                    <SelectItem value="sysadmin" className="text-white hover:bg-slate-700">Admin (sysadmin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}
                className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updating}
                className="bg-teal-500 text-white hover:bg-teal-600">
                {updating ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={isAddMemberOpen} onOpenChange={(open) => !open && navigate("/customer/support/settings/users")}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-email" className="text-slate-300">Email</Label>
                <Input id="new-email" type="email" value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-firstName" className="text-slate-300">First Name</Label>
                <Input id="new-firstName" value={newUserForm.firstName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-lastName" className="text-slate-300">Last Name</Label>
                <Input id="new-lastName" value={newUserForm.lastName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-300">Password</Label>
                <Input id="new-password" type="password" value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role" className="text-slate-300">Role</Label>
                <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="signed-in"    className="text-white hover:bg-slate-700">Standard user</SelectItem>
                    <SelectItem value="system-admin" className="text-white hover:bg-slate-700">Admin (system-admin)</SelectItem>
                    <SelectItem value="sysadmin" className="text-white hover:bg-slate-700">Admin (sysadmin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => navigate("/customer/support/settings/users")}
                className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white">
                Cancel
              </Button>
              <Button onClick={handleAddUser} disabled={creating}
                className="bg-teal-500 text-white hover:bg-teal-600">
                {creating ? "Adding..." : "Add User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
