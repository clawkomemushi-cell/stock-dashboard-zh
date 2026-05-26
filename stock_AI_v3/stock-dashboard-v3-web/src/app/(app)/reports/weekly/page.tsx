import { redirect } from "next/navigation";
import { getAdapters } from "@/lib/adapters";
import { tryAsync } from "@/lib/utils/safe";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

export const dynamic = "force-dynamic";

export default async function WeeklyReportsLandingPage() {
  const adapters = getAdapters();
  const result = await tryAsync(() => adapters.reports.listRecentWeekly());

  if (!result.ok) {
    return <ErrorState detail={result.error.message} />;
  }

  const list = result.value;
  if (list && list.length > 0) {
    redirect(list[0].href);
  }

  return (
    <EmptyState
      title="尚無週回顧報告"
      description="目前沒有可用的週回顧報告，待 AI 流程發布後將自動導向最新報告。"
    />
  );
}
