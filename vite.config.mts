import { defineConfig } from "vite";
import { gadget } from "gadget-server/vite";
import { reactRouter } from "@react-router/dev/vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { chatGPTWidgetPlugin } from "vite-plugin-chatgpt-widgets";

export default defineConfig({
  plugins: [gadget(), reactRouter(), tailwindcss(), chatGPTWidgetPlugin({ baseUrl: process.env.GADGET_APP_URL })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./web"),
    },
  },
  server: {
    cors: {
      // ensure both the Gadget app and the ChatGPT web sandbox can access your widgets source code cross-origin
      origin: [process.env["GADGET_APP_URL"] || "https://office-wizard--development.gadget.app", /^https:\/\/[A-Za-z0-9_-]+\.web-sandbox\.oaiusercontent\.com$/],
    },
  },
});