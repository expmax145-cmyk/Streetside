import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';

export interface IOffer extends Document {
  _id: Types.ObjectId;
  vendor: Types.ObjectId;
  title: string;
  description: string;
  discount: string;
  code: string;
  expiry: Date;
  conditions: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 300 },
    discount: { type: String, required: true, trim: true, maxlength: 50 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    expiry: { type: Date, required: true },
    conditions: { type: String, default: 'No conditions', maxlength: 300 },
    color: { type: String, default: 'from-brand-500 to-brand-700' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

offerSchema.index({ vendor: 1, isActive: 1 });

// Partial unique index — only enforce uniqueness for active offers.
// Deleted/inactive offers release their code so it can be reused.
// MIGRATION NOTE: `db.offers.dropIndex('vendor_1_code_1')` must be run
// before deploying if the old full-unique index still exists. See
// MIGRATION-NOTES.md for the full procedure.
offerSchema.index(
  { vendor: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'vendor_code_active_unique',
  },
);

offerSchema.plugin(toJSONPlugin);

export const Offer = model<IOffer>('Offer', offerSchema);
