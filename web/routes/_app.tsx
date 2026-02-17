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
  DropdownMenuSubContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  LogOut,
  Settings,
  Keyboard,
  ChevronDown,
  Sparkles,
  Layers,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

export type AuthOutletContext = {
  user: any;
};

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { session } = context;
  const user = session?.get("user");
  if (!user) throw redirect("/sign-in");
  return { session: { user } };
};

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { session } = loaderData;
  const location = useLocation();
  const user = session.user;

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [customerServiceOpen, setCustomerServiceOpen] = useState(false);

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

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
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

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Customer Service dropdown */}
            <DropdownMenu open={customerServiceOpen} onOpenChange={setCustomerServiceOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/") || isActive("/conversations") || isActive("/threads") || isActive("/triage") || isActive("/templates") || isActive("/settings")
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  Customer
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="bg-slate-900 border-slate-800 w-64"
                align="start"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/"
                    className="cursor-pointer flex items-start gap-3 p-3"
                    onClick={() => setCustomerServiceOpen(false)}
                  >
                    <Layers className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-50">Dashboard</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Overview and quick stats
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    to="/conversations"
                    className="cursor-pointer flex items-start gap-3 p-3"
                    onClick={() => setCustomerServiceOpen(false)}
                  >
                    <MessageSquare className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-50">Conversations</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        All email threads
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    to="/threads"
                    className="cursor-pointer flex items-start gap-3 p-3"
                    onClick={() => setCustomerServiceOpen(false)}
                  >
                    <MessageSquare className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-50">Threads</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Debug view
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    to="/triage"
                    className="cursor-pointer flex items-start gap-3 p-3"
                    onClick={() => setCustomerServiceOpen(false)}
                  >
                    <Layers className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-50">Triage</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Process emails
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-start gap-3">
    <Layers className="mt-1 h-5 w-5 text-teal-400" />
    <div className="flex flex-col">
      <span className="text-base font-semibold text-white">Templates</span>
      <span className="text-sm text-slate-400">Response templates</span>
    </div>
  </DropdownMenuSubTrigger>

  <DropdownMenuSubContent className="w-64">
    <DropdownMenuItem asChild>
      <Link to="/templates" className="flex items-center gap-2">
        <span className="text-sm font-medium">Templates</span>
      </Link>
    </DropdownMenuItem>

    <DropdownMenuItem asChild>
      <Link to="/signatures" className="flex items-center gap-2">
        <span className="text-sm font-medium">Signatures</span>
      </Link>
    </DropdownMenuItem>
  </DropdownMenuSubContent>
</DropdownMenuSub>

                <DropdownMenuItem asChild>
                  <Link
                    to="/settings"
                    className="cursor-pointer flex items-start gap-3 p-3"
                    onClick={() => setCustomerServiceOpen(false)}
                  >
                    <Settings className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-50">Settings</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Configure service
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Templates dropdown */}
            <DropdownMenu open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/templates") || isActive("/signatures")
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  Templates
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-900 border-slate-800" align="start">
                <DropdownMenuItem asChild>
                  <Link
                    to="/templates"
                    className="cursor-pointer text-slate-300 hover:text-slate-50"
                    onClick={() => setTemplatesOpen(false)}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    <span>Templates</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/signatures"
                    className="cursor-pointer text-slate-300 hover:text-slate-50"
                    onClick={() => setTemplatesOpen(false)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Signatures</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


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
                    <Link to="/"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive("/") && !isActive("/triage") && !isActive("/conversations") &&
                        !isActive("/templates") && !isActive("/signatures") && !isActive("/settings")
                          ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >Customer Service</Link>
                    <Link to="/"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive("/") && !isActive("/triage") && !isActive("/conversations") &&
                        !isActive("/templates") && !isActive("/signatures") && !isActive("/settings")
                          ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >Dashboard</Link>
                    <Link to="/conversations"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive("/conversations") ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >Conversations</Link>
                    <Link to="/triage"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive("/triage") ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >Triage</Link>
                    <Link to="/templates"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive("/templates") ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >Templates</Link>
                    <Link to="/signatures"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive("/signatures") ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >Signatures</Link>
                    <Link to="/settings"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive("/settings") ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >Settings</Link>
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
