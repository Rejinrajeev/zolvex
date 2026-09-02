import type { ReactNode } from "react";
import { EmptyState } from "./ui";

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  renderActions,
  emptyMessage = "Nothing here yet.",
}: {
  columns: TableColumn<T>[];
  rows: T[];
  renderActions?: (row: T) => ReactNode;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-paper shadow-[0_18px_44px_-28px_rgba(12,58,44,0.28)] ring-1 ring-ink/5">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-sora text-sm">
          <thead>
            <tr className="bg-mist text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 font-sora text-xs font-semibold uppercase tracking-wide text-moss"
                >
                  {col.label}
                </th>
              ))}
              {renderActions && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-mist/50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 align-top text-ink">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3.5 text-right">{renderActions(row)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
