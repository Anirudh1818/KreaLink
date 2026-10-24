"use client";

import BrandDashboardPage from "@/app/brand/page";

/**
 * Direct Campaign & Brief Creation Portal
 * ----------------------------------------------------------------------------
 * Completely open and instant: bypasses any login/credential prompts so
 * you can create and publish a campaign brief directly during live demos
 * and presentations.
 */
export default function DirectPostPage() {
  return <BrandDashboardPage initialTab="create-brief" />;
}
