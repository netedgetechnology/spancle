/**
 * tenant-detail.types.ts
 * Extended tenant types for the superadmin portal Sprint 2 tenant management.
 * These fields extend the base TenantEntity with all Sprint 2 requirements.
 * Fields marked [placeholder] are stored/accepted but not yet enforced by backend services.
 */

import type { TenantStatus, TenantTier } from './admin.types';

// ── Module flags ──────────────────────────────────────────────────────────────

export interface TenantModules {
  booking:       boolean;  // live — booking.spancle.com/booking
  tournament:    boolean;  // placeholder — Sprint 7
  academy:       boolean;  // placeholder
  communication: boolean;  // placeholder
  reporting:     boolean;  // placeholder
}

// ── Booking commission ────────────────────────────────────────────────────────

export type CommissionType = 'percentage' | 'fixed_per_booking';
export type SettlementCycle = 'daily' | 'weekly' | 'fortnightly' | 'monthly';

export interface BookingCommissionConfig {
  type:           CommissionType;
  value:          number;   // pct (0–100) or fixed minor units (e.g. paise)
  currency:       string;   // ISO 4217 — only relevant for fixed type
  settlementCycle: SettlementCycle;
}

// ── Payment / payout placeholders ─────────────────────────────────────────────

export interface RazorpayConfig {
  accountId?:   string;   // [placeholder] Razorpay linked account ID
  enabled:      boolean;
  notes?:       string;
}

export interface PayoutDetails {
  bankName?:       string;  // [placeholder]
  accountHolder?:  string;
  accountNumber?:  string;  // [placeholder — never display in full]
  ifscCode?:       string;
  upiId?:          string;
  preferredMethod?: 'bank' | 'upi';
}

// ── GST / Invoice flags ───────────────────────────────────────────────────────

export interface InvoiceConfig {
  gstEnabled:     boolean;
  gstin?:         string;   // 15-char GSTIN
  legalName?:     string;
  gstState?:      string;   // 2-digit state code (e.g. "29" for Karnataka)
  hsnSacCode?:    string;   // default "999335" for sports services
}

// ── Theme placeholders ────────────────────────────────────────────────────────

export interface TenantTheme {
  logoUrl?:       string;   // [placeholder]
  faviconUrl?:    string;   // [placeholder]
  brandColor?:    string;   // hex e.g. "#0ea5e9"
  customDomain?:  string;   // [placeholder] e.g. "book.acesports.in"
}

// ── Full tenant detail ────────────────────────────────────────────────────────

export interface TenantDetail {
  id:         string;
  name:       string;
  slug:       string;
  email:      string;
  phone:      string | null;
  status:     TenantStatus;
  tier:       TenantTier;
  logoUrl:    string | null;
  createdAt:  string;
  updatedAt:  string;

  // Settings (from TenantSettings JSONB)
  settings: {
    timezone:            string;
    locale:              string;
    currency:            string;
    dateFormat:          string;
    allowPublicBookings: boolean;
    requireMfa:          boolean;
  };

  // Sprint 2 additions — stored in settings JSONB or separate fields
  region?:    string;   // ISO 3166-1 alpha-2 country code e.g. "IN"
  modules?:   TenantModules;
  commission?: BookingCommissionConfig;
  razorpay?:  RazorpayConfig;
  payout?:    PayoutDetails;
  invoice?:   InvoiceConfig;
  theme?:     TenantTheme;
}

// ── Create / update forms ─────────────────────────────────────────────────────

export interface CreateTenantFormData {
  // Core
  name:      string;
  slug:      string;
  ownerName: string;
  email:     string;
  phone:     string;
  tier:      TenantTier;

  // Location / regional
  region:   string;   // country code
  timezone: string;
  currency: string;

  // Modules
  modules: TenantModules;

  // Commission
  commission: BookingCommissionConfig;

  // Invoice
  invoice: InvoiceConfig;

  // Theme
  theme: TenantTheme;

  // Placeholders (UI shows fields, no backend enforcement yet)
  razorpay: RazorpayConfig;
  payout:   PayoutDetails;
}

export type UpdateTenantFormData = Partial<CreateTenantFormData>;

// ── Display helpers ───────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<TenantStatus, string> = {
  active:     'Active',
  trial:      'Trial',
  suspended:  'Suspended',
  terminated: 'Terminated',
  pending:    'Pending',
};

export const STATUS_STYLES: Record<TenantStatus, string> = {
  active:     'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  trial:      'bg-blue-50   text-blue-700   ring-blue-600/20',
  suspended:  'bg-amber-50  text-amber-700  ring-amber-600/20',
  terminated: 'bg-red-50    text-red-700    ring-red-600/20',
  pending:    'bg-purple-50 text-purple-700 ring-purple-600/20',
};

export const TIER_LABELS: Record<TenantTier, string> = {
  free:       'Free',
  starter:    'Starter',
  growth:     'Growth',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

export const SETTLEMENT_LABELS: Record<SettlementCycle, string> = {
  daily:        'Daily',
  weekly:       'Weekly',
  fortnightly:  'Fortnightly',
  monthly:      'Monthly',
};

export const TIMEZONES = [
  { value: 'Asia/Kolkata',     label: 'India Standard Time (IST)' },
  { value: 'UTC',              label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago',  label: 'Central Time (CT)' },
  { value: 'America/Denver',   label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London',    label: 'GMT / BST' },
  { value: 'Europe/Paris',     label: 'Central European Time (CET)' },
  { value: 'Asia/Dubai',       label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore',   label: 'Singapore Time (SGT)' },
  { value: 'Asia/Tokyo',       label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
] as const;

export const CURRENCIES = [
  { value: 'INR', label: 'INR — Indian Rupee (₹)' },
  { value: 'USD', label: 'USD — US Dollar ($)' },
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { value: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
  { value: 'AUD', label: 'AUD — Australian Dollar (A$)' },
] as const;

export const COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
] as const;

export const DEFAULT_MODULES: TenantModules = {
  booking:       true,
  tournament:    false,
  academy:       false,
  communication: false,
  reporting:     true,
};

export const DEFAULT_COMMISSION: BookingCommissionConfig = {
  type:            'percentage',
  value:           5,
  currency:        'INR',
  settlementCycle: 'weekly',
};

export const DEFAULT_INVOICE: InvoiceConfig = {
  gstEnabled:  false,
  hsnSacCode:  '999335',
};

export const DEFAULT_RAZORPAY: RazorpayConfig = {
  enabled: false,
};

export const DEFAULT_PAYOUT: PayoutDetails = {
  preferredMethod: 'bank',
};

export const DEFAULT_THEME: TenantTheme = {};

export const RESERVED_SLUGS = new Set([
  'www', 'api', 'admin', 'manage', 'booking', 'book', 'app', 'tenant',
  'support', 'help', 'mail', 'smtp', 'db', 'db1', 'staging', 'test', 'dev',
  'static', 'cdn', 'assets', 'ns1', 'ns2', 'ftp', 'status',
]);
