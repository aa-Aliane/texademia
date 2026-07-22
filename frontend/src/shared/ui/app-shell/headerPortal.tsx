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
