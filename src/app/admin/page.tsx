import { redirect } from "next/navigation";

/**
 * Legacy admin route safely redirected to KreaLink Creator Studio command center.
 */
export default function AdminPage() {
  redirect("/creator-studio");
}
