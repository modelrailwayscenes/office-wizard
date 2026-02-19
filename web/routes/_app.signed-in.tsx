import { redirect } from "react-router";
import type { Route } from "./+types/_app.signed-in";

export const loader = async ({ context }: Route.LoaderArgs) => {
  return redirect("/");
};

export default function () {
  return null;
}