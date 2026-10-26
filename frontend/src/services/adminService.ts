import api from './api';
import type { AdminUser, Report } from '@/types';
import { normalizeVendorForAdmin, type AdminVendor } from './vendorService';

function normalizeAdminUser(value: Record<string, unknown>): AdminUser {
  const vendor = value.vendor;
  const createdAt = value.createdAt ? new Date(String(value.createdAt)) : null;
  return {
    id: String(value.id ?? value._id ?? ''),
    name: String(value.name ?? ''),
    email: String(value.email ?? ''),
    role: (value.role as AdminUser['role']) ?? 'customer',
    status: (value.status as AdminUser['status']) ?? 'active',
    joinedDate: createdAt ? createdAt.toLocaleDateString() : '',
    vendorId: vendor ? String(vendor) : undefined,
  };
}

function normalizeReport(value: Record<string, unknown>): Report {
  const reporter = value.reporter;
  const reporterName = typeof reporter === 'object' && reporter !== null
    ? String((reporter as Record<string, unknown>).name ?? '')
    : String(reporter ?? '');
  const createdAt = value.createdAt ? new Date(String(value.createdAt)) : null;
  return {
    id: String(value.id ?? value._id ?? ''),
    type: (value.type as Report['type']) ?? 'user',
    targetId: String(value.targetId ?? ''),
    reason: String(value.reason ?? ''),
    status: (value.status as Report['status']) ?? 'pending',
    date: createdAt ? createdAt.toLocaleDateString() : '',
    reporter: reporterName,
  };
}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await api.get('/admin/users');
  return Array.isArray(res.data) ? res.data.map((u: unknown) => normalizeAdminUser(u as Record<string, unknown>)) : [];
}

// /admin/vendors returns ALL vendors (active + inactive) now that
// the backend route exists and is not capped at 50 — this replaces the
// admin dashboard's old reliance on the public, active-only vendor list.
export async function listVendors(): Promise<AdminVendor[]> {
  const res = await api.get('/admin/vendors');
  return Array.isArray(res.data) ? res.data.map((v: unknown) => normalizeVendorForAdmin(v as Record<string, unknown>)) : [];
}

export async function patchVendorStatus(vendorId: string, isActive: boolean) {
  const res = await api.patch(`/admin/vendors/${vendorId}/status`, { isActive });
  return normalizeVendorForAdmin(res.data as Record<string, unknown>);
}

// vendor approval gate
export async function approveVendor(vendorId: string) {
  const res = await api.patch(`/admin/vendors/${vendorId}/approve`, {});
  return normalizeVendorForAdmin(res.data as Record<string, unknown>);
}

export async function rejectVendor(vendorId: string, reason: string) {
  const res = await api.patch(`/admin/vendors/${vendorId}/reject`, { reason });
  return normalizeVendorForAdmin(res.data as Record<string, unknown>);
}

// hygiene verification. Reuses the regular vendor update endpoint
// -- hygieneRating/hygieneVerified are in the backend's admin-only field
// allowlist (see backend/src/services/vendor.service.ts
// sanitizeVendorUpdate), so an admin can set them through the same
// PUT /vendors/:id route a vendor owner uses for everything else; no
// separate endpoint was needed.
export async function setVendorHygiene(
  vendorId: string,
  updates: { hygieneVerified: boolean; hygieneRating?: number },
) {
  const res = await api.put(`/vendors/${vendorId}`, updates);
  return normalizeVendorForAdmin(res.data as Record<string, unknown>);
}

export async function patchUserStatus(userId: string, status: 'active' | 'suspended') {
  const res = await api.patch(`/admin/users/${userId}/status`, { status });
  return normalizeAdminUser(res.data as Record<string, unknown>);
}

export async function listReports(): Promise<Report[]> {
  const res = await api.get('/admin/reports');
  return Array.isArray(res.data) ? res.data.map((r: unknown) => normalizeReport(r as Record<string, unknown>)) : [];
}

export async function patchReport(reportId: string, status: 'resolved' | 'dismissed'): Promise<Report> {
  const res = await api.patch(`/admin/reports/${reportId}`, { status });
  return normalizeReport(res.data as Record<string, unknown>);
}

export default {
  listUsers, listVendors, patchUserStatus, patchVendorStatus,
  approveVendor, rejectVendor, setVendorHygiene,
  listReports, patchReport,
};
