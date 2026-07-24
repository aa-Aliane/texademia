import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getCookieHeader = createIsomorphicFn()
  .server(() => getRequest()?.headers.get("cookie") ?? null)
  .client(() => null);
