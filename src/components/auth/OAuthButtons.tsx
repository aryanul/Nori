import { signIn } from "@/auth";
import { isGitHubConfigured, isGoogleConfigured } from "@/auth";

type Props = { redirectTo: string };

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.633 22.41c.575.107.787-.25.787-.555 0-.275-.01-1.005-.016-1.973-3.2.695-3.876-1.543-3.876-1.543-.524-1.332-1.28-1.687-1.28-1.687-1.046-.716.08-.702.08-.702 1.157.082 1.766 1.19 1.766 1.19 1.029 1.764 2.7 1.255 3.358.96.105-.746.402-1.255.732-1.544-2.554-.292-5.241-1.278-5.241-5.69 0-1.257.447-2.286 1.183-3.092-.119-.292-.513-1.465.113-3.054 0 0 .965-.31 3.165 1.18a10.94 10.94 0 0 1 5.762 0c2.198-1.49 3.162-1.18 3.162-1.18.627 1.589.232 2.762.114 3.054.738.806 1.181 1.835 1.181 3.092 0 4.424-2.69 5.394-5.252 5.681.413.357.781 1.06.781 2.137 0 1.543-.014 2.789-.014 3.168 0 .308.21.667.793.553A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path
        d="M21.35 11.1H12v2.95h5.35c-.23 1.46-1.7 4.3-5.35 4.3-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.83 3.95 14.7 3 12 3 6.98 3 3 6.95 3 12s3.98 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.6-.07-1.05-.16-1.5z"
      />
    </svg>
  );
}

export function OAuthButtons({ redirectTo }: Props) {
  async function signInWithGitHub() {
    "use server";
    await signIn("github", { redirectTo });
  }
  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo });
  }

  const githubDisabled = !isGitHubConfigured;
  const googleDisabled = !isGoogleConfigured;

  return (
    <div className="space-y-2">
      <form action={signInWithGitHub}>
        <button
          type="submit"
          disabled={githubDisabled}
          title={
            githubDisabled
              ? "Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET in .env.local"
              : "Continue with GitHub"
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--pane-2)] px-4 py-2.5 text-sm font-medium text-[var(--ink-1)] transition-colors hover:bg-[var(--pane-3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--pane-2)]"
        >
          <GitHubIcon />
          Continue with GitHub
          {githubDisabled && (
            <span className="ml-1 rounded-md bg-[var(--pane-3)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--ink-3)]">
              soon
            </span>
          )}
        </button>
      </form>
      <form action={signInWithGoogle}>
        <button
          type="submit"
          disabled={googleDisabled}
          title={
            googleDisabled
              ? "Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in .env.local"
              : "Continue with Google"
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--pane-2)] px-4 py-2.5 text-sm font-medium text-[var(--ink-1)] transition-colors hover:bg-[var(--pane-3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--pane-2)]"
        >
          <GoogleIcon />
          Continue with Google
          {googleDisabled && (
            <span className="ml-1 rounded-md bg-[var(--pane-3)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--ink-3)]">
              soon
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
