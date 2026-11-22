import { useId, useState } from "react";
import Button from "@atlaskit/button/new";
import { Inline } from "@atlaskit/primitives";
import { useMessage, type MessageId } from "../i18n/messages";
import { SelectField } from "./SelectField";

export function useSortOrder<T>() {
  const [field, setField] = useState("");
  const [descending, setDescending] = useState(false);
  const sort = (rows: readonly T[], fields: Record<string, (row: T) => string | number | undefined>) => {
    if (!fields[field]) return rows;
    return [...rows].sort((a, b) => {
      const aValue = fields[field](a), bValue = fields[field](b);
      if (aValue === undefined) return bValue === undefined ? 0 : 1;
      if (bValue === undefined) return -1;
      const compared = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue : String(aValue).localeCompare(String(bValue));
      return descending ? -compared : compared;
    });
  };
  return { field, setField, descending, setDescending, sort };
}

export function SortOptions({ options, field, setField, descending, setDescending }: {
  options: { label: string; value: string }[]; field: string; setField: (value: string) => void;
  descending: boolean; setDescending: (value: boolean) => void;
}) {
  const id = useId();
  const m = useMessage();
  return <Inline alignBlock="end" space="space.100" shouldWrap>
    <SelectField id={id} label="order" value={field} onChange={setField} options={[{ label: m("automatic"), value: "" }, ...options]} />
    {field && <Button appearance="subtle" onClick={() => setDescending(!descending)}>
      {m(descending ? "sortDescending" : "sortAscending")}
    </Button>}
  </Inline>;
}

export function useSortOptions(fields: readonly MessageId[]) {
  const m = useMessage();
  return fields.map(value => ({ label: m(value), value }));
}
