// ============================================================
// Demo playground data
//
// Mock household, members and apartments used by the public /demo
// route. Nothing here is ever written to Supabase.
// ============================================================

import { DEFAULT_CHECKLIST } from "@/components/ChecklistModal";
import type {
  ActivityLogEntry,
  Apartment,
  ChecklistData,
  Household,
  HouseholdMember,
  Profile,
} from "@/types/database";

export const DEMO_USER_ID = "demo-user";
export const DEMO_PARTNER_ID = "demo-partner";
export const DEMO_USER_NAME = "You";
export const DEMO_PARTNER_NAME = "Noa";
const DEMO_HOUSEHOLD_ID = "demo-household";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const isoAgo = (ms: number): string => new Date(Date.now() - ms).toISOString();

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  email: null,
  full_name: DEMO_USER_NAME,
  avatar_url: null,
  household_id: DEMO_HOUSEHOLD_ID,
  created_at: isoAgo(7 * DAY_MS),
  updated_at: isoAgo(7 * DAY_MS),
};

export const DEMO_MEMBERS: HouseholdMember[] = [
  { id: DEMO_USER_ID, full_name: DEMO_USER_NAME, avatar_url: null },
  { id: DEMO_PARTNER_ID, full_name: DEMO_PARTNER_NAME, avatar_url: null },
];

export const DEMO_HOUSEHOLD: Household = {
  id: DEMO_HOUSEHOLD_ID,
  name: "You & Noa",
  category: "apartment",
  invite_code: "demo",
  created_by: DEMO_USER_ID,
  created_at: isoAgo(7 * DAY_MS),
};

/** Builds a checklist from the real template with the given item ids pre-checked. */
function buildChecklist(checkedIds: string[]): ChecklistData {
  const checked = new Set(checkedIds);
  return DEFAULT_CHECKLIST.map((category) => ({
    ...category,
    items: category.items.map((item) => ({ ...item, checked: checked.has(item.id) })),
  }));
}

/** Creates a fresh copy of the two demo apartments (call once per page visit). */
export function createDemoApartments(): Apartment[] {
  return [
    {
      id: "demo-apt-1",
      household_id: DEMO_HOUSEHOLD_ID,
      category: "apartment",
      url: "https://www.yad2.co.il/item/demo-tel-aviv",
      title: "Ben Yehuda 112, Tel Aviv",
      price: 7200,
      rooms: "3",
      phone: "050-123-4567",
      seller_name: "Dana (owner)",
      image_url: "/demo/tlv-living-room.svg",
      images: [
        "/demo/tlv-living-room.svg",
        "/demo/tlv-kitchen.svg",
        "/demo/tlv-balcony.svg",
      ],
      // Noa already liked it: liking it as "You" creates a match.
      reactions: { [DEMO_PARTNER_NAME]: "liked" },
      metadata: { floor: 3, elevator: true, balcony: true, parking: false },
      notes: [
        {
          userId: DEMO_PARTNER_ID,
          userName: DEMO_PARTNER_NAME,
          text: "Love the balcony! Can we see it this week?",
          createdAt: isoAgo(3 * HOUR_MS),
        },
      ],
      // Not viewed by the demo user, so the card shows the NEW badge.
      viewed_by: [DEMO_PARTNER_ID],
      checklist_data: buildChecklist(["q1", "q3", "p1", "p2", "p3"]),
      latitude: 32.0791,
      longitude: 34.7726,
      status: "all",
      created_at: isoAgo(5 * HOUR_MS),
    },
    {
      id: "demo-apt-2",
      household_id: DEMO_HOUSEHOLD_ID,
      category: "apartment",
      url: "https://www.yad2.co.il/item/demo-ramat-gan",
      title: "Jabotinsky 45, Ramat Gan",
      price: 8900,
      rooms: "4",
      phone: "052-987-6543",
      seller_name: "Roni Properties",
      image_url: "/demo/rg-living-room.svg",
      images: ["/demo/rg-living-room.svg", "/demo/rg-bedroom.svg"],
      reactions: { [DEMO_USER_NAME]: "liked", [DEMO_PARTNER_NAME]: "review" },
      metadata: { floor: 7, elevator: true, balcony: false, parking: true },
      notes: [
        {
          userId: DEMO_USER_ID,
          userName: DEMO_USER_NAME,
          text: "Bigger, but it is a bit over budget.",
          createdAt: isoAgo(1 * DAY_MS),
        },
        {
          userId: DEMO_PARTNER_ID,
          userName: DEMO_PARTNER_NAME,
          text: "Parking is a big plus. Let's ask about the price.",
          createdAt: isoAgo(20 * HOUR_MS),
        },
      ],
      viewed_by: [DEMO_USER_ID, DEMO_PARTNER_ID],
      checklist_data: buildChecklist(["q1", "q2", "q4", "q5", "p1", "p4", "p6", "f1", "f2"]),
      latitude: 32.0809,
      longitude: 34.8089,
      status: "all",
      created_at: isoAgo(2 * DAY_MS),
    },
  ];
}

/** Read-only activity feed entries shown in the demo. */
export function createDemoActivity(): ActivityLogEntry[] {
  return [
    {
      id: "demo-act-1",
      household_id: DEMO_HOUSEHOLD_ID,
      user_id: DEMO_PARTNER_ID,
      user_name: DEMO_PARTNER_NAME,
      event_type: "reaction_set",
      item_id: "demo-apt-1",
      item_title: "Ben Yehuda 112, Tel Aviv",
      metadata: { reaction: "liked" },
      created_at: isoAgo(2 * HOUR_MS),
    },
    {
      id: "demo-act-2",
      household_id: DEMO_HOUSEHOLD_ID,
      user_id: DEMO_PARTNER_ID,
      user_name: DEMO_PARTNER_NAME,
      event_type: "item_added",
      item_id: "demo-apt-1",
      item_title: "Ben Yehuda 112, Tel Aviv",
      metadata: {},
      created_at: isoAgo(5 * HOUR_MS),
    },
    {
      id: "demo-act-3",
      household_id: DEMO_HOUSEHOLD_ID,
      user_id: DEMO_USER_ID,
      user_name: DEMO_USER_NAME,
      event_type: "item_added",
      item_id: "demo-apt-2",
      item_title: "Jabotinsky 45, Ramat Gan",
      metadata: {},
      created_at: isoAgo(2 * DAY_MS),
    },
  ];
}
