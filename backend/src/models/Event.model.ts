import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';

export interface IEvent extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  longDescription: string;
  image: string;
  date: Date;
  time: string;
  location: string;
  area: string;
  vendors: Types.ObjectId[];
  featured: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 300 },
    longDescription: { type: String, default: '', maxlength: 2000 },
    image: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    area: { type: String, required: true },
    vendors: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }],
    featured: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

eventSchema.index({ date: 1 });
eventSchema.index({ featured: 1 });

eventSchema.plugin(toJSONPlugin);

export const Event = model<IEvent>('Event', eventSchema);
