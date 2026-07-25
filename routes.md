# Tree View:
```
frontend/src/routes
├── __root.tsx
├── index.tsx
├── login.tsx
├── profile.tsx
├── redaction.$documentId.tsx
├── redaction.index.tsx
└── register.tsx

```

# Content:

## __root.tsx

```tsx
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { theme } from '#/shared/theme/theme'
import mantineCss from '@mantine/core/styles.css?url'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { AppShell } from '#/shared/ui/app-shell/appShell'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Texademia',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: mantineCss,
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <HeadContent />
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <AppShell>{children}</AppShell>
        </MantineProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

```


## index.tsx

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ApiError } from "#/shared/api/client";
import { currentUserQueryOptions } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      await queryClient.ensureQueryData(currentUserQueryOptions(getCookieHeader()));
      throw redirect({ to: "/redaction" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw redirect({ to: "/login" });
      }
      throw err; // real errors (network, 500...) and the redirect() above both fall through here
    }
  },
});

```


## login.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "#/features/auth";

export const Route = createFileRoute("/login")({ component: LoginForm });

```


## profile.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { ProfileForm, requireAuth } from "#/features/auth";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  component: ProfileForm,
});

```


## redaction.$documentId.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { documentQueryOptions } from "#/features/redaction";
import { RedactionPage } from "#/features/redaction";
import { requireAuth } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/redaction/$documentId")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  loader: ({ context: { queryClient }, params: { documentId } }) =>
    queryClient.ensureQueryData(documentQueryOptions(documentId, getCookieHeader())),
  component: () => {
    const { documentId } = Route.useParams();
    return <RedactionPage key={documentId} documentId={documentId} />;
  },
});

```


## redaction.index.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { documentsQueryOptions, DocumentsListPage } from "#/features/redaction";
import { requireAuth } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/redaction/")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  loader: ({ context: { queryClient } }) =>
      queryClient.ensureQueryData(documentsQueryOptions(getCookieHeader())),
  component: DocumentsListPage,
});

```


## register.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "#/features/auth";

export const Route = createFileRoute("/register")({ component: RegisterForm });

```

