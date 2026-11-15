import type { ContentIconName } from "./contentIcons";

/**
 * The words on the storefront's help screens, written once for any shop.
 *
 * The footer always promised a FAQ, a customer-service desk, a returns policy
 * and product support. The pages behind those links exist now, and their copy
 * lives here rather than inside the four route files, for one reason: none of
 * it names this shop. Every place a name, a phone number, an address or a
 * delivery promise belongs carries a token instead, and the page fills those in
 * from the settings the owner already edits — so a deployment for a different
 * store reads like it was written for that store, without a developer touching
 * a single sentence.
 *
 * Keeping the copy out of the components also means the same document can be
 * rendered by a card, a drawer, or an email footer later on. Nothing here
 * imports React, so it stays plain data on both sides of the server boundary.
 */

/** The placeholders a document may carry, filled from the site settings. */
export const CONTENT_TOKENS = [
  "site",
  "email",
  "phone",
  "hours",
  "address",
  "delivery",
  "returns",
] as const;

export type ContentToken = (typeof CONTENT_TOKENS)[number];
export type ContentVars = Record<ContentToken, string>;

/**
 * Replaces `{token}` with its value.
 *
 * An unknown token is left standing rather than blanked, so a missing setting
 * shows up as `{phone}` on the page — loud enough to notice, and never a
 * silently empty sentence.
 */
export function fillContent(text: string, vars: ContentVars): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? vars[name as ContentToken] : whole
  );
}

export interface ContentSection {
  icon: ContentIconName;
  heading: string;
  body: string;
  /** One line per point, shown with a tick. */
  bullets?: string[];
  /** An ordered walk-through, numbered on the page. */
  steps?: { title: string; body: string }[];
  /** A closing remark, set apart in a tinted strip. */
  note?: string;
}

export interface ContentDoc {
  /** Matches the route the footer links to. */
  slug: "faq" | "customer-service" | "returns" | "support";
  eyebrow: string;
  title: string;
  summary: string;
  icon: ContentIconName;
  updated: string;
  facts: { icon: ContentIconName; value: string; label: string }[];
  sections: ContentSection[];
  faqs: { icon: ContentIconName; question: string; answer: string }[];
  closing: {
    heading: string;
    body: string;
    action: { label: string; href: string };
    secondary?: { label: string; href: string };
  };
}

const SUPPORT_ACTIONS = {
  action: { label: "Contact customer service", href: "/customer-service" },
  secondary: { label: "Track an order", href: "/track-order" },
};

