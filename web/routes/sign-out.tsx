import { redirect } from "react-router";
import type { Route } from "./+types/sign-out";

async function doSignOut(context: Route.ActionArgs["context"] | Route.LoaderArgs["context"]) {
  const { session } = context;

  // End the authenticated session (this is the real logout)
  if (session) {
    await session.end();
  }

  // 303 for POST -> GET redirect safety
  return redirect("/sign-in", { status: 303 });
}

export const action = async ({ context }: Route.ActionArgs) => {
  return doSignOut(context);
};

export const loader = async ({ context }: Route.LoaderArgs) => {
  return doSignOut(context);
};

export default function SignOut() {
  return null;
}