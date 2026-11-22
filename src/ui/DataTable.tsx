import DynamicTable from "@atlaskit/dynamic-table";
import StatelessTable from "@atlaskit/dynamic-table/stateless";
import type { HeadType, RowType } from "@atlaskit/dynamic-table/types";
import EmptyState from "@atlaskit/empty-state";
import { useMessage, type MessageId } from "../i18n/messages";

export function DataTable({ title, head, rows, empty, sortable = false }: {
  title: MessageId; head: HeadType; rows: RowType[]; empty: MessageId; sortable?: boolean;
}) {
  const m = useMessage();
  if (!rows.length) return <EmptyState header={m(empty)} />;
  const Table = sortable ? DynamicTable : StatelessTable;
  return <div className="table-scroll" role="region" aria-label={m(title)} tabIndex={0}><Table head={{ ...head, cells: head.cells.map(cell => cell.isSortable ? { ...cell,
      ascendingSortTooltip: m("sortAscending"), descendingSortTooltip: m("sortDescending"),
      buttonAriaRoleDescription: m("sortColumn"),
    } : cell) }} rows={rows} label={m(title)} /></div>;
}
