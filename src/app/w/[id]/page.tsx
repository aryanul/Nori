import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  getWorkspace,
  joinWorkspaceByToken,
} from "@/lib/actions/workspace";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function WorkspaceRoute(props: PageProps<"/w/[id]">) {
  const { id } = await props.params;
  const search = (await props.searchParams) ?? {};

  const session = await auth();
  if (!session?.user) notFound();

  // If the URL carries an invite token, attempt to attach the current user as
  // a member before loading the workspace. We don't redirect after — the
  // ?invite= staying in the URL is harmless, and skipping the redirect
  // eliminates a class of session-timing bugs after sign-in flows.
  const invite = typeof search.invite === "string" ? search.invite : null;
  if (invite) {
    const result = await joinWorkspaceByToken(id, invite);
    if (!result.ok) {
      console.warn(
        `[/w/${id}] invite rejected: ${result.reason}`,
      );
    }
  }

  const snapshot = await getWorkspace(id);
  if (!snapshot) notFound();

  return (
    <WorkspaceShell
      snapshot={snapshot}
      viewer={{
        name: session.user.name ?? session.user.email ?? null,
        image: session.user.image ?? null,
      }}
    />
  );
}
