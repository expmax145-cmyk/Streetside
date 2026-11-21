import { defineModel, type BaseDoc } from '../db/model';
import { REPORT_TYPES, REPORT_STATUSES, type ReportType, type ReportStatus } from '../types/enums';

export interface IReport extends BaseDoc {
  type: ReportType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  reporter: any;
}

export const Report = defineModel<IReport>({
  name: 'Report',
  table: 'reports',
  fields: {
    type: { type: 'string', enum: REPORT_TYPES, required: true },
    targetId: { type: 'id', required: true },
    reason: { type: 'string', required: true, maxlength: 500 },
    status: { type: 'string', enum: REPORT_STATUSES, default: 'pending' },
    reporter: { type: 'id', column: 'reporter_id', ref: 'User', required: true },
  },
});
