/**
 * Rider application types, mirroring the server's rider module.
 *
 * The wizard never invents a status, a vehicle or a slot: every union here
 * matches the enum the API validates against, so a typo is a TypeScript error
 * instead of a value the review desk cannot explain.
 */

export type RiderApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled";

/** The account-level mirror the user row carries alongside `roles`. */
export type RiderAccountState =
  | "none"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type RiderVehicleType = "bicycle" | "motorcycle" | "scooter" | "car" | "walk";

export type RiderWeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type RiderTimeSlot = "morning" | "afternoon" | "evening" | "night";

export interface RiderApplicationEvent {
  status: RiderApplicationStatus;
  at: string;
  note?: string;
}

export interface RiderPersonalInfo {
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string | null;
  nationalId?: string;
  photoUrl?: string;
}

export interface RiderContactInfo {
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredContact?: "phone" | "email" | "whatsapp";
}

export interface RiderServiceAddress {
  country?: string;
  division?: string;
  city?: string;
  area?: string;
  address?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RiderVehicle {
  type: RiderVehicleType;
  number?: string;
  licenseNumber?: string;
  licenseExpiry?: string | null;
  hasOwnVehicle?: boolean;
}

export interface RiderDocuments {
  drivingLicenseUrl?: string;
  nationalIdUrl?: string;
  vehicleDocsUrl?: string;
  otherUrl?: string;
  notes?: string;
}

export interface RiderAvailability {
  days: RiderWeekDay[];
  slots: RiderTimeSlot[];
  maxDistanceKm: number;
  note?: string;
}

export interface RiderExperience {
  years: number;
  previousPlatforms?: string;
  note?: string;
}

export interface RiderApplication {
  _id: string;
  reference: string;
  status: RiderApplicationStatus;
  personalInfo: RiderPersonalInfo;
  contactInfo?: RiderContactInfo;
  serviceAddress: RiderServiceAddress;
  vehicle: RiderVehicle;
  documents?: RiderDocuments;
  availability?: RiderAvailability;
  experience?: RiderExperience;
  rejectionReason?: string;
  reviewNotes?: string;
  reviewedAt?: string | null;
  submittedAt: string;
  resubmissionCount?: number;
  history?: RiderApplicationEvent[];
  createdAt: string;
  updatedAt: string;
}

/** The wizard's payload shape before it reaches the wire. */
export interface RiderApplicationDraft {
  personalInfo: RiderPersonalInfo;
  contactInfo: RiderContactInfo;
  serviceAddress: RiderServiceAddress;
  vehicle: RiderVehicle;
  documents: RiderDocuments;
  availability: RiderAvailability;
  experience: RiderExperience;
  confirm: boolean;
}

/**
 * What the rider's own profile page sends.
 *
 * A submission has to be a complete draft; a profile save is only the sections
 * the rider actually touched, and inside them only the fields the form holds.
 * The API merges that onto the file, so a section left out of the body keeps
 * whatever it already said.
 */
export interface RiderApplicationProfileUpdate {
  personalInfo?: Partial<RiderPersonalInfo>;
  contactInfo?: Partial<RiderContactInfo>;
  serviceAddress?: Partial<RiderServiceAddress>;
  vehicle?: Partial<RiderVehicle>;
  documents?: Partial<RiderDocuments>;
  availability?: Partial<RiderAvailability>;
  experience?: Partial<RiderExperience>;
}

/** Query for the admin review desk. */
export type RiderApplicationQuery = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export interface RiderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** One page of the review queue: the rows plus the counts for the chips. */
export interface RiderApplicationListResult {
  applications: RiderApplication[];
  total: number;
  typeCounts: Record<string, number>;
  pagination: RiderPagination;
}

/** The account that applied, as the review screen names it. */
export interface RiderApplicantSummary {
  _id: string;
  name: string;
  email: string;
  image?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  status?: string;
  riderStatus?: string;
  createdAt?: string;
}

/** The review screen's single read: the file plus who owns it. */
export interface RiderApplicationDetail {
  application: RiderApplication;
  applicant: RiderApplicantSummary | null;
}

export const RIDER_VEHICLE_OPTIONS: { value: RiderVehicleType; label: string }[] = [
  { value: "bicycle", label: "Bicycle" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "scooter", label: "Scooter" },
  { value: "car", label: "Car" },
  { value: "walk", label: "On foot" },
];

export const RIDER_WEEKDAY_OPTIONS: { value: RiderWeekDay; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export const RIDER_TIMESLOT_OPTIONS: { value: RiderTimeSlot; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];
