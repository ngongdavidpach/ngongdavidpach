import { getSessionUser } from "@/lib/auth";
import { getWalletBalance } from "@/lib/repositories";
import { getMidRate } from "@/lib/fx";
import { SendFlow } from "@/components/dashboard/send-flow";

export default async function SendPage({
  searchParams,
}: {
  searchParams: { tab?: string; category?: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  const [balanceCents, rate] = await Promise.all([
    getWalletBalance(session.id),
    getMidRate(),
  ]);

  const tab = searchParams.tab === "momo" ? "momo" : "bill";
  return (
    <SendFlow
      initialTab={tab}
      initialCategory={searchParams.category || ""}
      balanceCents={balanceCents}
      rate={rate}
      payerName={session.fullName}
    />
  );
}
