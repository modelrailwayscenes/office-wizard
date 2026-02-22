import { useState } from "react";
import { useFindMany, useAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { Link as RouterLink, useLocation, useSearchParams, useNavigate } from "react-router";
import { User2, Users as UsersIcon, Link as LinkIcon, Layers, Sparkles, FileText, Bell, Shield, Settings as SettingsIcon, Plus, Edit as EditIcon, Trash2, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { toast } from "sonner";

// FIX 2: locale-safe date formatter — avoids SSR/client hydration mismatch
function formatDate(date: string | Date) {
  const d = new Date(date);
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const tabs = [
  { id: "summary",      label: "Summary",                icon: User2,        path: "/settings/summary" },
  { id: "profile",      label: "Profile",                icon: User2,        path: "/settings/profile" },
  { id: "users",         label: "Users",                  icon: UsersIcon,    path: "/settings/users" },
  { id: "triage",       label: "Triage & Workflow",      icon: Layers,       path: "/settings/triage" },
  { id: "ai",           label: "AI & Automation",        icon: Sparkles,     path: "/settings/ai" },
  { id: "templates",    label: "Templates & Batching",   icon: FileText,     path: "/settings/templates" },
  { id: "security",     label: "Security & Compliance",  icon: Shield,       path: "/settings/security" },
];

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

  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white px-3">Settings</h2>
      </div>
      <nav className="space-y-1">
        {tabs.map((tab) => {
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
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [{ data: usersRaw, fetching, error }, refetch] = useFindMany(api.user, {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      emailVerified: true,
      lastSignedIn: true,
      logicallyDeleted: true,
      roleList: { key: true, name: true },
    },
    filter: {
      logicallyDeleted: { equals: showDeleted },
    },
  });

  // FIX 1: cast as any[] — resolves all "Property X does not exist on type 'never'" errors
  const users = usersRaw as any[];

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "",
  });

  const [newUserForm, setNewUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "signed-in",
    password: "",
  });

  const [{ fetching: updating }] = useAction(api.user.update);
  const [{ fetching: creating }, signUp] = useAction(api.user.signUp);

  const isAddMemberOpen = searchParams.get("addMember") === "1";

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      email:     user.email      || "",
      firstName: user.firstName  || "",
      lastName:  user.lastName   || "",
      role:      getPrimaryRoleKey(user.roleList) || "signed-in",
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    try {
      // Update the user's basic info
      await api.user.update(editingUser.id, {
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
      });
      
      // Update the user's role using the internal API
      await api.internal.user.update(editingUser.id, {
        roleList: [editForm.role],
      });
      
      toast.success("User updated successfully");
      setEditingUser(null);
      void refetch();
    } catch (err: any) {
      toast.error("Failed to update user: " + (err.message || err));
      console.error("Error updating user:", err);
    }
  };

  const handleAddUser = async () => {
    try {
      await (signUp as any)({ email: newUserForm.email, password: newUserForm.password });

      const newUsers = await api.user.findMany({ filter: { email: { equals: newUserForm.email } } });

      if (newUsers.length > 0) {
        await api.user.update(newUsers[0].id, { firstName: newUserForm.firstName, lastName: newUserForm.lastName });
        if (newUserForm.role !== "signed-in") {
          await api.internal.user.update(newUsers[0].id, { roleList: [newUserForm.role] });
        }
      }

      toast.success("User added successfully");
      navigate("/settings/team");
      setNewUserForm({ email: "", firstName: "", lastName: "", role: "signed-in", password: "" });
      void refetch();
    } catch (err) {
      toast.error("Failed to add user");
      console.error(err);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    
    try {
      await api.internal.user.update(deletingUserId, {
        logicallyDeleted: true,
      });
      
      toast.success("User deleted successfully");
      setDeletingUserId(null);
      void refetch();
    } catch (err: any) {
      toast.error("Failed to delete user: " + (err.message || err));
      console.error("Error deleting user:", err);
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      await api.internal.user.update(userId, {
        logicallyDeleted: false,
      });
      
      toast.success("User restored successfully");
      void refetch();
    } catch (err: any) {
      toast.error("Failed to restore user: " + (err.message || err));
      console.error("Error restoring user:", err);
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
        return "ADMIN";
      case "signed-in":    return "STANDARD USER";
      default:             return role;
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Users</h1>
              <p className="text-sm text-slate-400 mt-1">
                {showDeleted ? "Manage deleted users and restore them if needed" : "Manage users and their roles"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Label className="text-sm text-slate-300">Active</Label>
                <Switch
                  checked={showDeleted}
                  onCheckedChange={setShowDeleted}
                  className="data-[state=checked]:bg-teal-500"
                />
                <Label className="text-sm text-slate-300">Logically Deleted</Label>
              </div>
              <Button
                onClick={() => navigate("/settings/team?addMember=1")}
                className="bg-teal-500 text-white hover:bg-teal-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
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
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col gap-4">
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
                    <div className="flex flex-col gap-2 text-sm text-slate-500">
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
                    <div className="flex items-center gap-2 justify-end">
                      {!showDeleted ? (
                        <Button
                          onClick={() => setDeletingUserId(user.id)}
                          variant="ghost"
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-700/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Delete</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleRestoreUser(user.id)}
                          variant="ghost"
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-700/50 text-green-400 hover:bg-green-900/20 hover:text-green-300 transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span className="text-sm font-medium">Restore</span>
                        </Button>
                      )}
                      <Button
                        onClick={() => handleEdit(user)}
                        variant="ghost"
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-700/50 text-teal-400 hover:bg-slate-700 hover:text-teal-300 transition-colors"
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-2xl">
                <AlertCircle className="h-6 w-6 text-red-400" />
                Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                Are you sure you want to delete this user? This action can be undone by restoring the user from the deleted users list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add User Dialog */}
        <Dialog open={isAddMemberOpen} onOpenChange={(open) => !open && navigate("/settings/team")}>
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
              <Button variant="outline" onClick={() => navigate("/settings/team")}
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
