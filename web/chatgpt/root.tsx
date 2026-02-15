import "./chatgpt.css";

import { Provider as GadgetProvider } from "@gadgetinc/react-chatgpt-apps";
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { useEffect } from "react";
import { Link } from "react-router";
import { api } from "../api";

export const ChatGPTRoot = ({ children }: { children: React.ReactNode }) => {
  useOverrideOpenInAppLinkRoute();

  // render within the GadgetProvider context so react hooks like `useFindMany` and `useFetch` work in ChatGPT widgets
  return (
    <GadgetProvider api={api}>
      <AppsSDKUIProvider linkComponent={Link}>{children}</AppsSDKUIProvider>
    </GadgetProvider>
  );
};

/**
 * Overrides the default route for the link button in the top right corner of the app view when in fullscreen-mode in ChatGPT
 * Without this hook the default link goes to `/index.html`
 */
const useOverrideOpenInAppLinkRoute = (route?: string) => {
  useEffect(() => {
    // replace iframe location.pathname for fullscreen punchout button
    history.replaceState(null, "", route ?? "/");
  }, [route]);
};

export default ChatGPTRoot;