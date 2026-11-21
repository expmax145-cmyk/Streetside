import { defineModel, type BaseDoc } from '../db/model';

export interface IOffer extends BaseDoc {
  vendor: any;
  title: string;
  description: string;
  discount: string;
  code: string;
  expiry: Date;
  conditions: string;
  color: string;
  isActive: boolean;
}

// An *active* offer code is unique per vendor (partial unique index
// vendor_code_active_unique); deactivating an offer frees its code.
export const Offer = defineModel<IOffer>({
  name: 'Offer',
  table: 'offers',
  fields: {
    vendor: { type: 'id', column: 'vendor_id', ref: 'Vendor', required: true },
    title: { type: 'string', required: true, trim: true, maxlength: 150 },
    description: { type: 'string', required: true, maxlength: 300 },
    discount: { type: 'string', required: true, trim: true, maxlength: 50 },
    code: { type: 'string', required: true, trim: true, uppercase: true, maxlength: 30 },
    expiry: { type: 'date', required: true },
    conditions: { type: 'string', default: 'No conditions', maxlength: 300 },
    color: { type: 'string', default: 'from-brand-500 to-brand-700' },
    isActive: { type: 'boolean', default: true },
  },
});
