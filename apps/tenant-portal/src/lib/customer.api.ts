import { apiClient } from '@/lib/api/client';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/customers`;

export interface CustomerSearchResult {
  id:          string;
  tenantId:    string;
  firstName:   string;
  lastName:    string;
  fullName:    string;
  email:       string | null;
  phone:       string | null;
  status:      string;
  isGuest:     boolean;
  walletBalanceMinor: number;
}

export interface CustomerProfile extends CustomerSearchResult {
  bookingStats: {
    total:    number;
    active:   number;
    completed:number;
    cancelled:number;
    noShows:  number;
    totalSpendMinor: number;
    currency: string | null;
    membershipBookings:   number;
    totalDiscountMinor:   number;
    totalWalletUsedMinor: number;
  };
  membershipSummary: Array<{
    id:        string;
    planId:    string;
    status:    string;
    startsAt:  string | null;
    expiresAt: string | null;
  }>;
}

export const customerKeys = {
  all:     ()                  => ['customers']            as const,
  search:  (q: string)         => ['customers', 'search', q] as const,
  profile: (id: string)        => ['customers', id, 'profile'] as const,
};

export async function searchCustomers(q: string): Promise<{ data: CustomerSearchResult[]; total: number }> {
  const res = await apiClient.get<{ data: CustomerSearchResult[]; total: number }>(
    BASE,
    { baseURL: BOOKING_BASE, params: { q, limit: 10 } },
  );
  return res.data;
}

export async function fetchCustomerProfile(id: string): Promise<CustomerProfile> {
  const res = await apiClient.get<CustomerProfile>(
    `${BASE}/${id}/profile`,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}
