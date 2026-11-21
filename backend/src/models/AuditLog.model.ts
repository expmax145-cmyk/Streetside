import { defineModel, type BaseDoc } from '../db/model';

export interface IAuditLog extends BaseDoc {
  actor: any;
  action: string;
  target: string;
  meta?: Record<string, unknown>;
}

export const AuditLog = defineModel<IAuditLog>({
  name: 'AuditLog',
  table: 'audit_logs',
  timestamps: { createdAt: true, updatedAt: false },
  fields: {
    actor: { type: 'id', column: 'actor_id', ref: 'User', required: true },
    action: { type: 'string', required: true },
    target: { type: 'string', required: true },
    meta: { type: 'json' },
  },
});
