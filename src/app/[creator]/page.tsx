"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";
import { useAuth } from "@/lib/auth-context";

const supportLevels = [
  {
    amount: "₹9",
    title: "Starter Fan",
    description: "Start your FanStreak",
  },
  {
    amount: "₹19",
    title: "Active Fan",
    description: "Keep your name visible",
  },
  {
    amount: "₹49",
    title: "Loyal Fan",
    description: "Climb loyalty rankings",
  },
  {
    amount: "₹599",
    title: "Elite Fan",
    description: "Enter premium fan zone",
  },
  {
    amount: "₹999",
    title: "VIP Fan",
    description: "Compete for top recognition",
  },
];

const badges = ["Early Supporter", "7-Day Streak", "Top Fan", "Diamond Fan"];

type CreatorProfile = {
  name: string;
  username: string;
  category: string;
  bio: string;
  status: string;
  supporters: string;
  volume: string;
  theme: ThemeKey;
  profilePhoto: string;
  email: string;
  verified: boolean;
  socialLinks: {
    instagram?: string;
    youtube?: string;
    x?: string;
    website?: string;
  };
};

type LeaderboardFan = {
  rank: "01" | "02" | "03" | "04";
  name: string;
  badge: string;
  metric: string;
};

const leaderboardSets: {
  title: string;
  subtitle: string;
  reward: string;
  fans: LeaderboardFan[];
}[] = [
  {
    title: "🔥 Highest Streak",
    subtitle:
      "The fans who show up again and again. Every day they continue, their name becomes harder to ignore.",
    reward:
      "Longest streak fan gets OG Fan Badge + monthly creator recognition.",
    fans: [
      { rank: "01", name: "Rohan", badge: "Streak King", metric: "103 days" },
      { rank: "02", name: "Ishita", badge: "Daily Fan", metric: "87 days" },
      { rank: "03", name: "Dev", badge: "Consistent Fan", metric: "61 days" },
      { rank: "04", name: "Arjun", badge: "Rising Streak", metric: "42 days" },
    ],
  },
  {
    title: "💎 Most Loyal Fans",
    subtitle:
      "Not just one-time supporters — these are the fans who stay, engage, return, and build real fan identity.",
    reward:
      "Most loyal fans get priority recognition and special identity badges.",
    fans: [
      {
        rank: "01",
        name: "Ishita",
        badge: "Diamond Loyalist",
        metric: "98 score",
      },
      { rank: "02", name: "Rohan", badge: "Core Fan", metric: "94 score" },
      { rank: "03", name: "Meera", badge: "True Fan", metric: "89 score" },
      { rank: "04", name: "Kabir", badge: "Active Fan", metric: "81 score" },
    ],
  },
  {
    title: "👑 Highest Paid",
    subtitle:
      "The strongest supporters compete for premium visibility, VIP status, and the biggest reward slots.",
    reward:
      "Highest paid supporters unlock VIP recognition and premium reward slots.",
    fans: [
      { rank: "01", name: "Dev", badge: "VIP Supporter", metric: "₹12,501" },
      { rank: "02", name: "Rohan", badge: "Top Patron", metric: "₹9,251" },
      { rank: "03", name: "Ishita", badge: "Elite Fan", metric: "₹7,101" },
      { rank: "04", name: "Arjun", badge: "Power Fan", metric: "₹5,501" },
    ],
  },
];

const activeCreatorDrop = {
  status: "Live Drop",
  title: "24-Hour FanStreak Drop",
  subtitle:
    "Support now and compete for premium fan recognition before this drop ends.",
  rewards: [
    {
      icon: "👑",
      title: "Highest Paid Fan",
      description: "Gets VIP Fan Wall spotlight",
    },
    {
      icon: "🔥",
      title: "Top Streak Fans",
      description: "Unlock special streak recognition",
    },
    {
      icon: "🎟️",
      title: "Passport Fans",
      description: "Get priority shortlist for future drops",
    },
  ],
};

const fanPassport = {
  price: "₹99",
  title: "FanStreak Passport",
  subtitle:
    "Own a premium fan identity inside this creator’s community without affecting fair streak rankings.",
  benefits: [
    "Premium digital Passport Card",
    "QR-linked live fan profile",
    "Passport badge on fan identity",
    "Creator Drop priority alerts",
    "Passport Fan Wall visibility",
    "Future meetup priority consideration",
  ],
};

