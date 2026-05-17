import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  getWorkspace,
  joinWorkspaceAsViewer,
  joinWorkspaceByToken,
} from "@/lib/actions/workspace";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function WorkspaceRoute(props: PageProps<"/w/[id]">) {
  const { id } = await props.params;
  const search = (await props.searchParams) ?? {};

  const session = await auth();
  if (!session?.user) notFound();

  // Edit-invite token. Takes precedence over view token — if both were
  // somehow on the URL, the user gets the better permission.
  const invite = typeof search.invite === "string" ? search.invite : null;
  if (invite) {
    const result = await joinWorkspaceByToken(id, invite);
    if (!result.ok) {
      console.warn(`[/w/${id}] invite rejected: ${result.reason}`);
    }
  }

  // View-only token. Adds the user as a viewer (read-only) iff they aren't
  // already a member/owner.
  const view = typeof search.view === "string" ? search.view : null;
  if (view) {
    const result = await joinWorkspaceAsViewer(id, view);
    if (!result.ok) {
      console.warn(`[/w/${id}] view rejected: ${result.reason}`);
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
