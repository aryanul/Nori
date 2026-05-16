import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "@/components/ui/UserMenu";
import {
  createWorkspaceAndRedirect,
  listRecentWorkspaces,
} from "@/lib/actions/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  let recent: Awaited<ReturnType<typeof listRecentWorkspaces>> = [];
  let dbError: string | null = null;
  try {
    recent = await listRecentWorkspaces(8);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#07080c] px-6 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(125,211,252,0.18) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(167,139,250,0.16) 0%, transparent 45%)",
        }}
      />

      {user && (
        <div className="absolute right-4 top-4 z-20">
          <UserMenu name={user.name ?? user.email} image={user.image} />
        </div>
      )}

      <div className="relative z-10 w-full max-w-xl space-y-8 rounded-3xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-xl">
        <header className="space-y-3">
          <Image
            src="/nori-logo.png"
            alt="Nori"
            width={56}
            height={56}
            priority
            className="rounded-2xl"
          />
          <h1 className="text-3xl font-semibold tracking-tight">
            The collaborative spatial workspace
          </h1>
          <p className="text-sm text-white/60">
            {user?.name
              ? `Welcome back, ${user.name.split(" ")[0]}.`
              : "Create a new infinite canvas, or jump back into a recent one."}
          </p>
        </header>

        <form action={createWorkspaceAndRedirect}>
          <button
            type="submit"
            className="w-full rounded-2xl border border-sky-400/40 bg-sky-400/10 px-4 py-3 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-400/20"
          >
            Create new workspace →
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-white/40">
            Recent
          </h2>
          {dbError ? (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
              Couldn’t reach MongoDB: {dbError}
            </p>
          ) : recent.length === 0 ? (
            <p className="text-xs text-white/40">No workspaces yet.</p>
          ) : (
            <ul className="space-y-1">
              {recent.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/w/${w.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="truncate">{w.title}</span>
                      {w.isShared && (
                        <span className="rounded-md border border-sky-300/30 bg-sky-300/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-200/80">
                          shared
                        </span>
                      )}
                      {w.isLegacyOrphan && (
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/40">
                          legacy
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-white/40">
                      {new Date(w.updatedAt).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="text-xs text-white/30">
          DB health: <code className="text-white/50">/api/health/db</code>
        </footer>
      </div>
    </main>
  );
}
