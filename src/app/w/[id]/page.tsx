import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/actions/workspace";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function WorkspaceRoute(props: PageProps<"/w/[id]">) {
  const { id } = await props.params;
  const snapshot = await getWorkspace(id);
  if (!snapshot) notFound();
  return <WorkspaceShell snapshot={snapshot} />;
}
