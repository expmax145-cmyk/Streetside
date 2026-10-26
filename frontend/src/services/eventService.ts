import api from './api';
import type { EventItem } from '@/types';

type EventPayload = Record<string, unknown>;

function normalizeEvent(value: Record<string, unknown>): EventItem {
  const vendors = Array.isArray(value.vendors) ? value.vendors : [];
  const rawDate = value.date ? String(value.date) : '';
  return {
    id: String(value.id ?? value._id),
    name: String(value.name ?? ''),
    description: String(value.description ?? ''),
    longDescription: String(value.longDescription ?? ''),
    image: String(value.image ?? ''),
    date: rawDate ? new Date(rawDate).toLocaleDateString() : '',
    rawDate: rawDate ? new Date(rawDate).toISOString() : '',
    time: String(value.time ?? ''),
    location: String(value.location ?? ''),
    area: String(value.area ?? ''),
    vendorIds: vendors.map((vendor) => typeof vendor === 'object' && vendor !== null ? String((vendor as Record<string, unknown>).id ?? (vendor as Record<string, unknown>)._id) : String(vendor)),
    featured: Boolean(value.featured),
  };
}

export async function listEvents(){
  const res = await api.get('/events');
  return Array.isArray(res.data) ? res.data.map((event: unknown) => normalizeEvent(event as Record<string, unknown>)) : [];
}

export async function getEvent(id: string){
  const res = await api.get(`/events/${id}`);
  return normalizeEvent(res.data as Record<string, unknown>);
}

export async function createEvent(payload: EventPayload){
  const res = await api.post('/events', payload);
  return res.data;
}

export async function updateEvent(id: string, payload: EventPayload){
  const res = await api.put(`/events/${id}`, payload);
  return res.data;
}

export async function deleteEvent(id: string){
  const res = await api.del(`/events/${id}`);
  return res.data;
}

export default { listEvents, getEvent, createEvent, updateEvent, deleteEvent };
