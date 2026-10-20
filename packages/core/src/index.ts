import Dexie, { type Table } from 'dexie';

export type FormValues = Record<string, unknown>;
export type SubmissionStatus = 'idle' | 'preparing' | 'submitting' | 'uncertain' | 'retrying' | 'confirmed' | 'rejected';
export type DraftStatus = 'empty' | 'available' | 'restoring' | 'restored' | 'migration_failed' | 'storage_unavailable';
export type Migration = (previous: FormValues) => FormValues | Promise<FormValues>;
export interface DraftRecord {
  draftId: string;
  formId: string;
  schemaVersion: number;
  values: FormValues;
  currentStep: number;
  updatedAt: number;
}
export interface PendingIntent {
  intentId: string;
  formId: string;
  idempotencyKey: string;
  canonicalPayload: string;
  payloadHash: string;
  createdAt: number;
  status: 'pending' | 'uncertain';
}
export interface FormLabEvent {
  id: string;
  at: number;
  type: string;
  status?: string;
  metadata?: Record<string, unknown>;
}
export interface FormLabOptions {
  formId: string;
  draftId?: string;
  schemaVersion: number;
  exclude?: string[];
  debounceMs?: number;
  migrations?: Record<number, Migration>;
  validateDraft?: (values: FormValues) => boolean | Promise<boolean>;
}

// Canonical JSON: sort keys recursively, preserve arrays.
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

class FormLabDB extends Dexie {
  drafts!: Table<DraftRecord, string>;
  intents!: Table<PendingIntent, string>;
  events!: Table<FormLabEvent, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      drafts: 'draftId, formId, schemaVersion, updatedAt',
      intents: 'intentId, formId, status, createdAt',
      events: 'id, at, type',
    });
  }
}

export interface FormLabCore {
  save(values: FormValues, currentStep?: number): Promise<void>;
  getDraft(): Promise<DraftRecord | null>;
  previewRestore(): Promise<{ status: DraftStatus; original?: DraftRecord; candidate?: DraftRecord; error?: string }>;
  commitRestore(): Promise<DraftRecord>;
  discardDraft(): Promise<void>;
  prepareSubmission(values: FormValues): Promise<PendingIntent>;
  getPendingSubmission(): Promise<PendingIntent | null>;
  submitPending(fetcher: (intent: PendingIntent) => Promise<Response>): Promise<SubmissionStatus>;
  retryPending(fetcher: (intent: PendingIntent) => Promise<Response>): Promise<SubmissionStatus>;
  getEvents(): ReadonlyArray<FormLabEvent>;
}

export function createFormLab(options: FormLabOptions): FormLabCore {
  const db = new FormLabDB(`formlab-${options.formId}`);
  const exclude = new Set(options.exclude ?? []);
  const events: FormLabEvent[] = [];
  const log = (type: string, status?: string, metadata?: Record<string, unknown>) => {
    const e: FormLabEvent = { id: crypto.randomUUID(), at: Date.now(), type, status, metadata };
    events.push(e);
    void db.events.add(e).catch(() => {});
  };

  const filterExcluded = (values: FormValues): FormValues => {
    const out: FormValues = {};
    for (const [k, v] of Object.entries(values)) {
      if (exclude.has(k)) continue;
      out[k] = v;
    }
    return out;
  };

  const draftId = options.draftId ?? options.formId;

  async function migrateValues(record: DraftRecord): Promise<DraftRecord> {
    let values = record.values;
    let version = record.schemaVersion;
    const migrations = options.migrations ?? {};
    const clone = structuredClone(values);
    let current = clone;
    let v = version;
    while (v < options.schemaVersion && migrations[v]) {
      const mig = migrations[v]!;
      current = await mig(current);
      v += 1;
    }
    if (v !== options.schemaVersion) {
      throw new Error('migration chain incomplete');
    }
    if (options.validateDraft) {
      const ok = await options.validateDraft(current);
      if (!ok) throw new Error('draft validation failed');
    }
    return { ...record, values: current, schemaVersion: options.schemaVersion };
  }

  return {
    async save(values, currentStep = 0) {
      const filtered = filterExcluded(values);
      const record: DraftRecord = {
        draftId,
        formId: options.formId,
        schemaVersion: options.schemaVersion,
        values: filtered,
        currentStep,
        updatedAt: Date.now(),
      };
      try {
        await db.drafts.put(record);
        log('draft.saved', 'ok', { step: currentStep });
      } catch (err) {
        log('storage.error', 'error', { message: String(err) });
      }
    },
    async getDraft() {
      try {
        return (await db.drafts.get(draftId)) ?? null;
      } catch (err) {
        log('storage.error', 'error', { message: String(err) });
        return null;
      }
    },
    async previewRestore() {
      const original = await db.drafts.get(draftId);
      if (!original) return { status: 'empty' };
      try {
        const candidate = await migrateValues(original);
        return { status: 'available', original, candidate };
      } catch (err) {
        return { status: 'migration_failed', original, error: String(err) };
      }
    },
    async commitRestore() {
      const original = await db.drafts.get(draftId);
      if (!original) throw new Error('no draft');
      const candidate = await migrateValues(original);
      await db.drafts.put(candidate);
      log('draft.restored', 'ok');
      return candidate;
    },
    async discardDraft() {
      await db.drafts.delete(draftId);
      log('draft.discarded', 'ok');
    },
    async prepareSubmission(values) {
      const existing = await db.intents.where('formId').equals(options.formId).first();
      if (existing && (existing.status === 'pending' || existing.status === 'uncertain')) {
        return existing;
      }
      const filtered = filterExcluded(values);
      const canonical = canonicalize({ formId: options.formId, payload: filtered });
      const hash = await sha256Hex(canonical);
      const intent: PendingIntent = {
        intentId: crypto.randomUUID(),
        formId: options.formId,
        idempotencyKey: crypto.randomUUID(),
        canonicalPayload: canonical,
        payloadHash: hash,
        createdAt: Date.now(),
        status: 'pending',
      };
      await db.intents.add(intent);
      log('submission.prepared', 'pending');
      return intent;
    },
    async getPendingSubmission() {
      return (await db.intents.where('formId').equals(options.formId).first()) ?? null;
    },
    async submitPending(fetcher) {
      const intent = await db.intents.where('formId').equals(options.formId).first();
      if (!intent) throw new Error('no pending intent');
      log('submission.submitting', 'submitting');
      let res: Response;
      try {
        res = await fetcher(intent);
      } catch {
        intent.status = 'uncertain';
        await db.intents.put(intent);
        log('submission.uncertain', 'uncertain');
        return 'uncertain';
      }
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.status === 'confirmed') {
          await db.intents.delete(intent.intentId);
          await db.drafts.delete(draftId);
          log('submission.confirmed', 'confirmed');
          return 'confirmed';
        }
      }
      if (res.status >= 500) {
        intent.status = 'uncertain';
        await db.intents.put(intent);
        log('submission.uncertain', 'uncertain');
        return 'uncertain';
      }
      intent.status = 'uncertain';
      await db.intents.put(intent);
      log('submission.rejected', 'rejected');
      return 'rejected';
    },
    async retryPending(fetcher) {
      const intent = await db.intents.where('formId').equals(options.formId).first();
      if (!intent) throw new Error('no pending intent');
      // retry uses stored canonical payload; fetcher should read intent
      return this.submitPending(fetcher);
    },
    getEvents() {
      return events as ReadonlyArray<FormLabEvent>;
    },
  };
}
