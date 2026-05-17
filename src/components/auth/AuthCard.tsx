"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthCard({ eyebrow, title, subtitle, children }: Props) {
  return (
    <main className="no-scrollbar relative z-10 flex h-dvh w-full items-center justify-center overflow-y-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-85)] px-8 py-9 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {/* Top hairline highlight — single subtle "lit-from-above" cue */}
          <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--highlight)] to-transparent" />

          <header className="mb-7">
            <div className="mb-5 flex items-center gap-2.5">
              <Image
                src="/nori-logo.png"
                alt="Nori"
                width={28}
                height={28}
                priority
                className="rounded-md"
              />
              <span className="text-sm font-medium tracking-tight text-[var(--ink-1)]">
                Nori
              </span>
            </div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--ink-3)]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-light leading-[1.05] tracking-[-0.02em] text-[var(--ink-1)]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]">
              {subtitle}
            </p>
          </header>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="space-y-5"
          >
            {children}
          </motion.div>
        </div>

        <p className="mt-5 text-center text-[10px] uppercase tracking-[0.25em] text-[var(--ink-4)]">
          Nori · realtime spatial canvases
        </p>
      </motion.div>
    </main>
  );
}
