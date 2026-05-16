import Image from "next/image";
import { CredentialsForm } from "@/components/auth/CredentialsForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ from?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const redirectTo = typeof params.from === "string" ? params.from : "/";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#07080c] px-6 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 30%, rgba(125,211,252,0.18) 0%, transparent 45%), radial-gradient(circle at 75% 70%, rgba(167,139,250,0.16) 0%, transparent 45%)",
        }}
      />
      <div className="relative z-10 w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
        <header className="space-y-3 text-center">
          <Image
            src="/nori-logo.png"
            alt="Nori"
            width={64}
            height={64}
            priority
            className="mx-auto rounded-2xl"
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-white/55">
            Sign in to your collaborative workspace.
          </p>
        </header>

        <CredentialsForm redirectTo={redirectTo} />

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/30">
          <span className="h-px flex-1 bg-white/10" />
          or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <OAuthButtons redirectTo={redirectTo} />
      </div>
    </main>
  );
}
