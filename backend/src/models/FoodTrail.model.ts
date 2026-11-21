import { defineModel, type BaseDoc } from '../db/model';
import { isUuid } from '../db/errors';
import { TRAIL_DIFFICULTIES, type TrailDifficulty } from '../types/enums';

export interface ITrailStop {
  order: number;
  vendor: any;
  note: string;
}

export interface IFoodTrail extends BaseDoc {
  name: string;
  description: string;
  image: string;
  stops: ITrailStop[];
  duration: string;
  distance: string;
  difficulty: TrailDifficulty;
  rating: number;
  reviewCount: number;
  createdBy?: any;
}

function validateStops(stops: any[]): string | null {
  if (!Array.isArray(stops) || stops.length === 0) return 'A food trail needs at least one stop';
  for (const s of stops) {
    if (!s || typeof s.order !== 'number' || s.order < 1) return 'Each stop needs an order of at least 1';
    const v = s.vendor && typeof s.vendor === 'object' && 'id' in s.vendor ? s.vendor.id : s.vendor;
    if (!isUuid(String(v))) return 'Each stop needs a valid vendor id';
    if (s.note !== undefined && typeof s.note === 'string' && s.note.length > 300) return 'Stop note is too long';
  }
  return null;
}

// Stops are stored as JSON; `stops.vendor` can be loaded with .populate('stops.vendor').
export const FoodTrail = defineModel<IFoodTrail>({
  name: 'FoodTrail',
  table: 'food_trails',
  fields: {
    name: { type: 'string', required: true, trim: true, maxlength: 150 },
    description: { type: 'string', required: true, maxlength: 300 },
    image: { type: 'string', required: true },
    stops: { type: 'json', required: true, ref: 'Vendor', validate: validateStops },
    duration: { type: 'string', required: true },
    distance: { type: 'string', required: true },
    difficulty: { type: 'string', enum: TRAIL_DIFFICULTIES, required: true },
    rating: { type: 'number', default: 0, min: 0, max: 5 },
    reviewCount: { type: 'number', default: 0, min: 0 },
    createdBy: { type: 'id', column: 'created_by', ref: 'User' },
  },
});
