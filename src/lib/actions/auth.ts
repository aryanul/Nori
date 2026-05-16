"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb-client";
import { signIn, signOut } from "@/auth";

export type AuthFormState = { error: string | null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}

export async function credentialsSignInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/") || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Incorrect email or password."
            : "Couldn’t sign you in. Try again.",
      };
    }
    // Redirect errors from Next.js must be rethrown for navigation to happen.
    throw error;
  }

  return { error: null };
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/") || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "That doesn’t look like a valid email." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const client = await clientPromise;
  const users = client.db("nori").collection("users");
  const existing = await users.findOne({ email });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await users.insertOne({
    name: name || email.split("@")[0],
    email,
    emailVerified: null,
    image: null,
    passwordHash,
    createdAt: new Date(),
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "Account created, but auto sign-in failed. Try signing in manually.",
      };
    }
    throw error;
  }

  // Should be unreachable — signIn redirects above.
  redirect(redirectTo);
}
