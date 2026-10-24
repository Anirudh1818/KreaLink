/**
 * KreaLink — GST verification provider adapter (server only)
 * ----------------------------------------------------------------------------
 * No provider is bundled. KreaLink does not scrape the GST portal or any other
 * protected service, and never fabricates a lookup result.
 *
 * To enable automated GSTIN lookups, integrate an authorised GST Suvidha
 * Provider (GSP) or licensed verification API:
 *   1. Implement `GstVerificationProvider` for that vendor in this file.
 *   2. Return it from `getGstProvider()` when its credentials are configured
 *      (server-side env vars only — never NEXT_PUBLIC_*).
 *   3. Map the vendor response to `GstRegistrationRecord`.
 * Until then every brand application falls back to manual admin review.
 */

import "server-only";
import type { GstRegistrationRecord } from "@/lib/auth/gstin";

export type GstLookupResult =
  | { kind: "found"; record: GstRegistrationRecord }
  | { kind: "not_found" }
  | { kind: "unavailable"; reason: string };

export interface GstVerificationProvider {
  /** Vendor display name, shown to admins next to results. */
  readonly name: string;
  lookup(gstin: string): Promise<GstLookupResult>;
}

/** Returns the configured provider, or null when none is integrated. */
export function getGstProvider(): GstVerificationProvider | null {
  return null;
}
