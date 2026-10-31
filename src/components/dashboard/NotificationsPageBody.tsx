import { loadFeedPage } from "@/lib/action/notifications";
import type { NotificationView } from "@/lib/notifications";
import NotificationCenter from "./NotificationCenter";

/**
 * The body of every notifications page.
 *
 * The first page is read on the server with the session token, so the API
 * decides whose lines these are; this component never names a user id. The
 * centre then searches, filters and pages them on the client through the same
 * endpoint, which is what keeps one screen serving all four roles.
 */
export default async function NotificationsPageBody({ view }: { view: NotificationView }) {
  const initial = await loadFeedPage({ limit: 20 });

  return <NotificationCenter view={view} initial={initial} />;
}
