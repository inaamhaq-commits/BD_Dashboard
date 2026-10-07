import { ReactNode } from "react";
import { Suspense } from "react";
import { ManagerDashboardShell } from "@/components/manager-dashboard-shell";

export default function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <ManagerDashboardShell>{children}</ManagerDashboardShell>
    </Suspense>
  );
}
