import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEMO_CREATORS, DEMO_BRAND, DEMO_BRIEFS } from "@/lib/demoData";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // 1. Abuse guard: Rate limit seed endpoint (max 6 requests per 10 minutes)
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`seed-${clientIp}`, 6, 10 * 60 * 1000);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many seed requests. Please wait before re-seeding the demo catalog." },
        { status: 429 }
      );
    }

    // 2. Authorization guard: Only allowed in development, or if accompanied by demo header
    const isDev = process.env.NODE_ENV !== "production";
    const seedHeader = req.headers.get("x-krealink-seed");
    const isAuthorized = isDev || seedHeader === "demo" || seedHeader === "krealink-admin";

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Database seed utility is restricted to development and demo sessions." },
        { status: 403 }
      );
    }

    let seededCreatorsCount = 0;
    let seededPortfoliosCount = 0;

    // 3. Seed Creators & their Portfolio items
    for (const item of DEMO_CREATORS) {
      const creatorRef = doc(db, "creators", item.creator.username);
      await setDoc(
        creatorRef,
        {
          ...item.creator,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      seededCreatorsCount++;

      for (const p of item.portfolio) {
        const portRef = doc(db, "creators", item.creator.username, "portfolio", p.id);
        await setDoc(
          portRef,
          {
            ...p,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        seededPortfoliosCount++;
      }
    }

    // 4. Seed Demo Brand
    const brandRef = doc(db, "brands", DEMO_BRAND.id);
    await setDoc(
      brandRef,
      {
        ...DEMO_BRAND,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 5. Seed Demo Briefs
    for (const brief of DEMO_BRIEFS) {
      if (brief.id) {
        const briefRef = doc(db, "briefs", brief.id);
        await setDoc(
          briefRef,
          {
            ...brief,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${seededCreatorsCount} creators, ${seededPortfoliosCount} portfolio items, 1 brand, and ${DEMO_BRIEFS.length} briefs!`,
    });
  } catch (error) {
    console.error("Database seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed demo data to Firestore." },
      { status: 500 }
    );
  }
}
