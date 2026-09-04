export type GlobalRole = "ORGANIZER" | "STAFF";
export type EventStaffRole = "CO_ORGANIZER" | "STAFF";
export type TicketStatus = "ISSUED" | "CHECKED_IN" | "VOID";
export type CheckInResultType = "VALID" | "DUPLICATE" | "INVALID" | "MANUAL";
export type CheckInSourceType = "SCAN" | "MANUAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: GlobalRole;
  emailVerified: boolean;
}

export interface EventCategory {
  id: string;
  eventId: string;
  name: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
}

export interface EventSummary {
  id: string;
  name: string;
  dateTime: string;
  venue: string;
  description: string | null;
  capacity: number | null;
  isPrivate: boolean;
  createdAt: string;
  staffRole: "OWNER" | EventStaffRole;
}

export interface StaffRow {
  id: string;
  eventId: string;
  userId: string;
  role: EventStaffRole;
  canScan: boolean;
  canEditGuestList: boolean;
  user: { id: string; name: string; email: string };
}

export interface PendingInvite {
  id: string;
  email: string;
  role: EventStaffRole;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  expiresAt: string;
}

export interface EventDetail extends EventSummary {
  categories: EventCategory[];
  staff: StaffRow[];
  organizer: { id: string; name: string; email: string };
  _count: { guests: number; tickets: number };
}

export interface EventAccess {
  eventId: string;
  isOwner: boolean;
  isCoOrganizer: boolean;
  isStaff: boolean;
  canManage: boolean;
  canScan: boolean;
}

export interface Ticket {
  id: string;
  guestId: string;
  eventId: string;
  uniqueToken: string;
  status: TicketStatus;
  checkedInAt: string | null;
  checkedInById: string | null;
  source: CheckInSourceType | null;
  voidedAt: string | null;
  createdAt: string;
}

export interface Guest {
  id: string;
  eventId: string;
  fullName: string;
  contact: string | null;
  categoryId: string | null;
  category: EventCategory | null;
  tableSeatLabel: string | null;
  plusOnesAllowed: number;
  notes: string | null;
  isPlusOne: boolean;
  primaryGuestId: string | null;
  tickets: Ticket[];
  plusOnes: (Omit<Guest, "plusOnes"> & { plusOnes: never[] })[];
  createdAt: string;
}

export interface CheckInOutcome {
  outcome: "VALID" | "DUPLICATE" | "INVALID";
  reason?: string;
  guest?: { id: string; fullName: string; isPlusOne: boolean; tableSeatLabel: string | null; category: { id: string; name: string; color: string } | null };
  ticket?: { id: string; status: string; checkedInAt: string | null };
  previousCheckIn?: { at: string; by: string | null; source: CheckInSourceType | null } | null;
}

export interface DashboardStats {
  totals: { invited: number; checkedIn: number };
  categories: { categoryId: string | null; name: string; color: string; invited: number; checkedIn: number }[];
  voidedCount: number;
  manualCount: number;
}

export interface CheckInLogRow {
  id: string;
  ticketId: string | null;
  eventId: string;
  scannedById: string | null;
  scannedBy: { id: string; name: string } | null;
  result: CheckInResultType;
  guestNameSnapshot: string | null;
  timestamp: string;
  device: string | null;
}
