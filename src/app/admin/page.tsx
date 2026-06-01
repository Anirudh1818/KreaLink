"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isThemeKey, themes, type ThemeKey } from "@/lib/themes";


type CreatorStatus = "Live" | "Pending" | "Review";

type Creator = {
  name: string;
  username: string;
  category: string;
  supporters: string;
  volume: string;
  status: CreatorStatus;
};

type Payout = {
  id: string;
  creator: string;
  amount: string;
  status: "Ready" | "Processing";
};



const initialCreators: Creator[] = [
  {
    name: "Samay Raina",
    username: "samay",
    category: "Comedy Creator",
    supporters: "21.2K",
    volume: "₹8.72L",
    status: "Live",
  },
  {
    name: "Maya Fit",
    username: "mayafit",
    category: "Fitness Creator",
    supporters: "6.8K",
    volume: "₹4.10L",
    status: "Pending",
  },
  {
    name: "Aarav Live",
    username: "aaravlive",
    category: "Streamer",
    supporters: "12.4K",
    volume: "₹5.48L",
    status: "Review",
  },
];

const initialPayouts: Payout[] = [
  {
    id: "PAYOUT-001",
    creator: "Samay Raina",
    amount: "₹1.46L",
    status: "Ready",
  },
  {
    id: "PAYOUT-002",
    creator: "Maya Fit",
    amount: "₹72,400",
    status: "Ready",
  },
  {
    id: "PAYOUT-003",
    creator: "Aarav Live",
    amount: "₹94,900",
    status: "Processing",
  },
];

const transactions = [
  {
    fan: "Rohan",
    creator: "Samay Raina",
    amount: "₹501",
    commission: "₹75",
    status: "Success",
  },
  {
    fan: "Ishita",
    creator: "Samay Raina",
    amount: "₹251",
    commission: "₹38",
    status: "Success",
  },
  {
    fan: "Dev",
    creator: "Maya Fit",
    amount: "₹101",
    commission: "₹15",
    status: "Success",
  },
  {
    fan: "Arjun",
    creator: "Aarav Live",
    amount: "₹51",
    commission: "₹8",
    status: "Success",
  },
];

