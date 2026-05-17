import { SignUpForm } from "@/components/auth/SignUpForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthCard } from "@/components/auth/AuthCard";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ from?: string }>;
};

export default async function SignUpPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const redirectTo = typeof params.from === "string" ? params.from : "/";

  return (
    <AuthCard
      eyebrow="Create your account"
      title="Step into the canvas"
      subtitle="Start brainstorming on infinite spatial canvases with your team."
    >
      <SignUpForm redirectTo={redirectTo} />

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/25">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <OAuthButtons redirectTo={redirectTo} />
    </AuthCard>
  );
}
