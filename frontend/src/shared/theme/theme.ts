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
