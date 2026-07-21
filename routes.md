# Tree View:
```
frontend/src/routes
├── __root.tsx
├── index.tsx
├── redaction.$documentId.tsx
└── redaction.tsx

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
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
      <p className="mt-4 text-lg">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
    </div>
  )
}

```


## redaction.$documentId.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { documentQueryOptions } from "#/features/redaction";
import { RedactionPage } from "#/features/redaction";

export const Route = createFileRoute("/redaction/$documentId")({
  loader: ({ context: { queryClient }, params: { documentId } }) =>
    queryClient.ensureQueryData(documentQueryOptions(documentId)),
  component: () => {
    const { documentId } = Route.useParams();
    return <RedactionPage documentId={documentId} />;
  },
});

```


## redaction.tsx

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createDocument } from "#/features/redaction";

export const Route = createFileRoute("/redaction")({
  loader: async () => {
    const doc = await createDocument("Untitled", "default");
    throw redirect({
      to: "/redaction/$documentId" as any,
      params: { documentId: doc.id },
    });
  },
});

```

