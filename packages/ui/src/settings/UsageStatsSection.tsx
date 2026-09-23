import { AppUsagePanel } from "@/settings/usage-stats/AppUsagePanel.js";

export type UsageStatsSectionTab = "app";

export function UsageStatsSection({ activeTab }: { activeTab: UsageStatsSectionTab }) {
  if (activeTab === "app") {
    return <AppUsagePanel />;
  }

  return null;
}
