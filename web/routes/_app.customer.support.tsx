import { Outlet, useOutletContext } from "react-router";
import type { AuthOutletContext } from "./_app";

export default function CustomerSupportLayout() {
  const context = useOutletContext<AuthOutletContext>() ?? {};
  return <Outlet context={context} />;
}
