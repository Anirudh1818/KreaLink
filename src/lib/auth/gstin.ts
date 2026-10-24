/**
 * KreaLink — GSTIN structural checks and registration comparison
 * ----------------------------------------------------------------------------
 * IMPORTANT: a GSTIN that passes these checks is only *well-formed*.
 * It is NOT verified. Registration status and legal name can only come from
 * an authorised GST data source (see src/lib/server/gstProvider.ts).
 */

const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 2-digit GST state / UT codes. */
export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman and Diu", "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction",
};

const GSTIN_PATTERN = /^(\d{2})([A-Z]{5}\d{4}[A-Z])([1-9A-Z])Z([0-9A-Z])$/;

export type GstinFormatResult =
  | { valid: true; normalized: string; stateCode: string; stateName: string; pan: string }
  | { valid: false; normalized: string; error: string };

export function gstinChecksumChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARSET.indexOf(first14[i]!);
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36]!;
}

export function normalizeGstin(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Structural validation only: pattern, state code and check digit. */
export function validateGstinFormat(raw: string): GstinFormatResult {
  const normalized = normalizeGstin(raw);
  if (normalized.length !== 15) {
    return { valid: false, normalized, error: "A GSTIN has exactly 15 characters." };
  }
  const m = normalized.match(GSTIN_PATTERN);
  if (!m) {
    return { valid: false, normalized, error: "This does not match the GSTIN pattern (state code + PAN + entity + Z + check)." };
  }
  const stateCode = m[1]!;
  const stateName = GST_STATE_CODES[stateCode];
  if (!stateName) {
    return { valid: false, normalized, error: `"${stateCode}" is not a recognised GST state code.` };
  }
  if (gstinChecksumChar(normalized.slice(0, 14)) !== normalized[14]) {
    return { valid: false, normalized, error: "The check digit is wrong — please re-check the GSTIN for typos." };
  }
  return { valid: true, normalized, stateCode, stateName, pan: m[2]! };
}

/* ------------------------------------------------------------------ */
/* Comparing an authorised registration record with submitted details  */
/* ------------------------------------------------------------------ */

/** Shape an authorised provider adapter must return. */
export type GstRegistrationRecord = {
  gstin: string;
  legalName: string;
  tradeName?: string;
  status: string;          // e.g. "Active", "Cancelled", "Suspended"
  stateCode?: string;
  registrationDate?: string;
};

export type DetailMismatch = {
  field: "legalName" | "tradeName" | "status" | "state";
  submitted: string;
  registered: string;
  severity: "blocking" | "review";
};

const SUFFIXES = /\b(private|pvt|limited|ltd|llp|inc|incorporated|co|company|opc)\b/g;

export function normalizeBusinessName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareRegistration(
  submitted: { legalName: string; tradeName?: string; stateCode?: string },
  record: GstRegistrationRecord
): DetailMismatch[] {
  const out: DetailMismatch[] = [];
  if (normalizeBusinessName(submitted.legalName) !== normalizeBusinessName(record.legalName)) {
    out.push({ field: "legalName", submitted: submitted.legalName, registered: record.legalName, severity: "blocking" });
  }
  if (
    submitted.tradeName &&
    record.tradeName &&
    normalizeBusinessName(submitted.tradeName) !== normalizeBusinessName(record.tradeName)
  ) {
    out.push({ field: "tradeName", submitted: submitted.tradeName, registered: record.tradeName, severity: "review" });
  }
  if (record.status.toLowerCase() !== "active") {
    out.push({ field: "status", submitted: "Active (expected)", registered: record.status, severity: "blocking" });
  }
  if (submitted.stateCode && record.stateCode && submitted.stateCode !== record.stateCode) {
    out.push({ field: "state", submitted: submitted.stateCode, registered: record.stateCode, severity: "review" });
  }
  return out;
}