export default function AdminPage() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [paidPayouts, setPaidPayouts] = useState<string[]>([]);
  const [isAddCreatorOpen, setIsAddCreatorOpen] = useState(false);
  const [isCommissionOpen, setIsCommissionOpen] = useState(false);
  const [commission, setCommission] = useState(15);
  const [creatorName, setCreatorName] = useState("");
  const [creatorUsername, setCreatorUsername] = useState("");
  const [creatorCategory, setCreatorCategory] = useState("");

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  const theme = themes[activeTheme];

  const configuredPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;

  const stats = useMemo(
    () => [
      {
        label: "Total platform GMV",
        value: "₹42.8L",
        sub: "Creator support volume",
      },
      {
        label: "FanStreak revenue",
        value: "₹6.42L",
        sub: `${commission}% platform commission`,
      },
      {
        label: "Active creators",
        value: String(creators.filter((creator) => creator.status === "Live").length),
        sub: `${creators.length} total creator profiles`,
      },
      {
        label: "Active supporters",
        value: "84.6K",
        sub: "Fans supporting creators",
      },
    ],
    [commission, creators]
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

if (isThemeKey(savedTheme)) {
  setActiveTheme(savedTheme);
}
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("fanstreak-admin-unlocked") === "true") {
      setAdminUnlocked(true);
    }
  }, []);

  function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configuredPasscode) {
      setPasscodeError(
        "Admin passcode is not configured. Set NEXT_PUBLIC_ADMIN_PASSCODE in your environment."
      );
      return;
    }

    if (passcodeInput === configuredPasscode) {
      sessionStorage.setItem("fanstreak-admin-unlocked", "true");
      setAdminUnlocked(true);
      setPasscodeInput("");
      setPasscodeError("");
      return;
    }

    setPasscodeError("Incorrect passcode.");
  }

  useEffect(() => {
  async function loadCreatorsFromFirestore() {
    const snapshot = await getDocs(collection(db, "creators"));

    if (snapshot.empty) {
      return;
    }

    const firestoreCreators: Creator[] = snapshot.docs.map((creatorDoc) => {
      const data = creatorDoc.data();

      return {
        name: String(data.name || ""),
        username: String(data.username || creatorDoc.id),
        category: String(data.category || "Creator"),
        supporters: String(data.supporters || "0"),
        volume: String(data.volume || "₹0"),
        status: String(data.status || "Pending") as CreatorStatus,
      };
    });

    setCreators(firestoreCreators);
  }

  loadCreatorsFromFirestore().catch((error) => {
    console.error("Failed to load creators from Firestore:", error);
  });
}, []);

  function changeTheme(themeKey: ThemeKey) {
    setActiveTheme(themeKey);
    localStorage.setItem("fanstreak-theme", themeKey);
  }

  async function approveCreator(name: string) {
  const matchedCreator = creators.find((creator) => creator.name === name);

  setCreators((currentCreators) =>
    currentCreators.map((creator) =>
      creator.name === name ? { ...creator, status: "Live" } : creator
    )
  );

  if (matchedCreator) {
    await setDoc(
      doc(db, "creators", matchedCreator.username),
      {
        ...matchedCreator,
        status: "Live",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  alert(`${name} approved and saved as Live in Firestore.`);
}

  function markPayoutPaid(id: string, creator: string) {
    setPaidPayouts((current) =>
      current.includes(id) ? current : [...current, id]
    );

    alert(`${creator} payout marked as paid for demo.`);
  }

  async function addCreator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = creatorName.trim();
    const cleanUsername = creatorUsername
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const cleanCategory = creatorCategory.trim();

    if (!cleanName || !cleanUsername || !cleanCategory) {
      alert("Please fill creator name, username, and category.");
      return;
    }

    const usernameTaken = creators.some(
      (creator) => creator.username.toLowerCase() === cleanUsername
    );

    if (usernameTaken) {
      alert("This username is already taken.");
      return;
    }

    const newCreator: Creator = {
      name: cleanName,
      username: cleanUsername,
      category: cleanCategory,
      supporters: "0",
      volume: "₹0",
      status: "Pending",
    };

   await setDoc(doc(db, "creators", cleanUsername), {
  ...newCreator,
  theme: activeTheme,
  bio: `${cleanName} · ${cleanCategory} · fan recognition`,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

setCreators((currentCreators) => [newCreator, ...currentCreators]);
setCreatorName("");
setCreatorUsername("");
setCreatorCategory("");
setIsAddCreatorOpen(false);

alert(`Creator profile saved to Firestore: fanstreak.in/${cleanUsername}`);
  }

  function exportTransactions() {
    const csvRows = [
      "Fan,Creator,Amount,Commission,Status",
      ...transactions.map(
        (transaction) =>
          `${transaction.fan},${transaction.creator},${transaction.amount},${transaction.commission},${transaction.status}`
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fanstreak-transactions-demo.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveCommission() {
    setIsCommissionOpen(false);
    alert(`Commission rate saved as ${commission}% for demo.`);
  }

  if (!adminUnlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#050508] px-5 text-white">
        <div className="pointer-events-none fixed inset-0">
          <div
            className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
            style={{ background: theme.glow }}
          />
        </div>

        <form
          onSubmit={unlockAdmin}
          className="relative z-10 w-full max-w-md rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-7"
          style={{ boxShadow: `0 0 100px ${theme.glow}` }}
        >
          <div
            className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border bg-white/5 text-2xl"
            style={{
              borderColor: theme.border,
              boxShadow: `0 0 30px ${theme.glow}`,
            }}
          >
            🔒
          </div>

          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Admin access
          </p>
          <h1 className="mt-3 text-3xl font-black">Enter admin passcode</h1>
          <p className="mt-3 text-sm leading-6 text-white/45">
            This dashboard controls creators, payouts, and commission. Access is
            restricted.
          </p>

          <input
            value={passcodeInput}
            onChange={(event) => setPasscodeInput(event.target.value)}
            type="password"
            placeholder="Passcode"
            autoFocus
            className="mt-6 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-white/25"
          />

          {passcodeError && (
            <p className="mt-3 text-sm font-bold text-rose-300">
              {passcodeError}
            </p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-2xl py-4 font-black text-white"
            style={{
              background: theme.gradient,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            Unlock dashboard
          </button>
        </form>
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
                Admin Control Room
              </p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/creator-studio"
              className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65 transition hover:bg-white/[0.08] sm:block"
            >
              Creator Studio
            </a>
            <a
              href="/samay"
              className="rounded-2xl px-5 py-3 text-sm font-bold text-white"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 35px ${theme.glow}`,
              }}
            >
              View Demo
            </a>
          </div>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 pt-10 md:px-8 md:pt-16">
        <div
          className="rounded-[2.7rem] p-[1px]"
          style={{
            background: theme.gradient,
            boxShadow: `0 0 100px ${theme.glow}`,
          }}
        >
          <div className="relative overflow-hidden rounded-[2.65rem] border border-white/10 bg-[#08060d] p-6 md:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute -right-16 -top-16 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow }}
              />
              <div
                className="absolute -left-16 bottom-0 h-72 w-72 rounded-full blur-[90px]"
                style={{ background: theme.glow, opacity: 0.65 }}
              />
              <div
                className="absolute inset-x-0 top-0 h-32"
                style={{ background: theme.softGradient }}
              />
            </div>

            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-white/40">
                Company dashboard
              </p>
              <h2 className="mt-4 text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
                Control the
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: theme.text }}
                >
                  creator economy.
                </span>
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/55 md:text-xl">
                Track platform GMV, commission revenue, creator onboarding,
                payouts, transactions, and top-performing fan communities.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl"
                  >
                    <p
                      className="bg-clip-text text-3xl font-black text-transparent"
                      style={{ backgroundImage: theme.text }}
                    >
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm font-bold text-white/60">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-white/35">{item.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[2rem] border border-white/10 bg-black/25 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                      Global theme
                    </p>
                    <p className="mt-2 text-lg font-black">
                      Admin follows the same FanStreak look
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {(Object.keys(themes) as ThemeKey[]).map((key) => {
                      const item = themes[key];
                      const active = activeTheme === key;

                      return (
                        <button
                          key={key}
                          onClick={() => changeTheme(key)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            active
                              ? "bg-white/[0.09] text-white"
                              : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
                          }`}
                          style={{
                            borderColor: active ? item.border : undefined,
                            boxShadow: active
                              ? `0 0 25px ${item.glow}`
                              : undefined,
                          }}
                        >
                          <span
                            className="mb-2 block h-3 w-full rounded-full"
                            style={{ background: item.gradient }}
                          />
                          <span className="block text-sm font-black">
                            {item.name}
                          </span>
                          <span className="text-xs text-white/35">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

            <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-10 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                Creator management
              </p>
              <h3 className="mt-3 text-3xl font-black">Creator profiles</h3>
              <p className="mt-3 max-w-2xl leading-7 text-white/50">
                FanStreak team creates premium creator profiles, gives them a
                personalized link, and keeps onboarding controlled.
              </p>
            </div>

            <button
              onClick={() => setIsAddCreatorOpen(true)}
              className="rounded-2xl px-5 py-3 text-sm font-black text-white"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 35px ${theme.glow}`,
              }}
            >
              Add creator
            </button>
          </div>

          <div className="mt-7 space-y-3">
            {creators.map((creator) => (
              <div
                key={creator.username}
                className="rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black"
                      style={{ background: theme.gradient }}
                    >
                      {creator.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black">{creator.name}</p>
                      <p className="mt-1 text-sm text-white/45">
                        fanstreak.in/{creator.username} · {creator.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    <div className="text-left md:text-right">
                      <p
                        className="bg-clip-text font-black text-transparent"
                        style={{ backgroundImage: theme.text }}
                      >
                        {creator.volume}
                      </p>
                      <p className="text-xs text-white/35">
                        {creator.supporters} supporters
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${
                        creator.status === "Live"
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                          : "border-orange-400/20 bg-orange-400/10 text-orange-200"
                      }`}
                    >
                      {creator.status}
                    </span>

                    {creator.status !== "Live" && (
                      <button
                        onClick={() => approveCreator(creator.name)}
                        className="rounded-xl bg-white/[0.07] px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/[0.12]"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Revenue engine
          </p>
          <h3 className="mt-3 text-3xl font-black">Commission overview</h3>
          <p className="mt-4 leading-8 text-white/55">
            FanStreak keeps a platform fee from every successful creator support
            transaction. Creator payouts are tracked separately.
          </p>

          <div className="mt-7 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm text-white/45">Current commission rate</p>
              <p
                className="mt-2 bg-clip-text text-4xl font-black text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                {commission}%
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm text-white/45">Creator share</p>
              <p
                className="mt-2 bg-clip-text text-4xl font-black text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                {100 - commission}%
              </p>
            </div>

            <button
              onClick={() => setIsCommissionOpen(true)}
              className="w-full rounded-2xl py-4 font-black text-white"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 40px ${theme.glow}`,
              }}
            >
              Manage commission settings
            </button>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-20 md:grid-cols-[0.95fr_1.05fr] md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
            Payout queue
          </p>
          <h3 className="mt-3 text-3xl font-black">Creator settlements</h3>

          <div className="mt-7 space-y-3">
            {initialPayouts.map((payout) => {
              const isPaid = paidPayouts.includes(payout.id);

              return (
                <div
                  key={payout.id}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black">{payout.creator}</p>
                      <p className="mt-1 text-xs text-white/35">{payout.id}</p>
                    </div>

                    <div className="text-right">
                      <p
                        className="bg-clip-text text-xl font-black text-transparent"
                        style={{ backgroundImage: theme.text }}
                      >
                        {payout.amount}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {isPaid ? "Paid" : payout.status}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => markPayoutPaid(payout.id, payout.creator)}
                    disabled={isPaid}
                    className={`mt-4 w-full rounded-2xl py-3 text-sm font-black transition ${
                      isPaid
                        ? "cursor-not-allowed bg-white/10 text-white/30"
                        : "bg-white/[0.07] text-white/70 hover:bg-white/[0.12]"
                    }`}
                  >
                    {isPaid ? "Payout marked paid" : "Mark payout paid"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                Transactions
              </p>
              <h3 className="mt-3 text-3xl font-black">Recent payments</h3>
            </div>

            <button
              onClick={exportTransactions}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white/65 transition hover:bg-white/[0.08]"
            >
              Export CSV
            </button>
          </div>

          <div className="mt-7 space-y-3">
            {transactions.map((transaction) => (
              <div
                key={`${transaction.fan}-${transaction.creator}-${transaction.amount}`}
                className="grid gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 md:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <p className="font-black">{transaction.fan}</p>
                  <p className="mt-1 text-sm text-white/45">Fan supporter</p>
                </div>

                <div>
                  <p className="font-black">{transaction.creator}</p>
                  <p className="mt-1 text-sm text-white/45">
                    Creator profile
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p
                    className="bg-clip-text font-black text-transparent"
                    style={{ backgroundImage: theme.text }}
                  >
                    {transaction.amount}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Fee {transaction.commission}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isAddCreatorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-xl rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-6"
            style={{ boxShadow: `0 0 100px ${theme.glow}` }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                  Add creator
                </p>
                <h3 className="mt-3 text-3xl font-black">
                  Create creator profile
                </h3>
              </div>
              <button
                onClick={() => setIsAddCreatorOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08]"
              >
                ×
              </button>
            </div>

            <form onSubmit={addCreator} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-white/45">
                  Creator name
                </label>
                <input
                  value={creatorName}
                  onChange={(event) => setCreatorName(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25"
                  placeholder="Example: Samay Raina"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-white/45">
                  Personalized username
                </label>
                <input
                  value={creatorUsername}
                  onChange={(event) => setCreatorUsername(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25"
                  placeholder="example: samay"
                />
                <p className="mt-2 text-xs text-white/35">
                  This creates a demo link like fanstreak.in/
                  {creatorUsername || "username"}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-white/45">
                  Category
                </label>
                <input
                  value={creatorCategory}
                  onChange={(event) => setCreatorCategory(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none placeholder:text-white/25"
                  placeholder="Example: Comedy Creator"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl py-4 font-black text-white"
                style={{
                  background: theme.gradient,
                  boxShadow: `0 0 40px ${theme.glow}`,
                }}
              >
                Create creator profile
              </button>
            </form>
          </div>
        </div>
      )}

      {isCommissionOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-5 backdrop-blur-xl">
          <div
            className="w-full max-w-lg rounded-[2.2rem] border border-white/10 bg-[#0b0810] p-6"
            style={{ boxShadow: `0 0 100px ${theme.glow}` }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/40">
                  Commission settings
                </p>
                <h3 className="mt-3 text-3xl font-black">
                  Platform fee control
                </h3>
              </div>
              <button
                onClick={() => setIsCommissionOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08]"
              >
                ×
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm text-white/45">FanStreak commission</p>
              <p
                className="mt-2 bg-clip-text text-5xl font-black text-transparent"
                style={{ backgroundImage: theme.text }}
              >
                {commission}%
              </p>

              <input
                value={commission}
                onChange={(event) => setCommission(Number(event.target.value))}
                type="range"
                min="5"
                max="30"
                className="mt-6 w-full"
              />

              <div className="mt-4 flex justify-between text-sm text-white/35">
                <span>5%</span>
                <span>30%</span>
              </div>
            </div>

            <button
              onClick={saveCommission}
              className="mt-5 w-full rounded-2xl py-4 font-black text-white"
              style={{
                background: theme.gradient,
                boxShadow: `0 0 40px ${theme.glow}`,
              }}
            >
              Save commission
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
