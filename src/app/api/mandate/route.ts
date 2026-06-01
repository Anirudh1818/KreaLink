import { NextResponse } from "next/server";

// Creates a daily UPI-autopay subscription (the recurring mandate) against a
// pre-created Razorpay Plan. This is the SERVER side: it uses the secret key,
// which must never reach the browser.
//
// Status: wired but inert until you configure Razorpay. To go live:
//   1. In the Razorpay dashboard create a Plan with period=daily.
//   2. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_DAILY_PLAN_ID.
//   3. On the client, open Razorpay Checkout with the returned subscriptionId
//      so the fan authorizes the mandate (this is the consent + e-mandate
//      step RBI requires; Razorpay handles the pre-debit notifications).
//   4. Verify the subscription webhook before treating support as active.
export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_DAILY_PLAN_ID;

  if (!keyId || !keySecret || !planId) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_DAILY_PLAN_ID.",
      },
      { status: 503 }
    );
  }

  let body: { creator?: string; fanUid?: string; fanName?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!body.fanUid || !body.creator) {
    return NextResponse.json(
      { error: "Missing fanUid or creator." },
      { status: 400 }
    );
  }

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  // total_count is the maximum number of daily debits the mandate authorizes.
  const razorpayResponse = await fetch(
    "https://api.razorpay.com/v1/subscriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: 365,
        customer_notify: 1,
        notes: {
          creator: body.creator,
          fanUid: body.fanUid,
          fanName: body.fanName || "",
        },
      }),
    }
  );

  const data = await razorpayResponse.json();

  if (!razorpayResponse.ok) {
    return NextResponse.json(
      { error: data?.error?.description || "Failed to create subscription." },
      { status: razorpayResponse.status }
    );
  }

  return NextResponse.json({ subscriptionId: data.id, status: data.status });
}
