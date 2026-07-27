# Tree View:
```
frontend/src/shared
├── api
│   ├── client.ts
│   └── serverCookie.ts
├── styles
│   ├── animations.module.css
│   └── tokens.module.css
├── theme
│   └── theme.ts
└── ui
    ├── app-shell
    │   ├── appShell.tsx
    │   └── headerPortal.tsx
    └── card
        ├── card.module.css
        └── card.tsx

```

# Content:

## api/client.ts

```ts
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// SSR (inside the frontend container) must reach the backend via Docker's
// internal service name. Client-side (browser) must use localhost, since
// that's what's actually published to your host machine.
function resolveBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL ?? "http://backend:8000";
  }
  return import.meta.env.VITE_API_URL ?? "http://localhost:8000";
}

interface RequestOptions extends RequestInit {
  // Pass through the incoming request's Cookie header during SSR,
  // since server-side fetch doesn't have access to the browser's cookie jar.
  cookieHeader?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { cookieHeader, headers, ...rest } = options;
  const baseUrl = resolveBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON error body, ignore
    }
    const message =
      (body as any)?.detail?.message ?? (body as any)?.detail ?? `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

// The PDF URL the backend returns is host-relative and only makes sense
// from the browser's perspective — use this whenever you render one.
export function toPublicUrl(path: string): string {
  const publicBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return `${publicBase}${path}`;
}

```


## api/serverCookie.ts

```ts
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getCookieHeader = createIsomorphicFn()
  .server(() => getRequest()?.headers.get("cookie") ?? null)
  .client(() => null);

```


## styles/animations.module.css

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
}

```


## styles/tokens.module.css

```css
:root {
  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-surface-raised: #ffffff;
  --color-border: #e5e5e5;
  --color-text: #18181b;
  --color-text-secondary: #71717a;
  --color-text-muted: #a1a1aa;

  --color-accent: #6366f1;
  --color-accent-hover: #4f46e5;
  --color-accent-subtle: #eef2ff;

  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  --font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}

html[data-mantine-color-scheme="dark"] {
  --color-bg: #0a0a0a;
  --color-surface: #18181b;
  --color-surface-raised: #1f1f23;
  --color-border: #27272a;
  --color-text: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;

  --color-accent: #818cf8;
  --color-accent-hover: #6366f1;
  --color-accent-subtle: #1e1b4b;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}

```


## theme/theme.ts

```ts
import { createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

const accent: MantineColorsTuple = [
  "#eef2ff",
  "#e0e7ff",
  "#c7d2fe",
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#4f46e5",
  "#4338ca",
  "#3730a3",
  "#312e81",
];

export const theme = createTheme({
  fontFamily: "var(--font-family)",
  primaryColor: "accent",
  colors: {
    accent,
  },
  defaultRadius: "md",
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
  },
  fontSizes: {
    xs: "12px",
    sm: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
  },
  shadows: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
  },

  components: {
    Button: {
      defaultProps: { size: "sm" },
      styles: {
        root: {
          fontWeight: 500,
          transition: "background-color 0.15s ease, transform 0.05s ease",
          "&:active": {
            transform: "scale(0.98)",
          },
        },
      },
    },

    TextInput: {
      defaultProps: { size: "sm" },
      styles: {
        input: {
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
          "&:focus": {
            borderColor: "var(--color-accent)",
            outline: "none",
          },
        },
        label: {
          color: "var(--color-text)",
          fontWeight: 500,
          marginBottom: "4px",
        },
      },
    },

    Select: {
      defaultProps: { size: "sm" },
      styles: {
        input: {
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
        },
        dropdown: {
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          boxShadow: "var(--shadow-md)",
        },
      },
    },

    Card: {
      defaultProps: { padding: "lg", radius: "md" },
      styles: {
        root: {
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        },
      },
    },
  },
});

```


## ui/app-shell/appShell.tsx

```tsx
import { AppShell as MantineAppShell, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { UserMenu } from "#/features/auth";
import { InvitationsBell } from "#/features/redaction"; // NEW

interface AppShellProps {
  children: React.ReactNode;
}
export function AppShell({ children }: AppShellProps) {
  return (
    <MantineAppShell
      header={{ height: 56 }}
      padding={0}
      styles={{
        main: {
          backgroundColor: "var(--color-bg)",
          height: "calc(100dvh - 56px)",
          overflow: "hidden",
        },
        header: {
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        },
      }}
    >
      <MantineAppShell.Header>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            height: "100%",
            paddingInline: "var(--mantine-spacing-lg)",
          }}
        >
          <div style={{ justifySelf: "start", minWidth: 0 }}>
            <Text component={Link} to="/" fw={700} size="md" c="var(--color-text)" style={{ textDecoration: "none" }}>
              Texademia
            </Text>
          </div>
          <div id="app-shell-header-center" style={{ justifySelf: "center", minWidth: 0 }} />
          <div
            style={{
              justifySelf: "end",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "var(--mantine-spacing-md)",
            }}
          >
            <div id="app-shell-header-actions" />
            <InvitationsBell />
            <UserMenu />
          </div>
        </div>
      </MantineAppShell.Header>
      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}

```


## ui/app-shell/headerPortal.tsx

```tsx
// shared/ui/app-shell/headerPortal.tsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type HeaderSlot = "center" | "actions";

const SLOT_IDS: Record<HeaderSlot, string> = {
  center: "app-shell-header-center",
  actions: "app-shell-header-actions",
};

export function AppShellHeaderPortal({
  slot,
  children,
}: {
  slot: HeaderSlot;
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<Element | null>(null);

  // AppShell renders before route content, so the slot div exists by the
  // time this mounts — but we still wait for a real DOM node (client-only).
  useEffect(() => {
    setTarget(document.getElementById(SLOT_IDS[slot]));
  }, [slot]);

  if (!target) return null;
  return createPortal(children, target);
}

```


## ui/card/card.tsx

```tsx
import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={`${styles.card} ${className ?? ""}`}>
      {title && <div className={styles.cardTitle}>{title}</div>}
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

```

