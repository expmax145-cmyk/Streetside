import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';
import { TRAIL_DIFFICULTIES, type TrailDifficulty } from '../types/enums';

export interface ITrailStop {
  order: number;
  vendor: Types.ObjectId;
  note: string;
}

export interface IFoodTrail extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  image: string;
  stops: ITrailStop[];
  duration: string;
  distance: string;
  difficulty: TrailDifficulty;
  rating: number;
  reviewCount: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const trailStopSchema = new Schema<ITrailStop>(
  {
    order: { type: Number, required: true, min: 1 },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    note: { type: String, default: '', maxlength: 300 },
  },
  { _id: false },
);

const foodTrailSchema = new Schema<IFoodTrail>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 300 },
    image: { type: String, required: true },
    stops: {
      type: [trailStopSchema],
      validate: {
        validator: (v: ITrailStop[]) => v.length > 0,
        message: 'A food trail needs at least one stop',
      },
    },
    duration: { type: String, required: true },
    distance: { type: String, required: true },
    difficulty: { type: String, enum: TRAIL_DIFFICULTIES, required: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

foodTrailSchema.plugin(toJSONPlugin);

export const FoodTrail = model<IFoodTrail>('FoodTrail', foodTrailSchema);
