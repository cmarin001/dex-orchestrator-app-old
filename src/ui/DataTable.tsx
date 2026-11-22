import desk from "../desk.module.css";
import DynamicTable from "@atlaskit/dynamic-table";
import type { HeadType, RowType } from "@atlaskit/dynamic-table/types";
import EmptyState from "@atlaskit/empty-state";
import { Stack, Text } from "@atlaskit/primitives";
import { useMessage, type MessageId } from "../i18n/messages";
import { SortOptions, useSortOrder } from "./SortOptions";
import { useMobile } from "../lib/useMedia";

export function DataTable({ title, head, rows, empty, sortable = false, cards = false }: {
  title: MessageId; head: HeadType; rows: RowType[]; empty: MessageId; sortable?: boolean; cards?: boolean;
}) {
  const m = useMessage();
  const mobile = useMobile();
  const sorting = useSortOrder<RowType>();
  const columns = { ...head, cells: head.cells.map(cell => ({
    ...cell, isSortable: sortable && cell.isSortable,
    ascendingSortTooltip: m("sortAscending"), descendingSortTooltip: m("sortDescending"),
    buttonAriaRoleDescription: m("sortColumn"),
  })) };
  if (cards && mobile) {
    const indices = head.cells.flatMap((cell, index) => cell.isSortable && typeof cell.content === "string" ? [{ index, label: cell.content, value: String(index) }] : []);
    const shown = sorting.sort(rows, Object.fromEntries(indices.map(item => [item.value, (row: RowType) => {
      const key = row.cells[item.index]?.key;
      return typeof key === "number" || typeof key === "string" ? key : undefined;
    }])));
    return <Stack space="space.150">
    {sortable && rows.length > 1 && indices.length > 0 && <SortOptions {...sorting} options={indices} />}
      {rows.length ? <Stack as="ul" space="space.150">{shown.map((row, index) => <li className={desk["record-card"]} key={row.key ?? index}>
        <dl>{row.cells.map((cell, column) => <div key={column}>
          <dt><Text color="color.text.subtle">{head.cells[column]?.content}</Text></dt>
          <dd>{cell.content}</dd>
        </div>)}</dl>
      </li>)}</Stack> : <EmptyState header={m(empty)} />}
  </Stack>;
  }
  return <div className={desk["table-scroll"]} role="region" aria-label={m(title)} tabIndex={0}>
    <DynamicTable head={columns} rows={rows} label={m(title)} emptyView={<EmptyState header={m(empty)} />} />
  </div>;
}
