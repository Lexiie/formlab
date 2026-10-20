import { useEffect, useState, useCallback, useRef } from 'react';
import { createFormLab } from '@formlab/core';
import type { FormLabOptions, SubmissionStatus, DraftStatus } from '@formlab/core';

export interface UseFormLabOptions extends FormLabOptions {
  form: any;
}

export function useFormLab({ form, ...opts }: UseFormLabOptions) {
  const lab = createFormLab(opts);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('empty');
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const submittingRef = useRef(false);
  const [restorePreview, setRestorePreview] = useState<any>(null);

  useEffect(() => {
    const sub = form.watch((values: any) => {
      void lab.save(values, 0);
    });
    // initial preview
    lab.previewRestore().then(p => {
      setRestorePreview(p);
      setDraftStatus(p.status === 'available' ? 'available' : p.status);
    });
    return () => { if (typeof sub?.unsubscribe === 'function') sub.unsubscribe(); };
  }, [form, lab]);

  const restore = useCallback(async () => {
    const r = await lab.commitRestore();
    form.reset(r.values);
    setDraftStatus('restored');
  }, [form, lab]);

  const discard = useCallback(async () => {
    await lab.discardDraft();
    setDraftStatus('empty');
  }, [lab]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const values = form.getValues();
    await lab.prepareSubmission(values);
    setSubmissionStatus('preparing');
    const fetcher = async (i: any) => {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': i.idempotencyKey },
        body: JSON.stringify({ formId: i.formId, payload: JSON.parse(i.canonicalPayload).payload }),
      });
      return res;
    };
    const status = await lab.submitPending(fetcher);
    setSubmissionStatus(status);
    submittingRef.current = false;
  }, [form, lab]);

  const submitWithDrop = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const values = form.getValues();
    await lab.prepareSubmission(values);
    setSubmissionStatus('preparing');
    const fetcher = async (i: any) => fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': i.idempotencyKey, 'X-Demo-Drop-Response': '1' },
      body: JSON.stringify({ formId: i.formId, payload: JSON.parse(i.canonicalPayload).payload }),
    });
    const status = await lab.submitPending(fetcher);
    setSubmissionStatus(status);
    submittingRef.current = false;
  }, [form, lab]);

  const retry = useCallback(async () => {
    const intent = await lab.getPendingSubmission();
    if (!intent) return;
    const fetcher = async (i: any) => fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': i.idempotencyKey },
      body: JSON.stringify({ formId: i.formId, payload: JSON.parse(i.canonicalPayload).payload }),
    });
    const status = await lab.retryPending(fetcher);
    setSubmissionStatus(status);
  }, [lab]);

  return { draftStatus, submissionStatus, restorePreview, restore, discard, submit, submitWithDrop, retry, events: lab.getEvents() };
}
