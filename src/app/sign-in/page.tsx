import { CredentialsForm } from "@/components/auth/CredentialsForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthCard } from "@/components/auth/AuthCard";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ from?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const redirectTo = typeof params.from === "string" ? params.from : "/";

  return (
    <AuthCard
      eyebrow="Sign in to Nori"
      title="Welcome back"
      subtitle="Pick up where you left off in your spatial workspace."
    >
      <CredentialsForm redirectTo={redirectTo} />

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-[var(--ink-4)]">
        <span className="h-px flex-1 bg-[var(--border-soft)]" />
        or
        <span className="h-px flex-1 bg-[var(--border-soft)]" />
      </div>

      <OAuthButtons redirectTo={redirectTo} />
    </AuthCard>
  );
}