export const CONTENT_PAGES: Record<ContentDoc["slug"], ContentDoc> = {
  /* ── The questions themselves ─────────────────────────────────────────── */
  faq: {
    slug: "faq",
    eyebrow: "Straight answers",
    title: "Frequently asked questions",
    summary:
      "The questions the support desk is asked most, answered in full — no phone call, no waiting for a reply.",
    icon: "help",
    updated: "August 2026",
    facts: [
      { icon: "support", value: "24/7", label: "Support line" },
      { icon: "returns", value: "30 days", label: "To change your mind" },
      { icon: "truck", value: "{delivery}", label: "Typical delivery" },
      { icon: "user", value: "1 account", label: "To buy, sell and deliver" },
    ],
    sections: [
      {
        icon: "shopping",
        heading: "Orders and payment",
        body: "An order is placed the moment you confirm at checkout, and it is confirmed the moment payment clears. You receive the order number immediately, and every later change — packed, handed over, delivered — is added to it.",
        bullets: [
          "Cards, digital wallets and cash on delivery, depending on your region.",
          "Coupons apply before payment, never after, so the total you see is the total you pay.",
          "Prices and stock are checked again at the moment of payment, not just when the product was added to the cart.",
        ],
      },
      {
        icon: "navigation",
        heading: "Delivery and tracking",
        body: "Every paid order has a tracking page. It shows the stages the parcel has passed and, once a delivery partner sets off with it, a live map of where it is.",
        bullets: [
          "The map opens when the parcel is genuinely on its way to you — not when it is still on the shop counter.",
          "The delivery estimate counts from the moment the partner starts the delivery, so it does not include waiting at the shop.",
          "If you are not in, the partner calls the number on the order before leaving.",
        ],
        note: "Typical delivery is {delivery}. Busy periods and remote addresses can add a day.",
      },
      {
        icon: "returns",
        heading: "Returns and exchanges",
        body: "Anything you are not happy with can go back within 30 days of arriving, unused and in its packaging. The full process is on the returns page.",
        note: "A refund lands back on the method you paid with, usually within a week of the parcel being received.",
      },
      {
        icon: "user",
        heading: "Your account",
        body: "One account covers everything. Buying, selling and delivering are roles on that same account, so nothing is copied, reset or duplicated when one is added.",
        bullets: [
          "You can shop while you sell — a seller may still fill a cart from another shop.",
          "A rider or seller switches between dashboards without signing out.",
          "Closing one role leaves the others exactly as they were.",
        ],
      },
    ],
    faqs: [
      {
        icon: "package",
        question: "Where is my order?",
        answer:
          "Open the tracking page from your orders and put the order number in. You will see the stages it has passed, and a live map once the delivery partner has it. If nothing moves for a day, write to {email} with the order number and we will chase it.",
      },
      {
        icon: "user",
        question: "Do I need an account to shop?",
        answer:
          "You can browse and fill a cart without one, but an account is needed to check out — it is what the order is attached to, and what makes tracking and returns possible afterwards. Creating one takes an email address.",
      },
      {
        icon: "clock",
        question: "Can I change or cancel an order after placing it?",
        answer:
          "Yes, until it is packed. Write to {email} or call {phone} with the order number; if it has already left, we will help you return it instead. Nothing is charged for a cancellation made before dispatch.",
      },
      {
        icon: "card",
        question: "Which payment methods do you accept?",
        answer:
          "Credit and debit cards, digital wallets, and cash on delivery where the region supports it. Every payment is taken through the processor's own page — no card number is ever stored by {site}.",
      },
      {
        icon: "wallet",
        question: "How long does a refund take?",
        answer:
          "We approve refunds within a day of the returned parcel arriving. The money then takes five to seven business days to reappear, depending on your bank — that part is out of our hands, and the timing is set by the card issuer.",
      },
      {
        icon: "truck",
        question: "Can I sell or deliver through {site}?",
        answer:
          "Yes. There is an application for each: one for a shop, one for a delivery partner. Both are reviewed by hand, and both add a role to the account you already have rather than creating a second one.",
      },
    ],
    closing: {
      heading: "Still not answered?",
      body: "Send the question to the support desk. A person reads every message, and the first reply normally arrives the same day.",
      ...SUPPORT_ACTIONS,
    },
  },

  /* ── The desk itself ──────────────────────────────────────────────────── */
  "customer-service": {
    slug: "customer-service",
    eyebrow: "Here to help",
    title: "Customer service",
    summary:
      "One desk for orders, payments, deliveries and accounts — reachable by phone, by email, and from inside your own dashboard.",
    icon: "support",
    updated: "August 2026",
    facts: [
      { icon: "support", value: "{phone}", label: "Call, day or night" },
      { icon: "message", value: "{email}", label: "Replies within a day" },
      { icon: "clock", value: "{hours}", label: "Phone line hours" },
      { icon: "pin", value: "{site}", label: "{address}" },
    ],
    sections: [
      {
        icon: "message",
        heading: "Ways to reach us",
        body: "Pick whichever suits the problem. A call is fastest for anything urgent and in motion; an email is better for anything that needs a document or a photograph attached.",
        bullets: [
          "Phone {phone} — the line is answered around the clock.",
          "Email {email} — replies come from a person, normally within a working day.",
          "Visit {address} during {hours} if you would rather speak face to face.",
          "Orders and deliveries can be raised straight from your dashboard, where the order number is already attached.",
        ],
      },
      {
        icon: "check",
        heading: "Before you write",
        body: "Three details turn a conversation into a fix on the first reply. Having them ready is the difference between one message and five.",
        steps: [
          {
            title: "The order number",
            body: "It is on the confirmation email and at the top of the order in your dashboard.",
          },
          {
            title: "What went wrong",
            body: "A sentence is enough: wrong item, late, damaged, charged twice. Photographs help for anything visible.",
          },
          {
            title: "What would put it right",
            body: "A refund, a replacement, or a different address. We will offer options, but knowing your preference saves a round trip.",
          },
        ],
      },
      {
        icon: "shield",
        heading: "What we can put right",
        body: "The desk is not a message-taker. These are settled directly by the person who answers.",
        bullets: [
          "Correcting a delivery address before the parcel is dispatched.",
          "Cancelling an order that has not been packed yet.",
          "Chasing a parcel that has stopped moving, and re-sending one that never arrived.",
          "Refund status — where it is, and why it has not appeared.",
          "Access to an account, including a role that was suspended.",
          "A missing or damaged item in a delivery that otherwise arrived.",
        ],
      },
      {
        icon: "safety",
        heading: "If it is not settled",
        body: "Every message gets a reference, and every reference belongs to one person until it is closed. If the answer you receive does not resolve the problem, reply on the same thread and say so — it returns to the same case rather than starting again.",
        note: "Nothing is closed while money is still owed to you, and a closed case can always be reopened by replying to it.",
      },
    ],
    faqs: [
      {
        icon: "clock",
        question: "How quickly will I hear back?",
        answer:
          "The phone line is answered around the clock. Email is normally answered the same working day; if your message arrives overnight, expect a reply the next morning.",
      },
      {
        icon: "package",
        question: "Can I change the address after ordering?",
        answer:
          "Yes, while the parcel is still with the shop. Once a delivery partner has it, they call the number on the order before arriving, and that is the moment to redirect them.",
      },
      {
        icon: "returns",
        question: "Do I have to return the item before a refund?",
        answer:
          "For a change of mind, yes — the refund is issued once the parcel is back with the seller. For an item that arrived damaged or was never delivered, no return is needed.",
      },
      {
        icon: "user",
        question: "Can someone else collect my order?",
        answer:
          "Yes. Give the delivery code to whoever is collecting. The partner asks for it at the door, and it is the only proof they need.",
      },
    ],
    closing: {
      heading: "The fastest route to an answer",
      body: "Most questions about a parcel are answered by the tracking page itself, without waiting for a reply.",
      action: { label: "Track an order", href: "/track-order" },
      secondary: { label: "Read the FAQ", href: "/faq" },
    },
  },

  /* ── Changing your mind ───────────────────────────────────────────────── */
  returns: {
    slug: "returns",
    eyebrow: "30-day window",
    title: "Returns and exchanges",
    summary:
      "If something is not right, it can go back — unused, in its packaging, within thirty days of arriving. No phone call and no explanation needed.",
    icon: "returns",
    updated: "August 2026",
    facts: [
      { icon: "calendar", value: "30 days", label: "From the day it arrived" },
      { icon: "returns", value: "5–7 days", label: "For the refund to land" },
      { icon: "truck", value: "Free", label: "Collection from your door" },
      { icon: "box", value: "One form", label: "No call required" },
    ],
    sections: [
      {
        icon: "box",
        heading: "What can go back",
        body: "Almost everything, provided it is in the state it arrived in. A quick check before you pack it saves the parcel a wasted journey.",
        bullets: [
          "Unopened, unused, and in the original packaging with any seals intact.",
          "Faulty on arrival — this one is unconditional, and the return is free.",
          "Wrong item delivered, or a size or colour that was mislabelled.",
          "Not what was ordered from the product page.",
        ],
        note: "Perishables, personal care items that have been opened, and digital codes that have been redeemed cannot be returned unless they were faulty. This is stated on those product pages before you buy.",
      },
      {
        icon: "navigation",
        heading: "How to send something back",
        body: "Four steps, all of them from your own account. Nothing needs printing if you do not have a printer.",
        steps: [
          {
            title: "Open the order",
            body: "Find it under orders in your dashboard and choose return on the item — not on the whole order, unless everything is going back.",
          },
          {
            title: "Say why",
            body: "One line is enough. It is used to decide whether the return is free, and it is how faulty batches get noticed.",
          },
          {
            title: "Pack it",
            body: "Use the original box where you have it, with any accessories, manuals and free gifts included.",
          },
          {
            title: "Hand it over",
            body: "A partner collects from your address on the date you chose, or you can drop it at a collection point.",
          },
        ],
      },
      {
        icon: "wallet",
        heading: "Refunds",
        body: "The refund is approved within a day of the parcel reaching the seller, and returns to the method you paid with. Cards take five to seven business days after that — the delay belongs to the bank, not to us, and no refund can be made in cash or to a different card.",
        bullets: [
          "Delivery charges are refunded in full when the whole order goes back.",
          "On a partial return, the original delivery charge is not refunded.",
          "Cash-on-delivery orders are refunded by bank transfer, so an account number is needed.",
        ],
      },
      {
        icon: "shopping",
        heading: "Exchanges",
        body: "An exchange is a return and a new order, done together. If the replacement costs more, the difference is charged; if it costs less, the difference is refunded. Stock is not held while the first parcel travels, so the honest way to be sure of getting the size you want is to place the new order immediately and send the first one back.",
        note: "Anything bought with a coupon is refunded at the price actually paid, not the price before the discount.",
      },
    ],
    faqs: [
      {
        icon: "clock",
        question: "When does the thirty days start?",
        answer:
          "On the day the parcel is marked delivered, not the day it was ordered. If the parcel arrived late, the window starts when it actually reached you.",
      },
      {
        icon: "truck",
        question: "Do I pay for the return?",
        answer:
          "No. Collection is free for faulty, damaged or wrongly sent items, and for any return from most regions. Where a return fee does apply, it is shown on the return form before you submit it — never charged afterwards.",
      },
      {
        icon: "package",
        question: "What if it arrived damaged?",
        answer:
          "Photograph it before opening anything further and raise the return as damaged. No return postage is charged, and the replacement or refund is arranged without waiting for the parcel to come back.",
      },
      {
        icon: "file",
        question: "Do I need the receipt?",
        answer:
          "No. The order is attached to your account, and that is the proof of purchase. A gift received from someone else can be returned with the order number, and the refund goes back to the original payment method.",
      },
      {
        icon: "wallet",
        question: "Can a refund go to a different card?",
        answer:
          "No. It must return to the method that paid, because that is what protects both sides from fraud. A replacement order can of course be paid for with anything.",
      },
    ],
    closing: {
      heading: "Something arrived not as it should?",
      body: "Damaged, faulty or simply wrong — tell the desk and it is sorted without postage or argument.",
      ...SUPPORT_ACTIONS,
    },
  },

  /* ── After the sale ───────────────────────────────────────────────────── */
  support: {
    slug: "support",
    eyebrow: "After the sale",
    title: "Product support",
    summary:
      "Manuals, warranty cover and repair routes for anything you have bought — checked against the order, so the proof of purchase is already there.",
    icon: "safety",
    updated: "August 2026",
    facts: [
      { icon: "file", value: "Manuals", label: "On every product page" },
      { icon: "safety", value: "Warranty", label: "Tracked against the order" },
      { icon: "clock", value: "2 days", label: "Typical first answer" },
      { icon: "support", value: "{phone}", label: "Support line" },
    ],
    sections: [
      {
        icon: "file",
        heading: "Start with the manual",
        body: "Nine problems in ten are answered by the manual, and it is already on the product page you bought from — under the specifications, before the reviews. It covers setup, pairing, resets and the error codes the display can show.",
        bullets: [
          "The model number is on the box, on a label underneath the device, and in the order details.",
          "Specifications, box contents and warranty length sit on the same product page.",
          "A missing manual can be emailed to you; write to {email} with the order number.",
        ],
      },
      {
        icon: "check",
        heading: "Four checks worth doing first",
        body: "These catch the majority of what looks like a fault and is not one. They take ten minutes and save a return.",
        steps: [
          {
            title: "Power it properly",
            body: "Charge for a full hour with the cable it came with, then hold the power button for ten seconds rather than tapping it.",
          },
          {
            title: "Try the other half",
            body: "If it pairs with a phone but not a laptop, the fault is usually the laptop. Test the cable, the port and another device.",
          },
          {
            title: "Reset it",
            body: "The manual gives the reset sequence. Most devices hold settings and pairings that a reset clears.",
          },
          {
            title: "Note the model and the symptom",
            body: "Exact model number, what you did, and what happened. That is what gets a fix on the first reply.",
          },
        ],
      },
      {
        icon: "safety",
        heading: "Warranty cover",
        body: "Every product carries the manufacturer's warranty stated on its page, and it is tracked against your order rather than a paper receipt you have to keep. Your dashboard shows, for each item, whether it is covered and until when.",
        bullets: [
          "Cover follows the item, so a gift is still covered in the recipient's hands.",
          "Faults present from new are covered from the delivery date.",
          "Wear that comes from use — a worn battery, a scratched screen — is not a fault, and is not covered.",
          "Repairs by an unauthorised workshop end the cover on that item.",
        ],
        note: "Keep the order and its accessories together. A warranty repair is quicker when the whole thing can be identified from the order number alone.",
      },
      {
        icon: "package",
        heading: "Repair or replacement",
        body: "When a check does turn up a real fault, there are two routes and the choice is yours: a replacement, sent once the faulty item is collected, or a repair through the manufacturer's service network.",
        bullets: [
          "Raise it from the order in your dashboard, or write to {email} with the order number.",
          "Photographs or a short video of the fault speed up approval considerably.",
          "Collection of the faulty item is free while it is under warranty.",
          "A replacement is dispatched as soon as the fault is confirmed, not when the old one is inspected.",
        ],
        note: "Outside the warranty window, support still applies — the desk can quote a repair, or point you at the parts.",
      },
    ],
    faqs: [
      {
        icon: "file",
        question: "Where do I find the manual?",
        answer:
          "On the product page, in the specifications section. If the version there is not the one you need, email {email} with the order number and the model, and it will be sent to you.",
      },
      {
        icon: "safety",
        question: "How do I check my warranty?",
        answer:
          "Open the order in your dashboard: each item shows its cover and the date it runs to. The length comes from the product page at the time of purchase, so it is the same figure you agreed to.",
      },
      {
        icon: "package",
        question: "It arrived broken. Is that a return or a warranty claim?",
        answer:
          "A return. Anything wrong out of the box within the return window is handled as damaged on arrival, with no postage and no inspection. Warranty takes over after that window.",
      },
      {
        icon: "clock",
        question: "How long does a repair take?",
        answer:
          "A replacement is typically dispatched within two working days of the fault being confirmed. A manufacturer repair depends on their workshop — the desk will give you their estimate rather than one of its own.",
      },
      {
        icon: "message",
        question: "Can you help with something I bought elsewhere?",
        answer:
          "We can help with the manual and general advice, but warranty and repairs only apply to items bought from {site}, because the cover is tied to the order.",
      },
    ],
    closing: {
      heading: "Still not working?",
      body: "Write with the order number and the model, and the desk will work through it with you — replacement, repair or a quote.",
      action: { label: "Contact customer service", href: "/customer-service" },
      secondary: { label: "Read the FAQ", href: "/faq" },
    },
  },
};

export type ContentSlug = ContentDoc["slug"];
