import { defineModel, type BaseDoc } from '../db/model';

export interface IEvent extends BaseDoc {
  name: string;
  description: string;
  longDescription: string;
  image: string;
  date: Date;
  time: string;
  location: string;
  area: string;
  vendors: any[];
  featured: boolean;
  createdBy?: any;
}

export const Event = defineModel<IEvent>({
  name: 'Event',
  table: 'events',
  fields: {
    name: { type: 'string', required: true, trim: true, maxlength: 150 },
    description: { type: 'string', required: true, maxlength: 300 },
    longDescription: { type: 'string', default: '', maxlength: 2000 },
    image: { type: 'string', required: true },
    date: { type: 'date', required: true },
    time: { type: 'string', required: true },
    location: { type: 'string', required: true },
    area: { type: 'string', required: true },
    vendors: { type: 'ids', ref: 'Vendor' },
    featured: { type: 'boolean', default: false },
    createdBy: { type: 'id', column: 'created_by', ref: 'User' },
  },
});
