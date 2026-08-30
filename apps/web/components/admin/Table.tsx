import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  renderActions,
  emptyMessage = "No records yet.",
}: {
  columns: TableColumn<T>[];
  rows: T[];
  renderActions?: (row: T) => ReactNode;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="border border-ink/10 px-4 py-6 font-body text-sm text-slate">{emptyMessage}</p>;
  }

  return (
    <table className="w-full border-collapse font-body text-sm">
      <thead>
        <tr className="border-b border-ink/10 text-left">
          {columns.map((col) => (
            <th key={col.key} className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
              {col.label}
            </th>
          ))}
          {renderActions && <th className="py-2" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-ink/10">
            {columns.map((col) => (
              <td key={col.key} className="py-3 pr-4 align-top text-ink">
                {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
              </td>
            ))}
            {renderActions && <td className="py-3 text-right">{renderActions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
