/**
 * onboarding.api.ts — typed API client for the tenant onboarding flow.
 *
 * All calls go to identity-service (port 3001 in dev, /api/v1/* in prod).
 * All endpoints are @Public() — no auth headers required.
 *
 * State management:
 *   - `registrationId` is stored in localStorage on signup success
 *   - Each step reads it from localStorage to continue where the user left off
 *   - State is cleared on successful completion
 */

const BASE = process.env['NEXT_PUBLIC_IDENTITY_URL'] ?? 'http://localhost:3001';
const API  = `${BASE}/api/v1/onboarding`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SignupInput {
  fullName: string;
  orgName:  string;
  slug:     string;
  email:    string;
}

export interface SignupResult {
  registrationId: string;
  maskedEmail:    string;
}

export interface OnboardingStatus {
  step:          number;
  emailVerified: boolean;
  hasPackage:    boolean;
}

export interface ActivePackage {
  id:                     string;
  slug:                   string;
  name:                   string;
  description:            string | null;
  tierKey:                string;
  priceMonthlyMinorUnits: number;
  priceAnnualMinorUnits:  number;
  currency:               string;
  trialDays:              number;
  features:               Record<string, boolean>;
  limits:                 Record<string, number>;
  highlightFeatures:      string[] | null;
  badgeText:              string | null;
  isHighlighted:          boolean;
}

export interface CompleteOnboardingInput {
  registrationId: string;
  password:       string;
  confirmPassword: string;
  timezone?:      string;
  currency?:      string;
}

export interface CompleteOnboardingResult {
  tenantId:     string;
  accessToken:  string;
  refreshToken: string;
  redirectTo:   string;
}

// ── API functions ─────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await res.json() as T | { message: string; statusCode?: number };

  if (!res.ok) {
    const errData = data as { message: string };
    throw new Error(errData.message ?? `Request failed: ${res.status}`);
  }

  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json() as { message: string };
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Step 1 ────────────────────────────────────────────────────────────────────

export async function submitSignup(input: SignupInput): Promise<SignupResult> {
  const result = await post<SignupResult>('/signup', input);
  // Persist registrationId for step recovery
  if (typeof window !== 'undefined') {
    localStorage.setItem('onboarding:registrationId', result.registrationId);
    localStorage.setItem('onboarding:email', input.email);
    localStorage.setItem('onboarding:slug', input.slug);
  }
  return result;
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

export async function submitEmailVerification(
  registrationId: string,
  token: string,
): Promise<{ verified: boolean }> {
  return post('/verify-email', { registrationId, token });
}

export async function resendVerificationEmail(
  registrationId: string,
): Promise<{ sent: boolean }> {
  return post('/resend-verification', { registrationId });
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

export async function fetchActivePackages(): Promise<ActivePackage[]> {
  const saasBase = process.env['NEXT_PUBLIC_SAAS_URL'] ?? 'http://localhost:3002';
  const res = await fetch(`${saasBase}/api/v1/packages/active`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load packages');
  return res.json() as Promise<ActivePackage[]>;
}

export async function submitPackageSelection(
  registrationId: string,
  packageId: string,
  billingCycle: 'monthly' | 'annual' = 'monthly',
): Promise<{ recorded: boolean }> {
  return post('/select-package', { registrationId, packageId, billingCycle });
}

// ── Step 4 ────────────────────────────────────────────────────────────────────

export async function submitComplete(
  input: CompleteOnboardingInput,
): Promise<CompleteOnboardingResult> {
  const result = await post<CompleteOnboardingResult>('/complete', input);
  // Clear onboarding state on success
  if (typeof window !== 'undefined') {
    localStorage.removeItem('onboarding:registrationId');
    localStorage.removeItem('onboarding:email');
    localStorage.removeItem('onboarding:slug');
  }
  return result;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export async function checkSlugAvailability(
  slug: string,
): Promise<{ available: boolean }> {
  return get(`/check-slug?slug=${encodeURIComponent(slug)}`);
}

export async function getOnboardingStatus(
  registrationId: string,
): Promise<OnboardingStatus> {
  return get(`/status/${registrationId}`);
}

// ── Local state helpers ───────────────────────────────────────────────────────

export function getStoredRegistrationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('onboarding:registrationId');
}

export function getStoredEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('onboarding:email');
}

export function formatPrice(minorUnits: number, currency = 'GBP'): string {
  if (minorUnits === 0) return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style:    'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}
