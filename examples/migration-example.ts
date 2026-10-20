// Illustrative contract example, not compiled implementation.
export function migrateV1ToV2(draft: Record<string, unknown>) {
  const fullName = String(draft.fullName ?? '').trim();
  const [firstName = '', ...rest] = fullName.split(/\s+/);
  const { fullName: _unused, ...remaining } = draft;
  return { ...remaining, firstName, lastName: rest.join(' ') };
}
