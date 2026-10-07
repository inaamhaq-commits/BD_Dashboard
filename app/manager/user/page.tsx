import { Suspense } from "react";
import { ManagerUsersPage } from "@/components/manager-users-page";

export default function ManagerUserRoute() {
  return (
    <Suspense fallback={null}>
      <ManagerUsersPage />
    </Suspense>
  );
}
