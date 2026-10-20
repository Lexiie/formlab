import { describe, it, expect } from 'vitest';
import { createFormLab, canonicalize } from './index';

describe('canonicalize', () => {
  it('sorts keys', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});

describe('createFormLab', () => {
  it('saves and restores draft', async () => {
    const lab = createFormLab({ formId: 'f1', schemaVersion: 1 });
    await lab.save({ name: 'x' }, 2);
    const d = await lab.getDraft();
    expect(d?.values).toEqual({ name: 'x' });
    expect(d?.currentStep).toBe(2);
  });

  it('excludes sensitive fields', async () => {
    const lab = createFormLab({ formId: 'f2', schemaVersion: 1, exclude: ['secret'] });
    await lab.save({ name: 'x', secret: 'pw' });
    const d = await lab.getDraft();
    expect(d?.values).toEqual({ name: 'x' });
  });

  it('migrates draft', async () => {
    const lab1 = createFormLab({ formId: 'f3', schemaVersion: 1 });
    await lab1.save({ v: 1 });
    const lab2 = createFormLab({ formId: 'f3', schemaVersion: 2, migrations: { 1: async (p) => ({ ...p, v: (p.v as number) + 1 }) } });
    const preview = await lab2.previewRestore();
    expect(preview.status).toBe('available');
    const restored = await lab2.commitRestore();
    expect(restored.values).toEqual({ v: 2 });
    expect(restored.schemaVersion).toBe(2);
  });

  it('prepareSubmission creates pending intent', async () => {
    const lab = createFormLab({ formId: 'f4', schemaVersion: 1 });
    const intent = await lab.prepareSubmission({ a: 1 });
    expect(intent.status).toBe('pending');
    const pending = await lab.getPendingSubmission();
    expect(pending?.idempotencyKey).toBe(intent.idempotencyKey);
  });
});