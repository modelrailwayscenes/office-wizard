import { Outlet, useLocation } from "react-router";
import { CustomerSupportSidebar } from "@/components/CustomerSupportSidebar";

export default function SignaturesLayout() {
  const location = useLocation();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground">
      <CustomerSupportSidebar currentPath={location.pathname} />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
