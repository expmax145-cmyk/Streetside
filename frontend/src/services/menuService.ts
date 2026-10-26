import api from './api';
import type { MenuItem } from '@/types';

function normalizeMenuItem(value: Record<string, unknown>): MenuItem {
  return {
    id: String(value.id ?? value._id ?? ''),
    name: String(value.name ?? ''),
    description: String(value.description ?? ''),
    price: Number(value.price ?? 0),
    veg: (value.veg as MenuItem['veg']) ?? 'veg',
    image: String(value.image ?? ''),
    popular: Boolean(value.popular),
    category: value.category as MenuItem['category'],
    available: typeof value.available === 'boolean' ? value.available : true,
  };
}

export async function listMenu(vendorId: string): Promise<MenuItem[]> {
  const res = await api.get(`/vendors/${vendorId}/menu`);
  return Array.isArray(res.data) ? res.data.map((m: unknown) => normalizeMenuItem(m as Record<string, unknown>)) : [];
}

export async function addMenuItem(vendorId: string, payload: unknown): Promise<MenuItem> {
  const res = await api.post(`/vendors/${vendorId}/menu`, payload);
  return normalizeMenuItem(res.data as Record<string, unknown>);
}

export async function updateMenuItem(id: string, payload: unknown): Promise<MenuItem> {
  const res = await api.put(`/menu/${id}`, payload);
  return normalizeMenuItem(res.data as Record<string, unknown>);
}

export async function deleteMenuItem(id: string) {
  const res = await api.del(`/menu/${id}`);
  return res.data;
}

export default { listMenu, addMenuItem, updateMenuItem, deleteMenuItem };
