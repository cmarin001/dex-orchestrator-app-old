import { ApiError } from "./client";


export async function browserSession(signal?: AbortSignal) {
  const response = await fetch("/auth/me", {
    signal, credentials: "same-origin", cache: "no-store", redirect: "error",
  });
  if (!response.ok) throw new ApiError(response.status, "auth_unavailable");
  const body: unknown = await response.json();
  return typeof body === "object" && body !== null && "authenticated" in body && body.authenticated === true;
}

export async function signOut() {
  const response = await fetch("/auth/logout", {
    method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
    headers: { "X-Dex-CSRF": "1" },
  });
  if (!response.ok) throw new ApiError(response.status, "auth_unavailable");
}

export function signIn() { window.location.assign("/auth/login"); }
