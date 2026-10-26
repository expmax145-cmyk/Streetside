import { Event } from '../models/Event.model';
import { ApiError } from '../utils/ApiError';

export async function listEvents() {
  return Event.find().sort({ date: 1 });
}

export async function getEventById(id: string) {
  const ev = await Event.findById(id).populate('vendors');
  if (!ev) throw ApiError.notFound('Event not found');
  return ev;
}

export async function createEvent(input: any, creatorId?: string) {
  return Event.create({ ...input, createdBy: creatorId });
}

export async function updateEvent(id: string, updates: Partial<any>) {
  const ev = await Event.findById(id);
  if (!ev) throw ApiError.notFound('Event not found');
  Object.assign(ev, updates);
  await ev.save();
  return ev;
}

export async function deleteEvent(id: string) {
  const ev = await Event.findById(id);
  if (!ev) throw ApiError.notFound('Event not found');
  await ev.deleteOne();
}
