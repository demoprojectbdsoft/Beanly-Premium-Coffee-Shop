import {
  BadgeCheck,
  Box,
  CalendarDays,
  Clock3,
  CreditCard,
  FileCheck2,
  Gauge,
  Headphones,
  HelpCircle,
  LifeBuoy,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Receipt,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store,
  Ticket,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * The illustrations the informational screens draw on, addressed by a name.
 *
 * A page that was written on the server cannot hand a component to a client
 * component — React serialises what crosses that boundary, and a component is a
 * function, which does not survive the trip. Passing `"wallet"` and looking the
 * glyph up here keeps the copy in one place, the drawings in another, and the
 * boundary plain data.
 *
 * A name that is not in the table falls back to a help mark rather than
 * throwing, so a typo in a content file costs an icon, not a page.
 */
export const CONTENT_ICONS = {
  user: User,
  clock: Clock3,
  file: FileCheck2,
  navigation: Navigation,
  wallet: Wallet,
  shield: ShieldAlert,
  shopping: ShoppingBag,
  gauge: Gauge,
  store: Store,
  truck: Truck,
  pin: MapPin,
  box: Box,
  ticket: Ticket,
  card: CreditCard,
  returns: RotateCcw,
  support: Headphones,
  help: LifeBuoy,
  message: MessageSquare,
  check: BadgeCheck,
  safety: ShieldCheck,
  package: Package,
  calendar: CalendarDays,
  receipt: Receipt,
} satisfies Record<string, LucideIcon>;

export type ContentIconName = keyof typeof CONTENT_ICONS;

/** The glyph for a name, or a question mark when the name is unknown. */
export function contentIcon(name?: ContentIconName | null): LucideIcon {
  return (name && CONTENT_ICONS[name]) || HelpCircle;
}
