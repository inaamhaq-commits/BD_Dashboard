import { ClientConversationWorkspaceLoader } from "@/components/client-conversation-workspace-loader";

type ClientDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientDetailsPage({
  params,
}: ClientDetailsPageProps) {
  const { id } = await params;

  return <ClientConversationWorkspaceLoader clientId={id} />;
}
