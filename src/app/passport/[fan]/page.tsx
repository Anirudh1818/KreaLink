import { redirect } from "next/navigation";

/**
 * Legacy FanStreak passport route safely redirected to KreaLink Discover talent roster.
 */
export default function PassportPage() {
  redirect("/discover");
}
