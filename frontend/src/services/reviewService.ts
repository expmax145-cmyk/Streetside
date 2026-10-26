import api from './api';
import type { Review } from '@/types';

type ReviewPayload = { rating: number; comment?: string; text?: string } & Record<string, unknown>;

/**
 * Normalizes a raw review document from the API (which stores `comment`
 * and a populated `user: { name, avatar }`) into the frontend's `Review`
 * shape (`text`, `author`, `avatar`, a display-formatted `date`).
 */
function normalizeReview(value: Record<string, unknown>): Review {
  const user = (value.user && typeof value.user === 'object' ? value.user : {}) as Record<string, unknown>;
  const createdAt = value.createdAt ? new Date(String(value.createdAt)) : null;
  return {
    id: String(value.id ?? value._id ?? ''),
    vendorId: String(value.vendor ?? value.vendorId ?? ''),
    author: String(user.name ?? value.author ?? 'Anonymous'),
    avatar: String(user.avatar ?? value.avatar ?? ''),
    rating: Number(value.rating ?? 0),
    text: String(value.comment ?? value.text ?? ''),
    date: createdAt ? createdAt.toLocaleDateString() : String(value.date ?? ''),
  };
}

export interface ReviewListResult {
  reviews: Review[];
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
}

export async function listVendorReviews(vendorId: string, page?: number, limit?: number): Promise<ReviewListResult> {
  const q = [] as string[];
  if (page) q.push(`page=${page}`);
  if (limit) q.push(`limit=${limit}`);
  const res = await api.get(`/vendors/${vendorId}/reviews${q.length ? '?' + q.join('&') : ''}`);
  const items = Array.isArray(res.data) ? res.data : [];
  return {
    reviews: items.map((r: unknown) => normalizeReview(r as Record<string, unknown>)),
    pagination: (res.pagination as ReviewListResult['pagination']) ?? null,
  };
}

export async function listMyReviews(): Promise<Review[]> {
  const res = await api.get('/reviews/mine');
  return Array.isArray(res.data) ? res.data.map((r: unknown) => normalizeReview(r as Record<string, unknown>)) : [];
}

export async function createReview(vendorId: string, payload: ReviewPayload): Promise<Review> {
  const res = await api.post(`/vendors/${vendorId}/reviews`, { rating: payload.rating, comment: payload.comment ?? payload.text });
  return normalizeReview(res.data as Record<string, unknown>);
}

export async function updateReview(id: string, payload: ReviewPayload): Promise<Review> {
  const res = await api.put(`/reviews/${id}`, { rating: payload.rating, comment: payload.comment ?? payload.text });
  return normalizeReview(res.data as Record<string, unknown>);
}

export async function deleteReview(id: string) {
  const res = await api.del(`/reviews/${id}`);
  return res.data;
}

export default { listVendorReviews, listMyReviews, createReview, updateReview, deleteReview };
