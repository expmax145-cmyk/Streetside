import { FoodTrail } from '../models/FoodTrail.model';
import { ApiError } from '../utils/ApiError';

export function listFoodTrails() {
  return FoodTrail.find().sort({ createdAt: -1 }).populate('stops.vendor');
}

export async function getFoodTrailById(id: string) {
  const trail = await FoodTrail.findById(id).populate('stops.vendor');
  if (!trail) throw ApiError.notFound('Food trail not found');
  return trail;
}

// Admin-authored content (route-level `authorize('admin')` is the actual
// security boundary — see foodTrail.routes.ts — this service assumes the
// caller has already been checked and just records who created it,
// mirroring event.service.ts's createEvent).
export async function createFoodTrail(input: Partial<any>, creatorId?: string) {
  return FoodTrail.create({ ...input, createdBy: creatorId });
}

export async function updateFoodTrail(id: string, updates: Partial<any>) {
  const trail = await FoodTrail.findById(id);
  if (!trail) throw ApiError.notFound('Food trail not found');
  Object.assign(trail, updates);
  await trail.save();
  return trail.populate('stops.vendor');
}

export async function deleteFoodTrail(id: string) {
  const trail = await FoodTrail.findById(id);
  if (!trail) throw ApiError.notFound('Food trail not found');
  await trail.deleteOne();
}