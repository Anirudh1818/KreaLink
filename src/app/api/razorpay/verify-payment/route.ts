import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay key secret is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();

    const razorpay_order_id = String(body.razorpay_order_id || "");
    const razorpay_payment_id = String(body.razorpay_payment_id || "");
    const razorpay_signature = String(body.razorpay_signature || "");

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing Razorpay payment verification fields." },
        { status: 400 }
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Razorpay verify-payment error:", error);

    return NextResponse.json(
      { error: "Failed to verify Razorpay payment." },
      { status: 500 }
    );
  }
}
