import { redirect } from "react-router";
import type { Route } from "./+types/_app.customer.support.signed-in";

export const loader = async ({ context }: Route.LoaderArgs) => {
  return redirect("/customer/support");
};

export default function () {
  return null;
}