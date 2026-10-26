import type { Schema } from 'mongoose';

/**
 * Applied to every schema in this app. Makes API responses match the
 * shape the frontend already expects (it was built against a local
 * dataset using `id`, not Mongo's `_id`) without every controller having
 * to remap fields by hand.
 *
 * - `_id` (ObjectId) -> `id` (string)
 * - `__v` removed
 * - any field explicitly marked `select: false` in the schema (e.g.
 *   passwordHash) is stripped as a second line of defense, in case a
 *   query ever forgets to exclude it
 */
export function toJSONPlugin(schema: Schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  });
}
