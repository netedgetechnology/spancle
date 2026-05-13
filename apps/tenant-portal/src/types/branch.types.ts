/**
 * branch.types.ts — Frontend type definitions for the branch management module.
 * Mirrors the backend BranchEntity and DTOs exactly.
 */

// ── Status ────────────────────────────────────────────────────────────────────

export type BranchStatus = 'active' | 'inactive' | 'suspended' | 'archived';

export const STATUS_CONFIG: Record<BranchStatus, {
  label:    string;
  bg:       string;
  text:     string;
  dot:      string;
  ringBg:   string;
}> = {
  active:    { label: 'Active',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', ringBg: 'ring-emerald-200' },
  inactive:  { label: 'Inactive',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   ringBg: 'ring-amber-200'   },
  suspended: { label: 'Suspended', bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     ringBg: 'ring-red-200'     },
  archived:  { label: 'Archived',  bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400',    ringBg: 'ring-gray-200'    },
};

// ── Timings ───────────────────────────────────────────────────────────────────

export interface DayTiming {
  isClosed:  boolean;
  openTime:  string;  // HH:MM
  closeTime: string;  // HH:MM
}

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type WeeklyTimings = Record<DayKey, DayTiming>;

export const DAY_KEYS: DayKey[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export const DEFAULT_TIMINGS: WeeklyTimings = {
  monday:    { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  tuesday:   { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  wednesday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  thursday:  { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  friday:    { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  saturday:  { isClosed: true,  openTime: '09:00', closeTime: '17:00' },
  sunday:    { isClosed: true,  openTime: '09:00', closeTime: '17:00' },
};

// ── Branch ────────────────────────────────────────────────────────────────────

export interface Branch {
  id:            string;
  tenantId:      string;
  name:          string;
  slug:          string;
  description:   string | null;
  addressLine1:  string;
  addressLine2:  string | null;
  city:          string;
  county:        string | null;
  postcode:      string;
  countryCode:   string;
  latitude:      number | null;
  longitude:     number | null;
  geoLabel:      string | null;
  phone:         string | null;
  email:         string | null;
  website:       string | null;
  managerUserId: string | null;
  status:        BranchStatus;
  timings:       WeeklyTimings;
  mapUrl:        string | null;
  facilities:    string[] | null;
  imageUrl:      string | null;
  sortOrder:     number;
  isDeleted:     boolean;
  createdAt:     string;
  updatedAt:     string;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export interface BranchFormValues {
  name:          string;
  slug:          string;
  description:   string;
  addressLine1:  string;
  addressLine2:  string;
  city:          string;
  county:        string;
  postcode:      string;
  countryCode:   string;
  latitude:      string;
  longitude:     string;
  geoLabel:      string;
  phone:         string;
  email:         string;
  website:       string;
  managerUserId: string;
  status:        BranchStatus;
  timings:       WeeklyTimings;
  mapUrl:        string;
  facilities:    string;
  imageUrl:      string;
  sortOrder:     number;
}

export const EMPTY_FORM: BranchFormValues = {
  name: '', slug: '', description: '', addressLine1: '', addressLine2: '',
  city: '', county: '', postcode: '', countryCode: 'GB',
  latitude: '', longitude: '', geoLabel: '',
  phone: '', email: '', website: '',
  managerUserId: '', status: 'active',
  timings: DEFAULT_TIMINGS,
  mapUrl: '', facilities: '', imageUrl: '', sortOrder: 0,
};

export function branchToFormValues(branch: Branch): BranchFormValues {
  return {
    name:          branch.name,
    slug:          branch.slug,
    description:   branch.description   ?? '',
    addressLine1:  branch.addressLine1,
    addressLine2:  branch.addressLine2  ?? '',
    city:          branch.city,
    county:        branch.county        ?? '',
    postcode:      branch.postcode,
    countryCode:   branch.countryCode,
    latitude:      branch.latitude      != null ? String(branch.latitude)  : '',
    longitude:     branch.longitude     != null ? String(branch.longitude) : '',
    geoLabel:      branch.geoLabel      ?? '',
    phone:         branch.phone         ?? '',
    email:         branch.email         ?? '',
    website:       branch.website       ?? '',
    managerUserId: branch.managerUserId ?? '',
    status:        branch.status,
    timings:       branch.timings,
    mapUrl:        branch.mapUrl        ?? '',
    facilities:    branch.facilities?.join(', ') ?? '',
    imageUrl:      branch.imageUrl      ?? '',
    sortOrder:     branch.sortOrder,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatAddress(branch: Branch): string {
  return [
    branch.addressLine1,
    branch.addressLine2,
    branch.city,
    branch.county,
    branch.postcode,
  ].filter(Boolean).join(', ');
}

export function openDaysCount(timings: WeeklyTimings): number {
  return DAY_KEYS.filter((d) => !timings[d].isClosed).length;
}
