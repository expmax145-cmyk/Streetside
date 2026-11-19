import api from './api';
import type { FoodTrail } from '@/types';

function normalizeTrail(value: Record<string, unknown>): FoodTrail {
  const stops = Array.isArray(value.stops) ? value.stops : [];
  return {
    id: String(value.id ?? value._id),
    name: String(value.name ?? ''),
    description: String(value.description ?? ''),
    image: String(value.image ?? ''),
    duration: String(value.duration ?? ''),
    distance: String(value.distance ?? ''),
    difficulty: value.difficulty as FoodTrail['difficulty'],
    rating: Number(value.rating ?? 0),
    reviewCount: Number(value.reviewCount ?? 0),
    stops: stops.map((stop) => {
      const item = stop as Record<string, unknown>;
      const vendor = item.vendor && typeof item.vendor === 'object' ? item.vendor as Record<string, unknown> : {};
      return { order: Number(item.order), vendorId: String(vendor.id ?? vendor._id ?? item.vendor), note: String(item.note ?? '') };
    }),
  };
}

export async function listFoodTrails() {
  const res = await api.get('/food-trails');
  return Array.isArray(res.data) ? res.data.map((trail: unknown) => normalizeTrail(trail as Record<string, unknown>)) : [];
}

export async function getFoodTrail(id: string) {
  const res = await api.get(`/food-trails/${id}`);
  return normalizeTrail(res.data as Record<string, unknown>);
}

export async function createFoodTrail(payload: Record<string, unknown>) {
  const res = await api.post('/food-trails', payload);
  return normalizeTrail(res.data as Record<string, unknown>);
}

export async function updateFoodTrail(id: string, payload: Record<string, unknown>) {
  const res = await api.put(`/food-trails/${id}`, payload);
  return normalizeTrail(res.data as Record<string, unknown>);
}

export async function deleteFoodTrail(id: string) {
  const res = await api.del(`/food-trails/${id}`);
  return res.data;
}

export default { listFoodTrails, getFoodTrail, createFoodTrail, updateFoodTrail, deleteFoodTrail };