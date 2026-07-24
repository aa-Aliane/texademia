import { getRequest } from "@tanstack/react-start/server";

export function getCookieHeader(): string | null {
  if (typeof window !== "undefined") return null;
  const request = getRequest();
  return request?.headers.get("cookie") ?? null;
}
