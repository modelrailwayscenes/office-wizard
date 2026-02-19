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
  Keyboard,
} from "lucide-react";

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
  const user = await api.user.findOne(userId, {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      roleList: {
        key: true,
        name: true,
      },
    },
  });
  
  if (!user) throw redirect("/sign-in");
  return { session: { user } };
};

// ── Module definitions ──────────────────────────────────────────────
const modules = [
  {
    id: "customer",
    label: "CUSTOMER",
    path: "/",
    // Any path starting with these counts as "in this module"
    activePaths: ["/", "/conversations", "/threads", "/triage", "/templates", "/signatures", "/settings"],
  },
  { id: "finance",   label: "FINANCE",   path: "/finance",   activePaths: ["/finance"] },
  { id: "it",        label: "IT",        path: "/it",        activePaths: ["/it"] },
  { id: "sales",     label: "SHOPIFY",     path: "/sales",     activePaths: ["/sales"] },
  { id: "marketing", label: "MARKETING", path: "/marketing", activePaths: ["/marketing"] },
];

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { session } = loaderData;
  const location = useLocation();
  const user = session.user;

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

  const isModuleActive = (mod: typeof modules[0]) => {
    const path = location.pathname;
    // Special case: "/" should only match exactly "/" for the customer module
    // but customer module also matches all its sub-paths
    if (mod.id === "customer") {
      return mod.activePaths.some((ap) =>
        ap === "/" ? path === "/" : path.startsWith(ap)
      );
    }
    return mod.activePaths.some((ap) => path.startsWith(ap));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50">
      <header className="h-16 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2">
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
              <span className="text-white">office</span>
              <span className="text-teal-400">wizard</span>
            </div>
          </Link>

          {/* Center: Module Buttons */}
          <nav className="hidden md:flex items-center gap-1">
            {modules.map((mod) => {
              const active = isModuleActive(mod);
              return (
                <Link key={mod.id} to={mod.path}>
                  <Button
                    variant="ghost"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    {mod.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions and User */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-9 w-9 text-slate-400 hover:text-white"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 border border-slate-700">
                    <AvatarFallback className="bg-teal-600 text-white font-semibold text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56 bg-slate-900 border-slate-800" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-50">Account</p>
                    <p className="text-xs leading-none text-slate-400">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-slate-800" />

                <DropdownMenuItem asChild>
                  <Link to="/settings/profile" className="cursor-pointer text-slate-300 hover:text-slate-50">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Personal</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer text-slate-300 hover:text-slate-50">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-800" />

                <DropdownMenuItem asChild>
                  <Form method="post" action="/sign-out" className="w-full">
                    <button
                      type="submit"
                      className="w-full flex items-center text-left text-slate-300 hover:text-slate-50"
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
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-64 bg-slate-900 border-slate-800">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800">
                    <Avatar className="h-10 w-10 border border-slate-700">
                      <AvatarFallback className="bg-teal-600 text-white font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-50">Account</span>
                      <span className="text-xs text-slate-400">{user?.email}</span>
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
                              ? "bg-teal-500/15 text-teal-400"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                          }`}
                        >
                          {mod.label}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="mt-auto pt-4 border-t border-slate-800">
                    <Form method="post" action="/sign-out" className="w-full">
                      <Button type="submit" variant="ghost"
                        className="w-full justify-start text-slate-400 hover:text-white"
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
