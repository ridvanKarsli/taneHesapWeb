import { Fragment, type ReactNode } from "react";
import "./ui.css";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
  /** Bir satırın altında tam genişlikte açılan detay (örn. tedarikçi alışları). */
  renderExpanded?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
}

/**
 * Tüm modül listelerinin ortak tablo bileşeni — kolonlar sayfa tarafından tanımlanır (Open/Closed).
 * Hücreler `data-label` taşır; mobilde (ui.css) tablo, her satırı "başlık — değer" kartı olan bir
 * listeye dönüşür.
 */
export function DataTable<T>({ columns, rows, rowKey, rowActions, renderExpanded, rowClassName }: DataTableProps<T>) {
  const columnCount = columns.length + (rowActions ? 1 : 0);

  return (
    <div className="ui-table-wrapper">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={column.align === "right" ? "ui-align-right" : undefined}>
                {column.header}
              </th>
            ))}
            {rowActions && <th aria-label="İşlemler" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expanded = renderExpanded?.(row);
            return (
              <Fragment key={rowKey(row)}>
                <tr className={rowClassName?.(row)}>
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      data-label={column.header}
                      className={column.align === "right" ? "ui-align-right" : undefined}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="ui-row-actions">
                      <div className="ui-row-actions-inner">{rowActions(row)}</div>
                    </td>
                  )}
                </tr>
                {expanded && (
                  <tr className="ui-table-expanded">
                    <td colSpan={columnCount}>{expanded}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
