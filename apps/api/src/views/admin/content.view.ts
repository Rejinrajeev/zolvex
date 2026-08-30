/** Pure response-shaping for the generic content endpoints — no business logic. */

export function contentRecordView(record: unknown) {
  return record;
}

export function contentListView(records: unknown[]) {
  return records;
}
