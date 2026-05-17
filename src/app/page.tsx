import { auth } from "@/auth";
import { HomeStage } from "@/components/home/HomeStage";
import {
  createWorkspaceAndRedirect,
  listRecentWorkspaces,
} from "@/lib/actions/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  let recent: Awaited<ReturnType<typeof listRecentWorkspaces>> = [];
  let dbError: string | null = null;
  try {
    recent = await listRecentWorkspaces(12);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <HomeStage
      user={user}
      recent={recent}
      dbError={dbError}
      createAction={createWorkspaceAndRedirect}
    />
  );
}
