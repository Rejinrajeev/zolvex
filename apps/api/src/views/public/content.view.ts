/**
 * Strips workflow-internal fields before a content record ever reaches the
 * public API. The public has no business knowing who submitted/approved a
 * record, when, or why something was rejected -- unlike the admin API's
 * contentRecordView, which is a deliberate pass-through for authenticated
 * staff only.
 */
const WORKFLOW_FIELDS = ["submittedBy", "approvedBy", "approvedAt", "rejectionReason", "deletedAt"] as const;

export function publicContentView(record: Record<string, unknown>): Record<string, unknown> {
  const view = { ...record };
  for (const field of WORKFLOW_FIELDS) {
    delete view[field];
  }
  return view;
}

export function publicContentListView(records: Record<string, unknown>[]): Record<string, unknown>[] {
  return records.map(publicContentView);
}
