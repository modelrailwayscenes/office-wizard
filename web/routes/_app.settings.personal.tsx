import { redirect } from "react-router";
import type { Route } from "./+types/_app.settings.personal";

export const loader = async (_args: Route.LoaderArgs) => {
  throw redirect("/settings/profile");
};

export default function SettingsPersonal() {
  return null;
}
