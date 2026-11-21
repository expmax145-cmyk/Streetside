import { query } from './engine';
import { CastError, ValidationError, isUuid } from './errors';

/**
 * A small, schema-driven data-access layer for Postgres.
 *
 * Each model is described once (see src/models/*) as a list of typed fields
 * mapped to real table columns. Documents are plain objects with the same
 * nested shape the API has always returned (e.g. `vendor.location.lat`), and
 * support `save()`, `deleteOne()` and `populate()`. Queries are chainable
 * (`.sort().skip().limit().select().populate().lean()`) and always run as
 * parameterised SQL.
 */

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'id'
  | 'strings'
  | 'numbers'
  | 'ids'
  | 'json'
  | 'bytes';

export interface FieldDef {
  type: FieldType;
  /** Column name; defaults to snake_case of the path. */
  column?: string;
  required?: boolean;
  default?: unknown;
  enum?: readonly string[];
  /** For `strings` fields: every element must be one of these. */
  elementEnum?: readonly string[];
  min?: number;
  max?: number;
  minlength?: number;
  maxlength?: number;
  match?: [RegExp, string];
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  /** Never serialised, and only loaded when explicitly selected with '+name'. */
  hidden?: boolean;
  /** Name of the referenced model (for populate). */
  ref?: string;
  validate?: (value: any) => string | null;
}

export interface ModelDef {
  name: string;
  table: string;
  fields: Record<string, FieldDef>;
  timestamps?: { createdAt: boolean; updatedAt: boolean };
  /** One-to-many "virtual" relations loadable with populate(). */
  virtuals?: Record<string, { ref: string; foreignField: string }>;
  methods?: Record<string, (this: any, ...args: any[]) => any>;
  /** Paths searched by a `$text: { $search }` filter (any term, case-insensitive). */
  textSearch?: string[];
  /** Final tweak of the JSON representation (e.g. computed fields). */
  toJSONExtra?: (json: Record<string, any>, doc: any) => void;
}

export interface BaseDoc {
  id: string;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
  deleteOne(): Promise<void>;
  populate(path: string, select?: string): Promise<this>;
  toJSON(): Record<string, any>;
}

type AnyRecord = Record<string, any>;

const registry = new Map<string, Model<any>>();

/* ------------------------------------------------------------------ helpers */

const snake = (s: string) => s.replace(/\./g, '_').replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);
const q = (ident: string) => `"${ident}"`;

function getPath(obj: AnyRecord, path: string): any {
  let cur: any = obj;
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

function hasPath(obj: AnyRecord, path: string): boolean {
  const parts = path.split('.');
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cur = cur?.[parts[i]];
    if (cur === null || typeof cur !== 'object') return false;
  }
  return Object.prototype.hasOwnProperty.call(cur ?? {}, parts[parts.length - 1]);
}

