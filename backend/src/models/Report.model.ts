import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';
import { REPORT_TYPES, REPORT_STATUSES, type ReportType, type ReportStatus } from '../types/enums';

export interface IReport extends Document {
  _id: Types.ObjectId;
  type: ReportType;
  targetId: Types.ObjectId;
  reason: string;
  status: ReportStatus;
  reporter: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    type: { type: String, enum: REPORT_TYPES, required: true },
    // Polymorphic reference (a review, vendor, or user id depending on
    // `type`) — intentionally not a typed `ref` since it can point at
    // three different collections; the admin controller resolves it
    // based on `type` when it needs the full target document.
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: REPORT_STATUSES, default: 'pending' },
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

reportSchema.index({ status: 1 });
reportSchema.index({ type: 1, targetId: 1 });

reportSchema.plugin(toJSONPlugin);

export const Report = model<IReport>('Report', reportSchema);
