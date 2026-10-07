"use client";

import dynamic from "next/dynamic";

export const ClientConversationWorkspaceLoader = dynamic(
  () =>
    import("@/components/client-conversation-workspace").then((module) => ({
      default: module.ClientConversationWorkspace,
    })),
  {
    ssr: false,
  }
);