const fallbackStudioCreator: CreatorProfile = {
  name: "Samay Raina",
  username: "samay",
  category: "Comedy Creator",
  bio: "Comedy creator · creator community · fan recognition",
  status: "Live",
  supporters: "21.2K",
  volume: "₹8.72L",
  theme: "flame",
  profilePhoto: "",
  email: "",
  verified: true,
  socialLinks: {},
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);

  return {
    firstName: parts[0] || name,
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeUrl(value?: string) {
  if (!value) return "#";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function streakBadge(days: number) {
  if (days >= 100) return "Streak King";
  if (days >= 30) return "Daily Fan";
  if (days >= 7) return "Consistent Fan";
  return "Rising Streak";
}

export default function CreatorPage() {
  const params = useParams();
  const { user } = useAuth();
  const creatorUsername = getParamValue(params?.creator);

  const loginHref = `/login?next=${encodeURIComponent(`/${creatorUsername}`)}`;

  const [creatorProfile, setCreatorProfile] =
    useState<CreatorProfile>(fallbackStudioCreator);
  const [isLoadingCreator, setIsLoadingCreator] = useState(true);
  const [creatorNotFound, setCreatorNotFound] = useState(false);
  const [liveStreakFans, setLiveStreakFans] = useState<LeaderboardFan[]>([]);

  const [selectedAmount, setSelectedAmount] = useState("₹49");
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [supportFanName, setSupportFanName] = useState("");
  const [isDailyMandate, setIsDailyMandate] = useState(false);
  const [mandateConsent, setMandateConsent] = useState(false);
  const [isProcessingSupport, setIsProcessingSupport] = useState(false);
  const [supportError, setSupportError] = useState("");

  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [passportFanName, setPassportFanName] = useState("");
  const [isPassportActive, setIsPassportActive] = useState(false);

  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");
  const [dropTimeLeft, setDropTimeLeft] = useState("24h 00m");
  const [isDropEnded, setIsDropEnded] = useState(false);

  const theme = themes[activeTheme];

  const finalAmount = isCustom ? `₹${customAmount || "0"}` : selectedAmount;
  const canContinue = !isCustom || Number(customAmount) > 0;

  const selectedSupportLevel = supportLevels.find(
    (level) => level.amount === selectedAmount
  );

  const selectedSupportTitle = isCustom
    ? "Power Supporter"
    : selectedSupportLevel?.title || "Supporter";

  const passportDisplayName =
    isPassportActive && passportFanName.trim() ? passportFanName : "XXXX XXXX";

  const passportDisplayCreator = isPassportActive
    ? creatorProfile.name
    : "XXXX XXXX";

  const passportDisplayId = isPassportActive
    ? `FS-${getPassportSlug().slice(0, 10).toUpperCase()}`
    : "FS-XXXX-XXXX";

  const passportPath = `/passport/${getPassportSlug()}?creator=${
    creatorProfile.username
  }&creatorName=${encodeURIComponent(
    passportDisplayCreator
  )}&fanName=${encodeURIComponent(
    passportDisplayName
  )}&passportId=${encodeURIComponent(passportDisplayId)}`;

  const passportQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
    `https://fan-streak.vercel.app${passportPath}`
  )}`;

  const creatorInitial = getInitial(creatorProfile.name);
  const { firstName, lastName } = splitName(creatorProfile.name);

  const availableSocialLinks = [
    { label: "Instagram", value: creatorProfile.socialLinks.instagram },
    { label: "YouTube", value: creatorProfile.socialLinks.youtube },
    { label: "X", value: creatorProfile.socialLinks.x },
    { label: "Website", value: creatorProfile.socialLinks.website },
  ].filter((link) => Boolean(link.value));

  const creatorHeroStats = [
    { label: "Supporters", value: creatorProfile.supporters || "0" },
    { label: "Record streak", value: "103d" },
    { label: "Reward zone", value: "Top 5" },
    { label: "Elite badges", value: String(badges.length) },
  ];

  useEffect(() => {
    async function loadCreator() {
      if (!creatorUsername) {
        setCreatorNotFound(true);
        setIsLoadingCreator(false);
        return;
      }

      try {
        const creatorRef = doc(db, "creators", creatorUsername);
        const creatorSnap = await getDoc(creatorRef);

        if (!creatorSnap.exists()) {
          if (creatorUsername === fallbackStudioCreator.username) {
            setCreatorProfile(fallbackStudioCreator);
            setActiveTheme(fallbackStudioCreator.theme);
            setCreatorNotFound(false);
          } else {
            setCreatorNotFound(true);
          }

          setIsLoadingCreator(false);
          return;
        }

        const data = creatorSnap.data();
        const nextTheme = isThemeKey(data.theme) ? data.theme : "flame";

        const nextCreator: CreatorProfile = {
          name: String(data.name || "Creator"),
          username: String(data.username || creatorUsername),
          category: String(data.category || "Creator"),
          bio: String(data.bio || "Creator community · fan recognition"),
          status: String(data.status || "Live"),
          supporters: String(data.supporters || "0"),
          volume: String(data.volume || "₹0"),
          theme: nextTheme,
          profilePhoto: String(data.profilePhoto || ""),
          email: String(data.email || ""),
          verified: Boolean(data.verified),
          socialLinks: {
            instagram: data.socialLinks?.instagram || data.instagram || "",
            youtube: data.socialLinks?.youtube || data.youtube || "",
            x: data.socialLinks?.x || data.x || "",
            website: data.socialLinks?.website || data.website || "",
          },
        };

        setCreatorProfile(nextCreator);
        setActiveTheme(nextTheme);
        setCreatorNotFound(false);
      } catch (error) {
        console.error("Failed to load creator", error);
        setCreatorNotFound(true);
      } finally {
        setIsLoadingCreator(false);
      }
    }

    loadCreator();
  }, [creatorUsername]);

  useEffect(() => {
    if (!creatorUsername) return;

    async function loadStreakLeaderboard() {
      try {
        const supportsQuery = query(
          collection(db, "supports"),
          where("creator", "==", creatorUsername)
        );
        const snapshot = await getDocs(supportsQuery);

        const fans: LeaderboardFan[] = snapshot.docs
          .map((supportDoc) => {
            const data = supportDoc.data();
            return {
              name: String(data.fanName || "Fan"),
              streakDays: Number(data.streakDays || 0),
            };
          })
          .sort((a, b) => b.streakDays - a.streakDays)
          .slice(0, 4)
          .map((fan, index) => ({
            rank: (["01", "02", "03", "04"][index] ||
              "04") as LeaderboardFan["rank"],
            name: fan.name,
            badge: streakBadge(fan.streakDays),
            metric: `${fan.streakDays} day${fan.streakDays === 1 ? "" : "s"}`,
          }));

        setLiveStreakFans(fans);
      } catch (error) {
        console.error("Failed to load streak leaderboard:", error);
      }
    }

    loadStreakLeaderboard();
  }, [creatorUsername]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

    if (isThemeKey(savedTheme)) {
      setActiveTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (user && !supportFanName) {
      setSupportFanName(user.displayName || user.email?.split("@")[0] || "");
    }
  }, [user, supportFanName]);

  useEffect(() => {
    const passportKey = `fanstreak-passport-active-${creatorUsername}`;
    const passportNameKey = `fanstreak-passport-name-${creatorUsername}`;

    const savedPassport = localStorage.getItem(passportKey);
    const savedPassportName = localStorage.getItem(passportNameKey);

    if (savedPassport === "true") {
      setIsPassportActive(true);
    }

    if (savedPassportName) {
      setPassportFanName(savedPassportName);
    }
  }, [creatorUsername]);

  useEffect(() => {
    if (!creatorUsername) return;

    const storageKey = `fanstreak-drop-start-${creatorUsername}`;
    const dropDurationMs = 24 * 60 * 60 * 1000;

    let dropStartTime = Number(localStorage.getItem(storageKey));

    if (!dropStartTime) {
      dropStartTime = Date.now();
      localStorage.setItem(storageKey, String(dropStartTime));
    }

    const dropEndTime = dropStartTime + dropDurationMs;

    function updateDropTimer() {
      const remainingMs = dropEndTime - Date.now();

      if (remainingMs <= 0) {
        setDropTimeLeft("Ended");
        setIsDropEnded(true);
        return;
      }

      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor(
        (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
      );

      setDropTimeLeft(`${hours}h ${minutes}m`);
      setIsDropEnded(false);
    }

    updateDropTimer();

    const interval = setInterval(updateDropTimer, 60000);

    return () => clearInterval(interval);
  }, [creatorUsername]);

  function changeTheme(themeKey: ThemeKey) {
    setActiveTheme(themeKey);
    localStorage.setItem("fanstreak-theme", themeKey);
  }

  function chooseAmount(amount: string) {
    setIsCustom(false);
    setSelectedAmount(amount);
  }

  function openSupportModal() {
    if (!canContinue) return;
    setIsModalOpen(true);
  }

  async function confirmSupport() {
    if (!user) {
      setSupportError("Please sign in to start your streak.");
      return;
    }

    const cleanFanName = supportFanName.trim();

    if (!cleanFanName) {
      setSupportError("Please enter your fan name.");
      return;
    }

    if (isDailyMandate && !mandateConsent) {
      setSupportError("Please agree to the daily support terms to continue.");
      return;
    }

    try {
      setIsProcessingSupport(true);
      setSupportError("");

      const fanSlug =
        cleanFanName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "fan";

      const supportRef = doc(
        db,
        "supports",
        `${creatorProfile.username}__${user.uid}`
      );
      const existingSupport = await getDoc(supportRef);

      const todayKey = toDayKey(new Date());
      const yesterdayKey = toDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

      let streakDays = 1;

      if (existingSupport.exists()) {
        const data = existingSupport.data();
        const lastDay = String(data.lastSupportDate || "");
        const previousStreak = Number(data.streakDays || 0);

        if (lastDay === todayKey) {
          streakDays = previousStreak || 1;
        } else if (lastDay === yesterdayKey) {
          streakDays = previousStreak + 1;
        } else {
          streakDays = 1;
        }
      }

      await setDoc(
        supportRef,
        {
          creator: creatorProfile.username,
          creatorName: creatorProfile.name,
          fanUid: user.uid,
          fanName: cleanFanName,
          fanSlug,
          lastAmount: finalAmount,
          frequency: isDailyMandate ? "daily" : "once",
          mandateConsent: isDailyMandate,
          lastSupportDate: todayKey,
          streakDays,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      window.location.href = `/success?creator=${encodeURIComponent(
        creatorProfile.username
      )}&creatorName=${encodeURIComponent(
        creatorProfile.name
      )}&fanName=${encodeURIComponent(
        cleanFanName
      )}&streak=${streakDays}&amount=${encodeURIComponent(
        finalAmount
      )}&frequency=${isDailyMandate ? "daily" : "once"}`;
    } catch (error) {
      console.error("Failed to record support:", error);
      setSupportError("Something went wrong. Please try again.");
      setIsProcessingSupport(false);
    }
  }

  function getPassportSlug() {
    const cleanName = passportFanName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return cleanName || "passport-fan";
  }

  function activatePassport() {
    if (!passportFanName.trim()) {
      alert("Please enter fan name for the Passport card.");
      return;
    }

    const newPassportId = `FS-${getPassportSlug().slice(0, 10).toUpperCase()}`;

    localStorage.setItem(`fanstreak-passport-active-${creatorUsername}`, "true");
    localStorage.setItem(
      `fanstreak-passport-name-${creatorUsername}`,
      passportFanName
    );

    setIsPassportActive(true);
    setIsPassportModalOpen(false);

    window.location.href = `/passport/${getPassportSlug()}?creator=${
      creatorProfile.username
    }&creatorName=${encodeURIComponent(
      creatorProfile.name
    )}&fanName=${encodeURIComponent(
      passportFanName
    )}&passportId=${encodeURIComponent(newPassportId)}`;
  }

  if (isLoadingCreator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508] px-5 text-white">
        <div className="text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] text-4xl"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 60px ${theme.glow}`,
            }}
          >
            🔥
          </div>
          <h1 className="mt-6 text-3xl font-black">Loading creator world...</h1>
          <p className="mt-2 text-white/45">Preparing FanStreak profile</p>
        </div>
      </main>
    );
  }

  if (creatorNotFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508] px-5 text-white">
        <div className="max-w-xl text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] text-4xl"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 60px ${theme.glow}`,
            }}
          >
            🔥
          </div>
          <h1 className="mt-6 text-4xl font-black">Creator not found</h1>
          <p className="mt-3 text-white/50">
            This FanStreak creator world is not live yet.
          </p>
          <a
            href="/"
            className="mt-8 inline-block rounded-2xl px-6 py-4 font-black text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            Back to FanStreak
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050508] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: theme.glow }}
        />
        <div
          className="absolute right-0 top-52 h-[320px] w-[320px] rounded-full blur-[110px]"
          style={{ background: theme.glow, opacity: 0.35 }}
        />
        <div className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-purple-700/10 blur-[110px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070a]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <a href="/" className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/5"
              style={{
                borderColor: theme.border,
                boxShadow: `0 0 30px ${theme.glow}`,
              }}
            >
              <span className="text-2xl">🔥</span>
            </div>

            <div>
              <h1
                className="bg-clip-text text-2xl font-black tracking-tight text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                FanStreak
              </h1>
              <p className="hidden text-xs text-white/45 sm:block">
                fanstreak.in/{creatorProfile.username}
              </p>
            </div>
          </a>

          <a
            href="#support"
            className="rounded-2xl px-5 py-3 text-sm font-bold text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 35px ${theme.glow}`,
            }}
          >
            Support
          </a>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-14 pt-10 md:px-8 md:pt-16">
        <div
          className="rounded-[2.7rem] p-[1px]"
          style={{
            background: theme.gradient,
            boxShadow: `0 0 100px ${theme.glow}`,
          }}
        >
          <div className="relative overflow-hidden rounded-[2.65rem] border border-white/10 bg-[#08060d] px-6 py-7 md:px-10 md:py-10">
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute -right-16 -top-16 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow }}
              />
              <div
                className="absolute -left-16 bottom-0 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow, opacity: 0.7 }}
              />
              <div
                className="absolute inset-x-0 top-0 h-32"
                style={{ background: theme.softGradient }}
              />
            </div>

            <div className="relative grid gap-8 md:grid-cols-[1fr_420px] md:items-center">
              <div>
                <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/70 backdrop-blur-xl">
                  Creator World Preview · {theme.name}
                </div>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div
                    className="h-32 w-32 shrink-0 rounded-full p-[3px]"
                    style={{
                      background: theme.gradient,
                      boxShadow: `0 0 55px ${theme.glow}`,
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#101015] text-5xl font-black">
                      {creatorProfile.profilePhoto ? (
                        <img
                          src={creatorProfile.profilePhoto}
                          alt={creatorProfile.name}
                          className="h-full w-full rounded-full object-contain object-center"
                        />
                      ) : (
                        creatorInitial
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                        {firstName}
                        <br />
                        <span
                          className="bg-clip-text text-transparent"
                          style={{ backgroundImage: theme.text }}
                        >
                          {lastName || creatorProfile.category}
                        </span>
                      </h2>

                      {creatorProfile.verified && (
                        <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-black">
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-base font-medium text-white/50 md:text-lg">
                      {creatorProfile.bio}
                    </p>

                    {availableSocialLinks.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {availableSocialLinks.map((link) => (
                          <a
                            key={link.label}
                            href={normalizeUrl(link.value)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-white/65 transition hover:bg-white/[0.1]"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-8 max-w-3xl text-lg leading-8 text-white/60 md:text-xl md:leading-9">
                  Start your FanStreak, climb the fan leaderboard, unlock
                  identity badges, and become visible inside this creator’s
                  strongest fan community.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {creatorHeroStats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl"
                    >
                      <p
                        className="bg-clip-text text-2xl font-black text-transparent"
                        style={{ backgroundImage: theme.text }}
                      >
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm text-white/45">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2.2rem] border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/45">
                    FanStreak access
                  </p>
                  <h3 className="mt-4 text-3xl font-black">
                    Build your name in the fandom
                  </h3>
                  <p className="mt-3 leading-7 text-white/50">
                    Support, keep your streak active, and compete for public
                    recognition.
                  </p>

                  <a
                    href="#support"
                    className="mt-7 block rounded-2xl px-6 py-4 text-center font-black text-white"
                    style={{
                      background: theme.gradient,
                      boxShadow: `0 0 45px ${theme.glow}`,
                    }}
                  >
                    Start your FanStreak →
                  </a>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      { icon: "🔥", label: "Streak" },
                      { icon: "🏆", label: "Rank" },
                      { icon: "💎", label: "Badge" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center"
                      >
                        <p className="text-2xl">{item.icon}</p>
                        <p className="mt-2 text-sm font-black text-white/50">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Drop Engine */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 md:px-8">
        <div
          className="rounded-[2.4rem] p-[1px]"
          style={{
            background: theme.gradient,
            boxShadow: `0 0 80px ${theme.glow}`,
          }}
        >
          <div className="relative overflow-hidden rounded-[2.35rem] border border-white/10 bg-[#08060d] p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute right-0 top-0 h-64 w-64 rounded-full blur-[90px]"
                style={{ background: theme.glow }}
              />
              <div className="absolute inset-x-0 top-0 h-28 bg-white/[0.025]" />
            </div>

            <div className="relative grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-white/70">
                  🔥 {activeCreatorDrop.status}
                </div>

                <h3 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
                  {activeCreatorDrop.title}
                </h3>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-white/55">
                  {activeCreatorDrop.subtitle}
                </p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/35">
                    Drop ends in
                  </p>
                  <p
                    className="mt-2 bg-clip-text text-4xl font-black text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    {dropTimeLeft}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {activeCreatorDrop.rewards.map((reward) => (
                  <div
                    key={reward.title}
                    className="rounded-[1.7rem] border border-white/10 bg-black/30 p-5"
                  >
                    <p className="text-3xl">{reward.icon}</p>
                    <h4 className="mt-4 text-xl font-black">{reward.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-white/45">
                      {reward.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm leading-6 text-white/45">
                Creator Drops turn normal support into a limited-time fan
                competition. Higher support, stronger streaks, and Passport
                status improve fan visibility.
              </p>

              <a
                href={isDropEnded ? undefined : "#support"}
                className="rounded-2xl px-6 py-4 text-center font-black text-white transition hover:scale-[1.01]"
                style={{
                  background: isDropEnded
                    ? "rgba(255,255,255,0.1)"
                    : theme.gradient,
                  boxShadow: isDropEnded ? undefined : `0 0 35px ${theme.glow}`,
                }}
              >
                {isDropEnded ? "Drop Ended" : "Join Drop →"}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FanStreak Passport */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="rounded-[2.4rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
              Premium fan identity
            </p>

            <h3 className="mt-3 text-4xl font-black md:text-5xl">
              Unlock {fanPassport.title}
            </h3>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/50">
              {fanPassport.subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <p
                className="bg-clip-text text-5xl font-black text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                {fanPassport.price}
              </p>
              <p className="pb-2 text-sm font-bold text-white/45">
                one-time fan identity upgrade
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {fanPassport.benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <p className="font-bold text-white/70">✦ {benefit}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm leading-6 text-white/45">
                Fair play: Passport does not buy rank. Streaks and leaderboard
                positions still depend on real support and consistency.
              </p>
            </div>

            <button
              onClick={() => setIsPassportModalOpen(true)}
              className="mt-6 w-full rounded-2xl py-5 text-xl font-black text-white transition hover:scale-[1.01]"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 45px ${theme.glow}`,
              }}
            >
              {isPassportActive
                ? "View / Update Passport"
                : "Unlock Passport — ₹99"}
            </button>
          </div>

          <div className="relative min-h-[680px]">
            <div
              className="absolute right-0 top-0 h-72 w-72 rounded-full blur-[95px]"
              style={{ background: theme.glow }}
            />

            <div
              className="relative ml-auto max-w-[560px] rotate-[3deg] rounded-[2rem] p-[1px]"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 80px ${theme.glow}`,
              }}
            >
              <div className="rounded-[1.95rem] border border-white/10 bg-[#06060a]/95 p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔥</span>
                  <p className="text-xl font-black">FanStreak</p>
                </div>

                <div className="mt-7 flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-white/10" />
                  <p
                    className="bg-clip-text text-xs font-black uppercase tracking-[0.4em] text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    Passport Benefits
                  </p>
                  <div className="h-[1px] flex-1 bg-white/10" />
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    "Shareable Fan Identity",
                    "Priority Creator Drop Alerts",
                    "Meetup Priority Consideration",
                    "Passport Fan Wall Access",
                    "Premium Passport Badge",
                  ].map((benefit) => (
                    <div
                      key={benefit}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4"
                    >
                      <p className="font-bold text-white/75">✦ {benefit}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="text-xs leading-6 text-white/45">
                    Fair play: streaks and rankings still depend on real support
                    and consistency.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="relative -mt-24 max-w-[590px] -rotate-[4deg] rounded-[2rem] p-[1px]"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 100px ${theme.glow}`,
              }}
            >
              <div className="relative overflow-hidden rounded-[1.95rem] border border-white/10 bg-[#050508]/95 p-7 backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className="absolute -right-16 -top-16 h-72 w-72 rounded-full blur-[90px]"
                    style={{ background: theme.glow }}
                  />
                  <div className="absolute inset-0 opacity-[0.08]">
                    <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:22px_22px]" />
                  </div>
                </div>

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🔥</span>
                    <p className="text-2xl font-black">FanStreak</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
                      Digital
                    </p>
                  </div>
                </div>

                <div className="relative mt-10">
                  <h4 className="text-5xl font-black leading-none">
                    FanStreak
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      Passport
                    </span>
                  </h4>
                </div>

                <div className="relative mt-10 grid gap-6 md:grid-cols-[1fr_150px] md:items-end">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
                      Passport Fan
                    </p>
                    <p className="mt-3 text-3xl font-black">
                      {passportDisplayName}
                    </p>

                    <div className="mt-6 h-[1px] w-full bg-white/10" />

                    <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-white/35">
                      Supporter of
                    </p>
                    <p className="mt-2 text-xl font-black text-white/80">
                      {passportDisplayCreator}
                    </p>

                    <p className="mt-7 text-xs font-black uppercase tracking-[0.3em] text-white/35">
                      Passport ID
                    </p>
                    <p
                      className="mt-2 bg-clip-text text-2xl font-black tracking-[0.18em] text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      {passportDisplayId}
                    </p>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-white p-3">
                    <img
                      src={passportQrUrl}
                      alt="FanStreak Passport QR"
                      className="h-32 w-32 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <a
              href={passportPath}
              className="mt-8 block rounded-2xl border border-white/10 bg-white/[0.05] py-4 text-center font-black text-white/70 transition hover:bg-white/[0.08]"
            >
              {isPassportActive
                ? "Open live Passport page →"
                : "Preview Passport page with masked details →"}
            </a>
          </div>
        </div>
      </section>

      <section
        id="support"
        className="relative z-10 mx-auto max-w-7xl px-5 pb-16 md:px-8"
      >
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
              Start supporting
            </p>

            <h3 className="mt-3 text-4xl font-black md:text-5xl">
              Choose your support
            </h3>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/50">
              Your support activates your FanStreak and places you inside this
              creator’s ranking system.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {supportLevels.map((level) => {
              const active = !isCustom && selectedAmount === level.amount;

              return (
                <button
                  key={level.amount}
                  onClick={() => chooseAmount(level.amount)}
                  className="rounded-2xl border p-5 text-left transition hover:scale-[1.01]"
                  style={{
                    borderColor: active
                      ? theme.border
                      : "rgba(255,255,255,0.1)",
                    background: active ? theme.softGradient : "rgba(0,0,0,0.3)",
                    boxShadow: active ? `0 0 35px ${theme.glow}` : undefined,
                  }}
                >
                  <p className="text-2xl font-black">{level.amount}</p>
                  <p className="mt-2 text-base font-black text-white">
                    {level.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-white/45">
                    {level.description}
                  </p>
                </button>
              );
            })}

            <button
              onClick={() => {
                setIsCustom(true);
                setSelectedAmount("");
              }}
              className="rounded-2xl border p-5 text-left transition hover:scale-[1.01]"
              style={{
                borderColor: isCustom ? theme.border : "rgba(255,255,255,0.1)",
                background: isCustom ? theme.softGradient : "rgba(0,0,0,0.3)",
                boxShadow: isCustom ? `0 0 35px ${theme.glow}` : undefined,
              }}
            >
              <p className="text-2xl font-black">Custom</p>
              <p className="mt-2 text-base font-black text-white">
                Power Supporter
              </p>
              <p className="mt-1 text-sm leading-5 text-white/45">
                Support without limits
              </p>
            </button>
          </div>

          {isCustom && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-white/45">
                Enter custom support amount
              </label>

              <div className="flex items-center rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <span className="mr-3 text-xl font-black">₹</span>
                <input
                  value={customAmount}
                  onChange={(event) =>
                    setCustomAmount(event.target.value.replace(/\D/g, ""))
                  }
                  className="w-full bg-transparent text-xl font-black text-white outline-none placeholder:text-white/25"
                  placeholder="Enter amount"
                  inputMode="numeric"
                />
              </div>
            </div>
          )}

          <button
            onClick={openSupportModal}
            disabled={!canContinue}
            className="mt-6 w-full rounded-2xl py-5 text-xl font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: canContinue ? theme.gradient : "rgba(255,255,255,0.1)",
              boxShadow: canContinue ? `0 0 45px ${theme.glow}` : undefined,
              color: canContinue ? "white" : "rgba(255,255,255,0.3)",
            }}
          >
            Continue as {selectedSupportTitle} — {finalAmount}
          </button>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-base leading-7 text-white/45">
              After payment, your streak begins and your fan profile appears on
              this creator’s leaderboard.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
              Fan competition
            </p>

            <h3 className="mt-3 text-4xl font-black md:text-5xl">
              Three ways to become visible
            </h3>

            <p className="mt-4 text-lg leading-8 text-white/50">
              Fans can climb through streaks, loyalty, or support value. Each
              leaderboard gives them a different reason to return and keep
              supporting.
            </p>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            {leaderboardSets.map((board) => {
              const boardFans =
                board.title.includes("Highest Streak") && liveStreakFans.length
                  ? liveStreakFans
                  : board.fans;

              return (
              <div
                key={board.title}
                className="rounded-[2rem] border border-white/10 bg-black/25 p-5"
              >
                <h4 className="text-2xl font-black md:text-3xl">
                  {board.title}
                </h4>

                <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/45">
                  {board.subtitle}
                </p>

                <div className="mt-6 space-y-3">
                  {boardFans.map((fan) => (
                    <div
                      key={`${board.title}-${fan.rank}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black"
                          style={{ background: theme.gradient }}
                        >
                          {fan.rank}
                        </span>

                        <div>
                          <p className="font-black">{fan.name}</p>
                          <p className="text-xs text-white/40">{fan.badge}</p>
                        </div>
                      </div>

                      <p
                        className="bg-clip-text text-sm font-black text-transparent"
                        style={{ backgroundImage: theme.text }}
                      >
                        {fan.metric}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm leading-6 text-white/55">
                    {board.reward}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-20 md:grid-cols-2 md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Fan identity
          </p>
          <h3 className="mt-3 text-3xl font-black">Badges to unlock</h3>

          <div className="mt-7 grid gap-3">
            {badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                    style={{ background: theme.softGradient }}
                  >
                    💎
                  </span>
                  <p className="font-black text-white/80">{badge}</p>
                </div>
                <span className="text-sm text-white/35">Locked</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Creator world theme
          </p>
          <h3 className="mt-3 text-3xl font-black">Choose your vibe</h3>

          <div className="mt-7 grid gap-3">
            {(Object.keys(themes) as ThemeKey[]).map((themeKey) => (
              <button
                key={themeKey}
                onClick={() => changeTheme(themeKey)}
                className="rounded-2xl border p-4 text-left transition hover:scale-[1.01]"
                style={{
                  borderColor:
                    activeTheme === themeKey
                      ? themes[themeKey].border
                      : "rgba(255,255,255,0.1)",
                  background:
                    activeTheme === themeKey
                      ? themes[themeKey].softGradient
                      : "rgba(0,0,0,0.25)",
                }}
              >
                <p className="font-black">{themes[themeKey].name}</p>
                <p className="mt-1 text-sm text-white/40">
                  Creator page color system
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {isPassportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-lg rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-6"
            style={{ boxShadow: `0 0 100px ${theme.glow}` }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                  FanStreak Passport
                </p>
                <h3 className="mt-3 text-3xl font-black">
                  Create your Passport Card
                </h3>
              </div>

              <button
                onClick={() => setIsPassportModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08]"
              >
                ×
              </button>
            </div>

            <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5">
              <label className="mb-2 block text-sm font-bold text-white/45">
                Fan name on Passport
              </label>

              <input
                value={passportFanName}
                onChange={(event) => setPassportFanName(event.target.value)}
                placeholder="Example: Aarav Sharma"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-lg font-black text-white outline-none placeholder:text-white/25"
              />

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm leading-6 text-white/45">
                  Your QR-linked Passport page will show your fan identity,
                  creator, streak status, fan level, and Passport badge.
                </p>
              </div>
            </div>

            <button
              onClick={activatePassport}
              className="mt-5 w-full rounded-2xl py-4 font-black text-white"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 45px ${theme.glow}`,
              }}
            >
              Activate Passport — ₹99
            </button>

            <p className="mt-4 text-center text-sm text-white/35">
              Payment integration will connect here after MVP approval.
            </p>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-lg rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-6"
            style={{ boxShadow: `0 0 100px ${theme.glow}` }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                  Start FanStreak
                </p>
                <h3 className="mt-3 text-3xl font-black">
                  Support {creatorProfile.name}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08]"
              >
                ×
              </button>
            </div>

            <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/45">Selected support</p>
                  <div
                    className="mt-1 bg-clip-text text-4xl font-black text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    {finalAmount}
                  </div>
                  <p className="mt-2 text-sm font-black text-white/55">
                    {selectedSupportTitle}
                  </p>
                </div>
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                  style={{ background: theme.softGradient }}
                >
                  🔥
                </div>
              </div>
            </div>

            {!user && (
              <div className="mt-5 rounded-2xl border border-white/15 bg-black/30 p-5 text-center">
                <p className="text-sm leading-6 text-white/60">
                  Sign in to start your streak. Your streak is tied to your
                  account, so your rank is really yours.
                </p>
                <a
                  href={loginHref}
                  className="mt-4 inline-block w-full rounded-2xl py-4 font-black text-white"
                  style={{
                    background: theme.gradient,
                    boxShadow: `0 0 45px ${theme.glow}`,
                  }}
                >
                  Sign in to continue
                </a>
              </div>
            )}

            {user && (
              <>
            <div className="mt-5 rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5">
              <label className="mb-2 block text-sm font-bold text-white/45">
                Your fan name
              </label>
              <input
                value={supportFanName}
                onChange={(event) => setSupportFanName(event.target.value)}
                placeholder="Example: Aarav Sharma"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-black text-white outline-none placeholder:text-white/25 focus:border-white/25"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDailyMandate(false)}
                  className="rounded-2xl border px-4 py-3 text-left transition"
                  style={{
                    borderColor: !isDailyMandate
                      ? theme.border
                      : "rgba(255,255,255,0.1)",
                    background: !isDailyMandate
                      ? theme.softGradient
                      : "rgba(0,0,0,0.25)",
                  }}
                >
                  <p className="text-sm font-black">One-time</p>
                  <p className="mt-1 text-xs text-white/45">Support once</p>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDailyMandate(true)}
                  className="rounded-2xl border px-4 py-3 text-left transition"
                  style={{
                    borderColor: isDailyMandate
                      ? theme.border
                      : "rgba(255,255,255,0.1)",
                    background: isDailyMandate
                      ? theme.softGradient
                      : "rgba(0,0,0,0.25)",
                  }}
                >
                  <p className="text-sm font-black">Daily streak</p>
                  <p className="mt-1 text-xs text-white/45">Auto-support daily</p>
                </button>
              </div>
            </div>

            {isDailyMandate && (
              <div className="mt-4 rounded-2xl border border-white/15 bg-black/30 p-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">
                  Daily support mandate
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-white/60">
                  <li>
                    • You authorize {finalAmount} per day to{" "}
                    {creatorProfile.name} to keep your streak alive.
                  </li>
                  <li>
                    • You will get a reminder before every debit, as required by
                    RBI.
                  </li>
                  <li>
                    • There is a monthly cap, and you can pause or cancel
                    anytime.
                  </li>
                  <li>
                    • Streaks and ranks still depend on real support — nothing is
                    hidden.
                  </li>
                </ul>

                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={mandateConsent}
                    onChange={(event) => setMandateConsent(event.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-pink-500"
                  />
                  <span className="text-sm leading-6 text-white/70">
                    I understand and agree to the daily {finalAmount} support
                    mandate.
                  </span>
                </label>
              </div>
            )}

            {supportError && (
              <p className="mt-4 text-sm font-bold text-rose-300">
                {supportError}
              </p>
            )}

            <button
              onClick={confirmSupport}
              disabled={isProcessingSupport}
              className="mt-5 w-full rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 45px ${theme.glow}`,
              }}
            >
              {isProcessingSupport
                ? "Activating..."
                : isDailyMandate
                ? `Authorize daily ${finalAmount} & start streak`
                : `Pay ${finalAmount} & start streak`}
            </button>

            <p className="mt-4 text-center text-sm text-white/35">
              Secure UPI mandate gateway connects here. Your consent is recorded
              now; no money moves until the gateway is live.
            </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
