import { useEffect, useMemo } from "react";
import { Link, Outlet, redirect, useLocation, Form } from "react-router";
import { Route } from "./+types/_app";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  LogOut,
  Settings,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router";
import { RefinedModuleSwitcher } from "@/components/RefinedModuleSwitcher";
import { GlobalSearchOverlay } from "@/components/GlobalSearchOverlay";
import { RefinedNotificationCenter } from "@/components/RefinedNotificationCenter";

export type AuthOutletContext = {
  user: any;
};

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { session, api } = context;
  const userRef = session?.get("user");
  if (!userRef) throw redirect("/sign-in");
  
  // Handle different possible formats of the user reference
  // Could be: string ID, { _link: string }, or { id: string }
  let userId: string;
  if (typeof userRef === 'string') {
    userId = userRef;
  } else if (userRef._link) {
    userId = userRef._link;
  } else if (userRef.id) {
    userId = userRef.id;
  } else {
    throw redirect("/sign-in");
  }
  
  // Fetch full user record with roles
  let user;
  try {
    user = await api.user.findOne(userId, {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleList: {
          key: true,
          name: true
        },
      },
    });
  } catch (error) {
    // User not found or deleted - redirect to sign in
    console.error('Failed to load user:', error);
    throw redirect("/sign-in");
  }
  
  if (!user) throw redirect("/sign-in");
  
  console.log('🔍 DEBUG LOADER - user:', user);
  console.log('🔍 DEBUG LOADER - user.roleList:', user?.roleList);
  console.log('🔍 DEBUG LOADER - typeof user.roleList:', typeof user?.roleList);
  console.log('🔍 DEBUG LOADER - Array.isArray(user.roleList):', Array.isArray(user?.roleList));
  
  let productionSchedulerEnabled = false;
  let financeModuleEnabled = false;
  try {
    const appConfig = await api.appConfiguration.findFirst({
      select: { productionSchedulerEnabled: true, financeModuleEnabled: true } as any,
    });
    productionSchedulerEnabled = Boolean((appConfig as any)?.productionSchedulerEnabled);
    financeModuleEnabled = Boolean((appConfig as any)?.financeModuleEnabled);
  } catch (error) {
    console.error("Failed to load module feature flags, defaulting to disabled", error);
  }

  return {
    session: { user },
    features: {
      productionScheduler: productionSchedulerEnabled,
      financeModule: financeModuleEnabled,
    },
  };
};

