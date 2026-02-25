import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as GadgetProvider } from "@gadgetinc/react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { Suspense } from "react";
import api from "./api";
import "./app.css";
import { ProductionErrorBoundary, DevelopmentErrorBoundary } from "gadget-server/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import type { GadgetConfig } from "gadget-server";
import type { Route } from "./+types/root";

const isProduction = process.env.NODE_ENV === "production";
const themeBootstrapScript = `
(() => {
  try {
    const key = "ow:theme";
    const stored = localStorage.getItem(key);
    const pref = stored === "light" || stored === "dark" || stored === "system" ? stored : "dark";
    const resolved = pref === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : pref;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  } catch (_) {
    document.documentElement.classList.add("dark");
  }
})();
`;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds - cache conversations/dashboard data
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export const links = () => [];

export const meta = () => [
  { charset: "utf-8" },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { title: "Gadget React Router app" },
];

export type RootOutletContext = {
  gadgetConfig: GadgetConfig;
};

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { gadgetConfig } = context;

  return {
    gadgetConfig,
  };
};

export default function App({ loaderData }: Route.ComponentProps) {
  const { gadgetConfig } = loaderData;

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <Meta />
        <Links />
        {!isProduction && <script type="module" src="/@vite/client" async />}
      </head>
      <body>
        <Suspense>
          <QueryClientProvider client={queryClient}>
          <GadgetProvider api={api}>
            <Outlet context={{ gadgetConfig }} />
            <Toaster richColors />
            <RadixToaster />
          </GadgetProvider>
          </QueryClientProvider>
        </Suspense>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Default Gadget error boundary component
// This can be replaced with your own custom error boundary implementation
// For more info, checkout https://reactrouter.com/how-to/error-boundary#1-add-a-root-error-boundary
export const ErrorBoundary = isProduction ? ProductionErrorBoundary : DevelopmentErrorBoundary;