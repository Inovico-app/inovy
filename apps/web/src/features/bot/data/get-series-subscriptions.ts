import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";

export async function getSeriesSubscriptions(
  userId: string,
  organizationId: string,
) {
  "use cache";
  return BotSeriesSubscriptionsQueries.findByUserAndOrg(userId, organizationId);
}
