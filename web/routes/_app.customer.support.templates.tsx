import { Outlet, useLocation, useNavigate } from "react-router";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TemplatesList } from "@/components/TemplatesList";
import { CustomerSupportSidebar } from "@/components/CustomerSupportSidebar";

export default function TemplatesLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const isTemplatesFormRoute =
    path === `${BASE}/templates/new` || new RegExp(`^${BASE.replace(/\//g, "\\/")}/templates/[^/]+$`).test(path);
  const isTemplatesSection = path === `${BASE}/templates` || path.startsWith(`${BASE}/templates/`);
  const isSignaturesSection = path.startsWith(`${BASE}/signatures`);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <CustomerSupportSidebar currentPath={location.pathname} />
      <div className="flex-1 overflow-auto">
        {isSignaturesSection ? (
          <Outlet />
        ) : isTemplatesSection ? (
          <>
            <TemplatesList />
            {isTemplatesFormRoute && (
              <Sheet open onOpenChange={(open) => !open && navigate(`${BASE}/templates`)}>
                <SheetContent
                  side="right"
                  className="w-full sm:max-w-2xl overflow-y-auto bg-zinc-950 border-zinc-800 p-0"
                >
                  <div className="p-6">
                    <Outlet />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