// ── Module definitions ──────────────────────────────────────────────
const BASE_MODULES = [
  {
    id: "customer",
    label: "CUSTOMER",
    path: "/customer/support",
    // Any path starting with these counts as "in this module"
    activePaths: ["/customer/support", "/customer/support/conversations", "/customer/support/threads", "/customer/support/triage-queue", "/customer/support/triage", "/customer/support/templates", "/customer/support/signatures", "/customer/support/settings"],
  },
  { id: "finance",   label: "FINANCE",   path: "/finance",   activePaths: ["/finance"] },
  { id: "it",        label: "IT",        path: "/it",        activePaths: ["/it"] },
  { id: "sales",     label: "SHOPIFY",     path: "/sales",     activePaths: ["/sales"] },
  { id: "marketing", label: "MARKETING", path: "/marketing/newsletter", activePaths: ["/marketing", "/marketing/newsletter"] },
  { id: "production", label: "PRODUCTION", path: "/production", activePaths: ["/production"] },
];

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { session } = loaderData;
  const productionEnabled = Boolean((loaderData as any)?.features?.productionScheduler);
  const financeEnabled = Boolean((loaderData as any)?.features?.financeModule);
  const location = useLocation();
  const navigate = useNavigate();
  const user = session.user;
  const modules = useMemo(
    () =>
      BASE_MODULES.filter((mod) => {
        if (mod.id === "production") return productionEnabled;
        if (mod.id === "finance") return financeEnabled;
        return true;
      }),
    [financeEnabled, productionEnabled]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!location.pathname.startsWith("/customer/support/settings")) {
      const path = `${location.pathname}${location.search}${location.hash}`;
      window.sessionStorage.setItem("ow:lastNonSettingsPath", path);
    }
  }, [location.pathname, location.search, location.hash]);

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return String(user.email).charAt(0).toUpperCase();
    }
    return "U";
  };

  const isModuleActive = (mod: (typeof BASE_MODULES)[0]) => {
    const path = location.pathname;
    if (mod.id === "customer") {
      return mod.activePaths.some((ap) => path === ap || path.startsWith(ap + "/"));
    }
    return mod.activePaths.some((ap) => path.startsWith(ap));
  };

  const activeModule = modules.find((mod) => isModuleActive(mod)) ?? modules[0];
  const roleKeys = Array.isArray(user?.roleList)
    ? user.roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");
  const searchItems = useMemo(
    () => [
      ...modules.map((mod) => ({
        id: `module-${mod.id}`,
        label: mod.label,
        description: "Module",
        group: "Modules",
        path: mod.path,
      })),
      {
        id: "route-triage",
        label: "Triage Queue",
        description: "Customer support",
        group: "Quick Actions",
        path: "/customer/support/triage-queue",
      },
      {
        id: "route-conversations",
        label: "Conversations",
        description: "Customer support",
        group: "Quick Actions",
        path: "/customer/support/conversations",
      },
      {
        id: "route-threads",
        label: "Threads",
        description: "Customer support",
        group: "Quick Actions",
        path: "/customer/support/threads",
      },
      {
        id: "route-newsletter",
        label: "Newsletter Dashboard",
        description: "Marketing",
        group: "Quick Actions",
        path: "/marketing/newsletter",
      },
      ...(isAdmin
        ? [
            {
              id: "route-admin-maintenance",
              label: "Admin Maintenance",
              description: "Office Wizard",
              group: "Quick Actions",
              path: "/admin/maintenance",
            },
          ]
        : []),
    ],
    [isAdmin, modules]
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="h-16 bg-card border-b border-border sticky top-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/customer/support" className="flex items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path
                d="M16 4L18.472 11.056L25.657 8.343L22.944 15.528L30 18L22.944 20.472L25.657 27.657L18.472 24.944L16 32L13.528 24.944L6.343 27.657L9.056 20.472L2 18L9.056 15.528L6.343 8.343L13.528 11.056L16 4Z"
                fill="#2DD4BF"
              />
            </svg>
            <div className="text-lg font-semibold">
              <span>office</span>
              <span className="text-primary">wizard</span>
            </div>
          </Link>

          {/* Center: Module Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <RefinedModuleSwitcher modules={modules} activeModuleId={activeModule.id} onSelect={(mod) => navigate(mod.path)} />
            <GlobalSearchOverlay items={searchItems} />
          </div>

          {/* Right: Actions and User */}
          <div className="flex items-center gap-3">
            <RefinedNotificationCenter />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/customer/support/settings/profile" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Personal</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/customer/support/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>

                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/maintenance" className="cursor-pointer">
                      <Wrench className="mr-2 h-4 w-4" />
                      <span>Admin Maintenance</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Form method="post" action="/sign-out" className="w-full">
                    <button
                      type="submit"
                      className="w-full flex items-center text-left"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </Form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Account</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </div>

                  <nav className="flex flex-col gap-2">
                    {modules.map((mod) => {
                      const active = isModuleActive(mod);
                      return (
                        <Link
                          key={mod.id}
                          to={mod.path}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          }`}
                        >
                          {mod.label}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="mt-auto pt-4 border-t border-border">
                    <Form method="post" action="/sign-out" className="w-full">
                      <Button type="submit" variant="ghost"
                        className="w-full justify-start"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign out</span>
                      </Button>
                    </Form>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
