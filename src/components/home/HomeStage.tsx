"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { UserMenu } from "@/components/ui/UserMenu";

type Workspace = {
  id: string;
  title: string;
  updatedAt: string;
  isOwner: boolean;
  isLegacyOrphan: boolean;
  isShared: boolean;
};

type Props = {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  recent: Workspace[];
  dbError: string | null;
  createAction: () => Promise<void>;
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "group relative inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.03] py-3 pl-5 pr-2 text-sm font-medium text-white transition-all hover:border-white/30 hover:bg-white/[0.06]",
        pending && "cursor-wait opacity-70",
      )}
    >
      <span>{pending ? "Creating workspace…" : "Create new workspace"}</span>
      <span className="flex size-8 items-center justify-center rounded-full bg-[#7ad7ff] text-[#08090d] transition-transform group-hover:translate-x-0.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </span>
    </button>
  );
}

export function HomeStage({ user, recent, dbError, createAction }: Props) {
  return (
    <main className="no-scrollbar relative z-10 h-dvh w-full overflow-y-auto">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <Image
            src="/nori-logo.png"
            alt="Nori"
            width={28}
            height={28}
            priority
            className="rounded-md"
          />
          <span className="text-sm font-medium tracking-tight text-[var(--text-1)]">
            Nori
          </span>
          <span className="ml-2 hidden rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/45 md:inline">
            beta
          </span>
        </div>
        {user && (
          <UserMenu
            name={user.name ?? user.email}
            image={user.image}
          />
        )}
      </header>

      {/* Hero */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 pb-14 text-center md:pt-28 md:pb-20"
      >
        <motion.p
          variants={fadeUp}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55"
        >
          <span className="size-1 rounded-full bg-[#7ad7ff]" />
          Realtime spatial canvases
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="text-balance text-5xl font-extralight leading-[0.95] tracking-[-0.04em] text-[var(--text-1)] md:text-7xl"
        >
          A space where{" "}
          <span className="italic font-light text-white/95">ideas</span>{" "}
          find each other.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-7 max-w-lg text-[15px] leading-relaxed text-[var(--text-2)] md:text-base"
        >
          {user?.name
            ? `Welcome back, ${user.name.split(" ")[0]}. Pick up a canvas — drag, connect, brainstorm with anyone, live.`
            : "An infinite canvas for thinking together. Drag ideas, connect them, watch your collaborators move in real time."}
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10">
          <form action={createAction}>
            <CreateButton />
          </form>
        </motion.div>
      </motion.section>

      {/* Workspaces */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
        className="mx-auto max-w-6xl px-6 pb-20 md:px-10"
      >
        <header className="mb-6 flex items-baseline justify-between border-b border-white/[0.06] pb-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.24em] text-white/50">
            Your workspaces
          </h2>
          {recent.length > 0 && (
            <span className="text-[10px] uppercase tracking-[0.24em] text-white/30">
              {recent.length} {recent.length === 1 ? "space" : "spaces"}
            </span>
          )}
        </header>

        {dbError ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
            Couldn’t reach MongoDB: {dbError}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] px-6 py-16 text-center">
            <p className="text-sm text-white/55">No canvases yet.</p>
            <p className="mt-1 text-xs text-white/35">
              Create one above to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((w, idx) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.32,
                  delay: 0.3 + idx * 0.04,
                  ease: "easeOut",
                }}
              >
                <Link
                  href={`/w/${w.id}`}
                  className="group relative flex h-full flex-col justify-between gap-8 bg-[#0a0b10] p-5 transition-colors hover:bg-[#0c0d13]"
                >
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      {w.isOwner ? (
                        <Pill tone="cyan">owner</Pill>
                      ) : w.isShared ? (
                        <Pill tone="magenta">shared</Pill>
                      ) : w.isLegacyOrphan ? (
                        <Pill tone="muted">legacy</Pill>
                      ) : null}
                    </div>
                    <h3 className="truncate text-[15px] font-medium leading-tight text-white/92">
                      {w.title || "Untitled workspace"}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[11px] tracking-wide text-white/35">
                    <span>{relativeTime(w.updatedAt)} ago</span>
                    <span className="flex size-7 items-center justify-center rounded-full border border-white/10 text-white/60 transition-all group-hover:border-white/30 group-hover:text-white">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-[11px] tracking-wide text-white/35 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-2">
            <Image
              src="/nori-logo.png"
              alt=""
              width={16}
              height={16}
              className="rounded opacity-70"
            />
            <span>Nori · the collaborative spatial workspace</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400/70" />
              All systems live
            </span>
            <span className="opacity-60">v0.1</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "cyan" | "magenta" | "muted";
}) {
  const cls = {
    cyan: "border-[#7ad7ff]/30 bg-[#7ad7ff]/[0.08] text-[#bde8ff]",
    magenta: "border-[#e98dd8]/30 bg-[#e98dd8]/[0.08] text-[#f4c5ec]",
    muted: "border-white/10 bg-white/[0.04] text-white/45",
  }[tone];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] ${cls}`}
    >
      {children}
    </span>
  );
}
