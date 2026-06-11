import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys are not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();

    const amount = Number(body.amount);
    const creatorId = String(body.creatorId || "");
    const creatorName = String(body.creatorName || "");
    const fanUid = String(body.fanUid || "");
    const fanName = String(body.fanName || "");

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: "Invalid support amount." },
        { status: 400 }
      );
    }

    if (!creatorId || !fanUid) {
      return NextResponse.json(
        { error: "Missing creatorId or fanUid." },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `fanstreak_${Date.now()}`,
      notes: {
        creatorId,
        creatorName,
        fanUid,
        fanName,
        platform: "FanStreak",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error("Razorpay create-order error:", error);

    return NextResponse.json(
      { error: "Failed to create Razorpay order." },
      { status: 500 }
    );
  }
}
