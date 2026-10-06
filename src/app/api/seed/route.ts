import { NextResponse } from "next/server";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEMO_CREATORS, DEMO_BRAND, DEMO_BRIEFS } from "@/lib/demoData";

export async function POST() {
  try {
    let seededCreatorsCount = 0;
    let seededPortfoliosCount = 0;

    // 1. Seed Creators & their Portfolio items
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

    // 2. Seed Demo Brand
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

    // 3. Seed Demo Briefs
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
