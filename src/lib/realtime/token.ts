import { SignJWT, jwtVerify } from "jose";

const ISSUER = "nori";
const AUDIENCE = "nori-realtime";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export type RealtimeTokenPayload = {
  userId: string;
  workspaceId: string;
};

export async function signRealtimeToken(
  payload: RealtimeTokenPayload,
): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    workspaceId: payload.workspaceId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function verifyRealtimeToken(
  token: string,
): Promise<RealtimeTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const workspaceId =
    typeof payload.workspaceId === "string" ? payload.workspaceId : "";
  if (!userId || !workspaceId) {
    throw new Error("Token missing userId or workspaceId");
  }
  return { userId, workspaceId };
}
