import api from './api';
import type { Offer } from '@/types';

type OfferPayload = Record<string, unknown>;

function normalizeOffer(value: Record<string, unknown>): Offer {
  const vendor = value.vendor;
  const vendorId = typeof vendor === 'object' && vendor !== null
    ? String((vendor as Record<string, unknown>).id ?? (vendor as Record<string, unknown>)._id ?? '')
    : String(vendor ?? value.vendorId ?? '');
  const expiryDate = value.expiry ? new Date(String(value.expiry)) : null;
  return {
    id: String(value.id ?? value._id ?? ''),
    vendorId,
    title: String(value.title ?? ''),
    description: String(value.description ?? ''),
    discount: String(value.discount ?? ''),
    code: String(value.code ?? ''),
    expiry: expiryDate ? expiryDate.toLocaleDateString() : '',
    conditions: String(value.conditions ?? 'No conditions'),
    color: String(value.color ?? 'from-brand-500 to-brand-700'),
    // Same "active AND not expired" rule as the backend query (see
    // offer.service.ts) — computed here too so a dashboard fetching with
    // includeInactive=true (which returns everything, unfiltered) can
    // still show each offer's true current status.
    isActive: Boolean(value.isActive) && (!expiryDate || expiryDate.getTime() > Date.now()),
  };
}

export async function listOffers(): Promise<Offer[]> {
  const res = await api.get('/offers');
  return Array.isArray(res.data) ? res.data.map((o: unknown) => normalizeOffer(o as Record<string, unknown>)) : [];
}

export async function listVendorOffers(vendorId: string, opts: { includeInactive?: boolean } = {}): Promise<Offer[]> {
  const q = opts.includeInactive ? '?includeInactive=true' : '';
  const res = await api.get(`/vendors/${vendorId}/offers${q}`);
  return Array.isArray(res.data) ? res.data.map((o: unknown) => normalizeOffer(o as Record<string, unknown>)) : [];
}

export async function createOffer(payload: OfferPayload): Promise<Offer> {
  const res = await api.post('/offers', payload);
  return normalizeOffer(res.data as Record<string, unknown>);
}

export async function updateOffer(id: string, payload: OfferPayload): Promise<Offer> {
  const res = await api.put(`/offers/${id}`, payload);
  return normalizeOffer(res.data as Record<string, unknown>);
}

export async function deleteOffer(id: string) {
  const res = await api.del(`/offers/${id}`);
  return res.data;
}

export default { listOffers, listVendorOffers, createOffer, updateOffer, deleteOffer };
