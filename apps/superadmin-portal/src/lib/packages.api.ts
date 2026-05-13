import { apiClient } from '@/lib/api/client';
import type { Package, PackageFormValues } from '@/types/packages.types';

const BASE = '/api/v1/packages';

export const packageKeys = {
  all:    () => ['packages'] as const,
  list:   (archived?: boolean) => [...packageKeys.all(), 'list', { archived }] as const,
  active: () => [...packageKeys.all(), 'active'] as const,
  detail: (id: string) => [...packageKeys.all(), id] as const,
} as const;

export async function fetchPackages(includeArchived = false): Promise<Package[]> {
  const res = await apiClient.get<Package[]>(BASE, { params: { includeArchived: String(includeArchived) } });
  return res.data;
}
export async function fetchActivePackages(): Promise<Package[]> {
  const res = await apiClient.get<Package[]>(`${BASE}/active`);
  return res.data;
}
export async function fetchPackage(id: string): Promise<Package> {
  const res = await apiClient.get<Package>(`${BASE}/${id}`);
  return res.data;
}
export async function createPackage(input: Partial<PackageFormValues>): Promise<Package> {
  const res = await apiClient.post<Package>(BASE, input);
  return res.data;
}
export async function updatePackage(id: string, input: Partial<PackageFormValues>): Promise<Package> {
  const res = await apiClient.patch<Package>(`${BASE}/${id}`, input);
  return res.data;
}
export async function deletePackage(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
export async function publishPackage(id: string): Promise<Package> {
  const res = await apiClient.post<Package>(`${BASE}/${id}/publish`, {});
  return res.data;
}
export async function deprecatePackage(id: string): Promise<Package> {
  const res = await apiClient.post<Package>(`${BASE}/${id}/deprecate`, {});
  return res.data;
}
export async function archivePackage(id: string): Promise<Package> {
  const res = await apiClient.post<Package>(`${BASE}/${id}/archive`, {});
  return res.data;
}
export async function clonePackage(id: string, slug: string): Promise<Package> {
  const res = await apiClient.post<Package>(`${BASE}/${id}/clone`, { slug });
  return res.data;
}
export async function seedPackages(): Promise<{ created: number; skipped: number }> {
  const res = await apiClient.post<{ created: number; skipped: number }>(`${BASE}/seed`, {});
  return res.data;
}
