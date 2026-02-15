import type { GadgetSettings } from "gadget-server";

export const settings: GadgetSettings = {
  type: "gadget/settings/v1",
  frameworkVersion: "v1.5.0",
  plugins: {
    connections: {
      chatgpt: { authorizationPath: "/authorize" },
      openai: true,
    },
    authentications: {
      settings: {
        redirectOnSignIn: "/",
        signInPath: "/sign-in",
        unauthorizedUserRedirect: "signInPath",
        defaultSignedInRoles: ["signed-in"],
      },
      methods: {
        emailPassword: true,
        googleOAuth: {
          scopes: ["email", "profile"],
          offlineAccess: false,
        },
      },
    },
  },
};
