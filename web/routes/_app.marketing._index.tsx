import { redirect } from "react-router";

export async function loader() {
  return redirect("/marketing/newsletter");
}

export default function MarketingIndex() {
  return null;
}
