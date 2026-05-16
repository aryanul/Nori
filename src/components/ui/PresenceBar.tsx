export function PresenceBar() {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 backdrop-blur-xl">
      <span className="size-2 rounded-full bg-emerald-400/80 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
      <span>Solo session</span>
    </div>
  );
}
