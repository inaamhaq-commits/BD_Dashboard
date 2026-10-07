import { ReactNode } from "react";
import { ManagerDashboardShell } from "@/components/manager-dashboard-shell";

export default function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ManagerDashboardShell>{children}</ManagerDashboardShell>;
}