function setPath(obj: AnyRecord, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: AnyRecord = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cur[parts[i]] === null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const CAST: Record<FieldType, string> = {
  string: '::text',
  number: '::float8',
  boolean: '::boolean',
  date: '::timestamptz',
  id: '::uuid',
  strings: '::text[]',
  numbers: '::float8[]',
  ids: '::uuid[]',
  json: '::jsonb',
  bytes: '::bytea',
};

const isDoc = (v: unknown): v is BaseDoc =>
  typeof v === 'object' && v !== null && typeof (v as AnyRecord).toJSON === 'function' && '__model' in (v as object);

const idOf = (v: unknown): unknown => (isDoc(v) ? v.id : v);

/** Replaces populated documents with their ids so they can be stored/compared. */
function unpopulate(v: unknown): unknown {
  if (isDoc(v)) return v.id;
  if (Array.isArray(v)) return v.map(unpopulate);
  if (v instanceof Date || Buffer.isBuffer(v) || v === null || typeof v !== 'object') return v;
  return Object.fromEntries(Object.entries(v as AnyRecord).map(([k, val]) => [k, unpopulate(val)]));
}

/** Converts a JS value into what is sent to Postgres for a given field. */
function toDb(def: FieldDef, value: unknown): unknown {
  if (value === undefined || value === null) return null;
  switch (def.type) {
    case 'id':
      return String(idOf(value));
    case 'ids':
      return (value as unknown[]).map((x) => String(idOf(x)));
    case 'date':
      return value instanceof Date ? value : new Date(value as string);
    case 'json':
      return JSON.stringify(unpopulate(value));
    case 'bytes':
      return Buffer.isBuffer(value) ? value : Buffer.from(value as Uint8Array);
    default:
      return value;
  }
}

function fromDb(def: FieldDef, value: unknown): unknown {
  if (value === null || value === undefined) {
    return def.type === 'strings' || def.type === 'numbers' || def.type === 'ids' ? [] : undefined;
  }
  switch (def.type) {
    case 'bytes':
      return Buffer.isBuffer(value) ? value : Buffer.from(value as Uint8Array);
    case 'number':
      return typeof value === 'string' ? Number(value) : value;
    case 'numbers':
      return (value as unknown[]).map(Number);
    default:
      return value;
  }
}

function snapshotOf(def: FieldDef, value: unknown): string | undefined {
  if (def.type === 'bytes') return value === undefined ? undefined : 'bytes';
  const v = toDb(def, value);
  if (v === null) return undefined;
  return JSON.stringify(v);
}

/** Recursively converts populated documents/values to JSON-friendly output. */
function jsonValue(v: unknown): unknown {
  if (isDoc(v)) return v.toJSON();
  if (Array.isArray(v)) return v.map(jsonValue);
  if (v instanceof Date || Buffer.isBuffer(v) || v === null || typeof v !== 'object') return v;
  return Object.fromEntries(Object.entries(v as AnyRecord).map(([k, val]) => [k, jsonValue(val)]));
}

type SortSpec = Record<string, 1 | -1 | 'asc' | 'desc'>;

/* ------------------------------------------------------------------- Model */

export class Model<T extends BaseDoc> {
  readonly name: string;
  readonly table: string;
  readonly fields: Record<string, FieldDef>;
  readonly timestamps: { createdAt: boolean; updatedAt: boolean };
  readonly virtuals: NonNullable<ModelDef['virtuals']>;
  private readonly columns: Record<string, string> = {};
  private readonly proto: AnyRecord;
  private readonly def: ModelDef;

  constructor(def: ModelDef) {
    this.def = def;
    this.name = def.name;
    this.table = `streetside.${def.table}`;
    this.fields = def.fields;
    this.virtuals = def.virtuals ?? {};
    this.timestamps = def.timestamps ?? { createdAt: true, updatedAt: true };
    for (const [path, f] of Object.entries(def.fields)) {
      this.columns[path] = f.column ?? snake(path);
    }
    this.proto = this.buildProto();
    registry.set(def.name, this);
  }

  /* ---- column / path resolution ---- */

  columnFor(path: string): string {
    if (path === '_id' || path === 'id') return 'id';
    if (path === 'createdAt' && this.timestamps.createdAt) return 'created_at';
    if (path === 'updatedAt' && this.timestamps.updatedAt) return 'updated_at';
    const col = this.columns[path];
    if (!col) throw new Error(`Unknown field "${path}" on ${this.name}`);
    return col;
  }

  private fieldFor(path: string): FieldDef | undefined {
    if (path === '_id' || path === 'id') return { type: 'id' };
    if (path === 'createdAt' || path === 'updatedAt') return { type: 'date' };
    return this.fields[path];
  }

  /** Paths loaded by default (everything that isn't hidden). */
  private defaultPaths(): string[] {
    return Object.keys(this.fields).filter((p) => !this.fields[p].hidden);
  }

  /* ---- document construction ---- */

  private buildProto(): AnyRecord {
    const model = this;
    const proto: AnyRecord = {};
    Object.defineProperty(proto, 'id', { get() { return this.__id; }, enumerable: false });
    Object.defineProperty(proto, '_id', { get() { return this.__id; }, enumerable: false });
    Object.defineProperties(proto, {
      save: {
        value: function save(this: AnyRecord) { return model.saveDoc(this); },
        enumerable: false,
      },
      deleteOne: {
        value: async function deleteOne(this: AnyRecord) { await model.deleteById(this.__id); },
        enumerable: false,
      },
      populate: {
        value: async function populate(this: AnyRecord, path: string, select?: string) {
          await populateDocs(model, [this], [{ path, select }]);
          return this;
        },
        enumerable: false,
      },
      toJSON: {
        value: function toJSON(this: AnyRecord) { return model.serialize(this, false); },
        enumerable: false,
      },
    });
    for (const [name, fn] of Object.entries(this.def.methods ?? {})) {
      Object.defineProperty(proto, name, { value: fn, enumerable: false });
    }
    return proto;
  }

  private newDoc(id: string | null): AnyRecord {
    const doc = Object.create(this.proto) as AnyRecord;
    Object.defineProperties(doc, {
      __model: { value: this, enumerable: false },
      __id: { value: id, writable: true, enumerable: false },
      __snap: { value: {} as Record<string, string | undefined>, writable: true, enumerable: false },
    });
    return doc;
  }

  hydrate(row: AnyRecord, paths: string[]): T {
    const doc = this.newDoc(row.id);
    for (const path of paths) {
      const def = this.fields[path];
      const col = this.columns[path];
      if (!(col in row)) continue;
      const value = fromDb(def, row[col]);
      if (value !== undefined) setPath(doc, path, value);
      doc.__snap[path] = snapshotOf(def, value);
    }
    if (this.timestamps.createdAt && 'created_at' in row) doc.createdAt = row.created_at;
    if (this.timestamps.updatedAt && 'updated_at' in row) doc.updatedAt = row.updated_at;
    return doc as T;
  }

  /* ---- serialisation ---- */

  serialize(doc: AnyRecord, lean: boolean): Record<string, any> {
    const out: AnyRecord = {};
    if (lean) out._id = doc.__id;
    out.id = doc.__id;
    for (const [path, def] of Object.entries(this.fields)) {
      if (def.hidden && !lean) continue;
      const v = getPath(doc, path);
      if (v === undefined) continue;
      setPath(out, path, jsonValue(v));
    }
    if (doc.createdAt !== undefined) out.createdAt = doc.createdAt;
    if (doc.updatedAt !== undefined) out.updatedAt = doc.updatedAt;
    for (const key of Object.keys(this.virtuals)) {
      if (doc[key] !== undefined) out[key] = jsonValue(doc[key]);
    }
    this.def.toJSONExtra?.(out, doc);
    return out;
  }

  /* ---- validation / normalisation ---- */

  private normalize(path: string, def: FieldDef, value: unknown): unknown {
    if (typeof value === 'string') {
      let v = value;
      if (def.trim) v = v.trim();
      if (def.lowercase) v = v.toLowerCase();
      if (def.uppercase) v = v.toUpperCase();
      return v;
    }
    if (def.type === 'number' && typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isNaN(n)) throw new CastError(path, value);
      return n;
    }
    if (def.type === 'date' && typeof value === 'string') {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) throw new CastError(path, value);
      return d;
    }
    return value;
  }

  private validateValue(path: string, def: FieldDef, value: unknown, errors: Record<string, string>): void {
    const isEmpty = value === undefined || value === null || (def.type === 'string' && value === '');
    if (isEmpty) {
      if (def.required) errors[path] = `Path \`${path}\` is required.`;
      return;
    }
    switch (def.type) {
      case 'string':
        if (typeof value !== 'string') { errors[path] = `Path \`${path}\` must be a string.`; return; }
        break;
      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) { errors[path] = `Path \`${path}\` must be a number.`; return; }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') { errors[path] = `Path \`${path}\` must be a boolean.`; return; }
        break;
      case 'date':
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) { errors[path] = `Path \`${path}\` must be a valid date.`; return; }
        break;
      case 'id':
        if (!isUuid(String(idOf(value)))) throw new CastError(path, value);
        break;
      case 'ids':
        if (!Array.isArray(value)) { errors[path] = `Path \`${path}\` must be an array.`; return; }
        for (const x of value) if (!isUuid(String(idOf(x)))) throw new CastError(path, x);
        break;
      case 'strings':
        if (!Array.isArray(value) || value.some((x) => typeof x !== 'string')) { errors[path] = `Path \`${path}\` must be an array of strings.`; return; }
        break;
      case 'numbers':
        if (!Array.isArray(value) || value.some((x) => typeof x !== 'number')) { errors[path] = `Path \`${path}\` must be an array of numbers.`; return; }
        break;
      default:
        break;
    }
    if (def.enum && !def.enum.includes(value as string)) {
      errors[path] = `\`${String(value)}\` is not a valid enum value for path \`${path}\`.`;
      return;
    }
    if (def.elementEnum && Array.isArray(value)) {
      const bad = value.find((x) => !def.elementEnum!.includes(x));
      if (bad !== undefined) {
        errors[`${path}`] = `\`${String(bad)}\` is not a valid enum value for path \`${path}\`.`;
        return;
      }
    }
    if (typeof value === 'number') {
      if (def.min !== undefined && value < def.min) errors[path] = `Path \`${path}\` (${value}) is less than minimum allowed value (${def.min}).`;
      if (def.max !== undefined && value > def.max) errors[path] = `Path \`${path}\` (${value}) is more than maximum allowed value (${def.max}).`;
    }
    if (typeof value === 'string') {
      if (def.maxlength !== undefined && value.length > def.maxlength) errors[path] = `Path \`${path}\` is longer than the maximum allowed length (${def.maxlength}).`;
      if (def.minlength !== undefined && value.length < def.minlength) errors[path] = `Path \`${path}\` is shorter than the minimum allowed length (${def.minlength}).`;
      if (def.match && !def.match[0].test(value)) errors[path] = def.match[1];
    }
    if (def.validate) {
      const msg = def.validate(value);
      if (msg) errors[path] = msg;
    }
  }

  /** Normalises and validates the given paths of a document in place. */
  private prepare(doc: AnyRecord, paths: string[]): void {
    const errors: Record<string, string> = {};
    for (const path of paths) {
      const def = this.fields[path];
      let value = getPath(doc, path);
      if (value !== undefined && value !== null) {
        value = this.normalize(path, def, value);
        setPath(doc, path, value);
      }
      this.validateValue(path, def, value, errors);
    }
    if (Object.keys(errors).length) throw new ValidationError(errors);
  }

  /* ---- persistence ---- */

  private async insertDoc(doc: AnyRecord): Promise<void> {
    // Defaults
    for (const [path, def] of Object.entries(this.fields)) {
      if (getPath(doc, path) !== undefined) continue;
      let dv: unknown = def.default;
      if (dv === undefined && (def.type === 'strings' || def.type === 'numbers' || def.type === 'ids')) dv = [];
      if (dv !== undefined) setPath(doc, path, typeof dv === 'function' ? (dv as () => unknown)() : structuredCloneSafe(dv));
    }
    this.prepare(doc, Object.keys(this.fields));

    const cols: string[] = [];
    const placeholders: string[] = [];
    const params: unknown[] = [];
    for (const [path, def] of Object.entries(this.fields)) {
      const v = getPath(doc, path);
      if (v === undefined) continue;
      params.push(toDb(def, v));
      cols.push(q(this.columns[path]));
      placeholders.push(`$${params.length}${CAST[def.type]}`);
    }
    for (const key of ['createdAt', 'updatedAt'] as const) {
      if (this.timestamps[key] && doc[key] instanceof Date) {
        params.push(doc[key]);
        cols.push(q(key === 'createdAt' ? 'created_at' : 'updated_at'));
        placeholders.push(`$${params.length}::timestamptz`);
      }
    }
    const sql = cols.length
      ? `insert into ${this.table} (${cols.join(', ')}) values (${placeholders.join(', ')}) returning *`
      : `insert into ${this.table} default values returning *`;
    const { rows } = await query(sql, params);
    this.absorbRow(doc, rows[0], Object.keys(this.fields));
  }

  /** Copies server-generated values (id, timestamps) back onto the document and resets the snapshot. */
  private absorbRow(doc: AnyRecord, row: AnyRecord, paths: string[]): void {
    doc.__id = row.id;
    if (this.timestamps.createdAt) doc.createdAt = row.created_at;
    if (this.timestamps.updatedAt) doc.updatedAt = row.updated_at;
    doc.__snap = {};
    for (const path of paths) {
      const def = this.fields[path];
      if (!hasPath(doc, path) && !(def.type === 'strings' || def.type === 'numbers' || def.type === 'ids')) continue;
      doc.__snap[path] = snapshotOf(def, getPath(doc, path));
    }
  }

  async saveDoc(doc: AnyRecord): Promise<any> {
    if (!doc.__id) {
      await this.insertDoc(doc);
      return doc;
    }
    const changed: string[] = [];
    for (const [path, def] of Object.entries(this.fields)) {
      if (!hasPath(doc, path)) continue; // not loaded / left untouched
      const current = snapshotOf(def, getPath(doc, path));
      if (current !== doc.__snap[path]) changed.push(path);
    }
    if (!changed.length) return doc;
    this.prepare(doc, changed);

    const sets: string[] = [];
    const params: unknown[] = [];
    for (const path of changed) {
      const def = this.fields[path];
      params.push(toDb(def, getPath(doc, path)));
      sets.push(`${q(this.columns[path])} = $${params.length}${CAST[def.type]}`);
    }
    if (this.timestamps.updatedAt) sets.push('"updated_at" = now()');
    params.push(doc.__id);
    const { rows } = await query(
      `update ${this.table} set ${sets.join(', ')} where id = $${params.length}::uuid returning *`,
      params,
    );
    if (!rows[0]) return doc;
    if (this.timestamps.updatedAt) doc.updatedAt = rows[0].updated_at;
    for (const path of changed) doc.__snap[path] = snapshotOf(this.fields[path], getPath(doc, path));
    return doc;
  }

  private async deleteById(id: string): Promise<void> {
    await query(`delete from ${this.table} where id = $1::uuid`, [id]);
  }

  /* ---- public static-style API ---- */

  async create(data: AnyRecord): Promise<T> {
    const doc = this.newDoc(null);
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      doc[k] = k === 'id' || k === '_id' ? undefined : v;
    }
    // Deep-copy nested plain objects so later edits to `data` don't leak in.
    await this.insertDoc(doc);
    return doc as T;
  }

  async insertMany(items: AnyRecord[]): Promise<T[]> {
    const out: T[] = [];
    for (const item of items) out.push(await this.create(item));
    return out;
  }

  find(filter: AnyRecord = {}): Query<T[]> {
    return new Query<T[]>(this, 'find', filter);
  }

  findOne(filter: AnyRecord = {}): Query<T | null> {
    return new Query<T | null>(this, 'findOne', filter);
  }

  findById(id: unknown): Query<T | null> {
    const key = String(idOf(id));
    return new Query<T | null>(this, 'findOne', { _id: key });
  }

  async countDocuments(filter: AnyRecord = {}): Promise<number> {
    const params: unknown[] = [];
    const where = this.buildWhere(filter, params);
    const { rows } = await query(`select count(*)::int as n from ${this.table} where ${where}`, params);
    return rows[0].n;
  }

  async exists(filter: AnyRecord): Promise<{ _id: string } | null> {
    const params: unknown[] = [];
    const where = this.buildWhere(filter, params);
    const { rows } = await query(`select id from ${this.table} where ${where} limit 1`, params);
    return rows[0] ? { _id: rows[0].id } : null;
  }

  async updateOne(filter: AnyRecord, update: AnyRecord): Promise<{ modifiedCount: number }> {
    return this.runUpdate(filter, update, true);
  }

  async updateMany(filter: AnyRecord, update: AnyRecord): Promise<{ modifiedCount: number }> {
    return this.runUpdate(filter, update, false);
  }

  async findByIdAndUpdate(
    id: unknown,
    update: AnyRecord,
    options: { new?: boolean; runValidators?: boolean } = {},
  ): Promise<T | null> {
    const key = String(idOf(id));
    if (!isUuid(key)) return null;
    await this.runUpdate({ _id: key }, update, true, options.runValidators !== false);
    return this.findById(key).exec();
  }

  async deleteOne(filter: AnyRecord): Promise<{ deletedCount: number }> {
    const params: unknown[] = [];
    const where = this.buildWhere(filter, params);
    const { rowCount } = await query(
      `delete from ${this.table} where id = (select id from ${this.table} where ${where} limit 1)`,
      params,
    );
    return { deletedCount: rowCount };
  }

  async deleteMany(filter: AnyRecord = {}): Promise<{ deletedCount: number }> {
    const params: unknown[] = [];
    const where = this.buildWhere(filter, params);
    const { rowCount } = await query(`delete from ${this.table} where ${where}`, params);
    return { deletedCount: rowCount };
  }

  private async runUpdate(
    filter: AnyRecord,
    update: AnyRecord,
    one: boolean,
    validate = true,
  ): Promise<{ modifiedCount: number }> {
    const set: AnyRecord = { ...(update.$set ?? {}) };
    const inc: AnyRecord = update.$inc ?? {};
    const unset: AnyRecord = update.$unset ?? {};
    for (const [k, v] of Object.entries(update)) {
      if (!k.startsWith('$')) set[k] = v;
    }
    // Like Mongoose, ignore `undefined` values rather than writing NULL.
    for (const k of Object.keys(set)) if (set[k] === undefined) delete set[k];

    if (validate) {
      const paths = Object.keys(set).filter((p) => this.fields[p]);
      const errors: Record<string, string> = {};
      for (const path of paths) {
        const def = this.fields[path];
        if (set[path] !== undefined && set[path] !== null) set[path] = this.normalize(path, def, set[path]);
        this.validateValue(path, def, set[path], errors);
      }
      if (Object.keys(errors).length) throw new ValidationError(errors);
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let touchedUpdatedAt = false;
    for (const [path, value] of Object.entries(set)) {
      const col = this.columnFor(path);
      const def = this.fieldFor(path)!;
      if (path === 'updatedAt') touchedUpdatedAt = true;
      params.push(toDb(def, value));
      sets.push(`${q(col)} = $${params.length}${CAST[def.type]}`);
    }
    for (const [path, by] of Object.entries(inc)) {
      params.push(by);
      sets.push(`${q(this.columnFor(path))} = coalesce(${q(this.columnFor(path))}, 0) + $${params.length}::float8`);
    }
    for (const path of Object.keys(unset)) {
      sets.push(`${q(this.columnFor(path))} = null`);
    }
    if (!sets.length) return { modifiedCount: 0 };
    if (this.timestamps.updatedAt && !touchedUpdatedAt) sets.push('"updated_at" = now()');

    const where = this.buildWhere(filter, params);
    const target = one
      ? `id = (select id from ${this.table} where ${where} limit 1)`
      : where;
    const { rowCount } = await query(`update ${this.table} set ${sets.join(', ')} where ${target}`, params);
    return { modifiedCount: rowCount };
  }

  /* ---- filter → SQL ---- */

  buildWhere(filter: AnyRecord, params: unknown[]): string {
    const clauses: string[] = [];
    for (const [key, cond] of Object.entries(filter ?? {})) {
      if (key === '$text') {
        clauses.push(this.textClause(String((cond as AnyRecord).$search ?? ''), params));
        continue;
      }
      if (key === '$or' || key === '$and') {
        const parts = (cond as AnyRecord[]).map((f) => `(${this.buildWhere(f, params)})`);
        clauses.push(parts.length ? `(${parts.join(key === '$or' ? ' or ' : ' and ')})` : key === '$or' ? 'false' : 'true');
        continue;
      }
      clauses.push(this.condition(key, cond, params));
    }
    return clauses.length ? clauses.join(' and ') : 'true';
  }

  private textClause(search: string, params: unknown[]): string {
    const terms = search.split(/\s+/).filter(Boolean).slice(0, 10);
    const paths = this.def.textSearch ?? [];
    if (!terms.length || !paths.length) return 'false';
    const perTerm = terms.map((t) => {
      params.push(`%${t.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
      const ph = `$${params.length}::text`;
      const cols = paths.map((p) => {
        const def = this.fields[p];
        const col = q(this.columnFor(p));
        return def.type === 'strings' ? `array_to_string(${col}, ' ') ilike ${ph}` : `${col} ilike ${ph}`;
      });
      return `(${cols.join(' or ')})`;
    });
    return `(${perTerm.join(' or ')})`;
  }

  private condition(path: string, cond: unknown, params: unknown[]): string {
    const col = q(this.columnFor(path));
    const def = this.fieldFor(path)!;
    const isArray = def.type === 'strings' || def.type === 'numbers' || def.type === 'ids';
    const elemType: FieldType = def.type === 'strings' ? 'string' : def.type === 'numbers' ? 'number' : def.type === 'ids' ? 'id' : def.type;
    const bind = (v: unknown, t: FieldType = elemType): string => {
      params.push(toDb({ type: t }, v));
      return `$${params.length}${CAST[t]}`;
    };
    const idBad = (v: unknown) => elemType === 'id' && !isUuid(String(idOf(v)));

    const isOperatorObject =
      cond !== null &&
      typeof cond === 'object' &&
      !(cond instanceof Date) &&
      !Array.isArray(cond) &&
      !isDoc(cond) &&
      Object.keys(cond as AnyRecord).some((k) => k.startsWith('$'));

    if (!isOperatorObject) {
      if (cond === null || cond === undefined) return `${col} is null`;
      if (idBad(cond)) return 'false';
      return isArray ? `${bind(cond)} = any(${col})` : `${col} = ${bind(cond)}`;
    }

    const parts: string[] = [];
    for (const [op, val] of Object.entries(cond as AnyRecord)) {
      switch (op) {
        case '$in': {
          const list = (val as unknown[]).filter((x) => !idBad(x));
          if (!list.length) { parts.push('false'); break; }
          const arr = (v: unknown[]) => { params.push(v.map((x) => toDb({ type: elemType }, x))); return `$${params.length}${CAST[def.type === 'id' ? 'ids' : def.type === 'string' ? 'strings' : def.type === 'number' ? 'numbers' : def.type]}`; };
          parts.push(isArray ? `${col} && ${arr(list)}` : `${col} = any(${arr(list)})`);
          break;
        }
        case '$nin': {
          const list = (val as unknown[]).filter((x) => !idBad(x));
          if (!list.length) break;
          params.push(list.map((x) => toDb({ type: elemType }, x)));
          const castArr = CAST[def.type === 'id' ? 'ids' : def.type === 'string' ? 'strings' : def.type === 'number' ? 'numbers' : def.type];
          parts.push(`not (${col} = any($${params.length}${castArr}))`);
          break;
        }
        case '$ne':
          if (val === null || val === undefined) parts.push(`${col} is not null`);
          else if (idBad(val)) parts.push('true');
          else parts.push(isArray ? `not (${bind(val)} = any(${col}))` : `${col} is distinct from ${bind(val)}`);
          break;
        case '$gt': parts.push(`${col} > ${bind(val)}`); break;
        case '$gte': parts.push(`${col} >= ${bind(val)}`); break;
        case '$lt': parts.push(`${col} < ${bind(val)}`); break;
        case '$lte': parts.push(`${col} <= ${bind(val)}`); break;
        case '$exists': parts.push(val ? `${col} is not null` : `${col} is null`); break;
        case '$regex': {
          const flags = (cond as AnyRecord).$options as string | undefined;
          params.push(val instanceof RegExp ? val.source : String(val));
          parts.push(`${col} ${flags?.includes('i') ? '~*' : '~'} $${params.length}::text`);
          break;
        }
        case '$options':
          break;
        default:
          throw new Error(`Unsupported query operator ${op}`);
      }
    }
    return parts.length ? parts.join(' and ') : 'true';
  }

  /* ---- selection helpers used by Query ---- */

  resolveSelection(select: string | undefined): string[] {
    if (!select) return this.defaultPaths();
    const tokens = select.split(/\s+/).filter(Boolean);
    const plus = tokens.filter((t) => t.startsWith('+')).map((t) => t.slice(1));
    const include = tokens.filter((t) => !t.startsWith('+') && !t.startsWith('-'));
    const exclude = tokens.filter((t) => t.startsWith('-')).map((t) => t.slice(1));
    let paths: string[];
    if (include.length) {
      paths = Object.keys(this.fields).filter((p) => include.some((t) => p === t || p.startsWith(`${t}.`)));
    } else {
      paths = this.defaultPaths().filter((p) => !exclude.some((t) => p === t || p.startsWith(`${t}.`)));
    }
    for (const t of plus) {
      for (const p of Object.keys(this.fields)) if (p === t || p.startsWith(`${t}.`)) if (!paths.includes(p)) paths.push(p);
    }
    return paths;
  }

  selectColumns(paths: string[]): string {
    const cols = new Set<string>(['id']);
    if (this.timestamps.createdAt) cols.add('created_at');
    if (this.timestamps.updatedAt) cols.add('updated_at');
    for (const p of paths) cols.add(this.columns[p]);
    return [...cols].map(q).join(', ');
  }

  orderBy(sort: SortSpec | null): string {
    const parts: string[] = [];
    const seen = new Set<string>();
    for (const [path, dirRaw] of Object.entries(sort ?? {})) {
      const desc = dirRaw === -1 || dirRaw === 'desc';
      if (path === '_id' || path === 'id') {
        // ObjectIds were time-ordered; (created_at, id) is the equivalent.
        for (const c of this.timestamps.createdAt ? ['created_at', 'id'] : ['id']) {
          if (!seen.has(c)) { parts.push(`${q(c)} ${desc ? 'desc' : 'asc'}`); seen.add(c); }
        }
        continue;
      }
      const col = this.columnFor(path);
      if (seen.has(col)) continue;
      seen.add(col);
      const def = this.fieldFor(path);
      const collate = def?.type === 'string' ? ' collate "C"' : '';
      parts.push(`${q(col)}${collate} ${desc ? 'desc nulls last' : 'asc nulls first'}`);
    }
    if (!seen.has('created_at') && this.timestamps.createdAt) parts.push('"created_at" asc');
    if (!seen.has('id')) parts.push('"id" asc');
    return parts.join(', ');
  }
}

function structuredCloneSafe<V>(v: V): V {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as V);
}

/* ------------------------------------------------------------------- Query */

type PopulateSpec = { path: string; select?: string };

export class Query<R> implements PromiseLike<R> {
  private sortSpec: SortSpec | null = null;
  private limitN: number | null = null;
  private skipN = 0;
  private selectStr: string | undefined;
  private populateSpecs: PopulateSpec[] = [];
  private isLean = false;
  private distinctPath: string | null = null;

  constructor(
    private readonly model: Model<any>,
    private readonly op: 'find' | 'findOne',
    private readonly filter: AnyRecord,
  ) {}

  sort(spec: SortSpec): this { this.sortSpec = spec; return this; }
  limit(n: number): this { this.limitN = n; return this; }
  skip(n: number): this { this.skipN = n; return this; }
  select(fields: string): this { this.selectStr = fields; return this; }
  lean(): Query<any> { this.isLean = true; return this as Query<any>; }

  populate(path: string | PopulateSpec, select?: string): this {
    this.populateSpecs.push(typeof path === 'string' ? { path, select } : path);
    return this;
  }

  distinct(path: string): Query<any[]> {
    this.distinctPath = path;
    return this as unknown as Query<any[]>;
  }

  exec(): Promise<R> { return this.run(); }

  then<A = R, B = never>(
    onfulfilled?: ((value: R) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<R> {
    const model = this.model;
    const params: unknown[] = [];
    const where = model.buildWhere(this.filter, params);

    if (this.distinctPath) {
      const col = model.columnFor(this.distinctPath);
      const { rows } = await query(
        `select distinct "${col}" as v from ${model.table} where ${where} and "${col}" is not null`,
        params,
      );
      return rows.map((r) => r.v) as unknown as R;
    }

    const paths = model.resolveSelection(this.selectStr);
    let sql = `select ${model.selectColumns(paths)} from ${model.table} where ${where} order by ${model.orderBy(this.sortSpec)}`;
    const limit = this.op === 'findOne' ? 1 : this.limitN;
    if (limit !== null) sql += ` limit ${Math.max(0, Math.floor(limit))}`;
    if (this.skipN) sql += ` offset ${Math.max(0, Math.floor(this.skipN))}`;

    const { rows } = await query(sql, params);
    const docs = rows.map((r) => model.hydrate(r, paths));
    if (this.populateSpecs.length) await populateDocs(model, docs, this.populateSpecs);

    const shaped = this.isLean ? docs.map((d) => model.serialize(d, true)) : docs;
    return (this.op === 'findOne' ? (shaped[0] ?? null) : shaped) as unknown as R;
  }
}

/* ---------------------------------------------------------------- populate */

async function populateDocs(model: Model<any>, docs: AnyRecord[], specs: PopulateSpec[]): Promise<void> {
  if (!docs.length) return;
  for (const { path, select } of specs) {
    const virtual = model.virtuals[path];
    if (virtual) {
      const target = registry.get(virtual.ref)!;
      const ids = docs.map((d) => d.__id as string);
      const children = await target.find({ [virtual.foreignField]: { $in: ids } }).select(select ?? '').exec();
      const groups = new Map<string, any[]>();
      for (const c of children as AnyRecord[]) {
        const key = String(idOf(c[virtual.foreignField]));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      }
      for (const d of docs) d[path] = groups.get(d.__id) ?? [];
      continue;
    }

    // "stops.vendor": a reference nested inside an array of JSON sub-documents
    if (path.includes('.')) {
      const [arrayField, refField] = path.split('.');
      const refModelName = (model.fields[arrayField] as FieldDef & { itemRefs?: Record<string, string> })?.ref;
      const target = registry.get(refModelName ?? '');
      if (!target) throw new Error(`Cannot populate "${path}" on ${model.name}`);
      const ids = new Set<string>();
      for (const d of docs) for (const item of (d[arrayField] ?? []) as AnyRecord[]) {
        const v = idOf(item[refField]);
        if (isUuid(v)) ids.add(v as string);
      }
      const found = ids.size ? await target.find({ _id: { $in: [...ids] } }).select(select ?? '').exec() : [];
      const byId = new Map((found as AnyRecord[]).map((x) => [x.__id as string, x]));
      for (const d of docs) {
        for (const item of (d[arrayField] ?? []) as AnyRecord[]) {
          item[refField] = byId.get(String(idOf(item[refField]))) ?? null;
        }
      }
      continue;
    }

    const def = model.fields[path];
    if (!def?.ref) throw new Error(`Cannot populate "${path}" on ${model.name}`);
    const target = registry.get(def.ref);
    if (!target) throw new Error(`Unknown model "${def.ref}"`);
    const ids = new Set<string>();
    for (const d of docs) {
      const raw = d[path];
      for (const x of def.type === 'ids' ? (raw ?? []) : raw ? [raw] : []) {
        const v = String(idOf(x));
        if (isUuid(v)) ids.add(v);
      }
    }
    const found = ids.size ? await target.find({ _id: { $in: [...ids] } }).select(select ?? '').exec() : [];
    const byId = new Map((found as AnyRecord[]).map((x) => [x.__id as string, x]));
    for (const d of docs) {
      const raw = d[path];
      if (def.type === 'ids') {
        d[path] = (raw ?? []).map((x: unknown) => byId.get(String(idOf(x)))).filter(Boolean);
      } else if (raw !== undefined && raw !== null) {
        d[path] = byId.get(String(idOf(raw))) ?? null;
      }
    }
  }
}

export function defineModel<T extends BaseDoc>(def: ModelDef): Model<T> {
  return new Model<T>(def);
}
