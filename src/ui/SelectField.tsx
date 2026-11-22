import Select from "@atlaskit/select";
import { Stack } from "@atlaskit/primitives";
import { useMessage, type MessageId } from "../i18n/messages";

type Option<V extends string> = { label: string; value: V };

export function SelectField<V extends string>({ id, label, value, options, onChange }: {
  id: string; label: MessageId; value: V; options: Option<V>[]; onChange: (value: V) => void;
}) {
  const m = useMessage();
  return <Stack space="space.050">
    <label htmlFor={id}>{m(label)}</label>
    <Select inputId={id} options={options} value={options.find(option => option.value === value)}
      onChange={option => { if (option) onChange(option.value); }} isSearchable={false}
      noOptionsMessage={() => m("noOptions")} placeholder={m("choose")}
      screenReaderStatus={({ count }) => m("selectResults", { count })}
      ariaLiveMessages={{ guidance: () => m("selectGuidance"), onChange: ({ label }) => m("selectedOption", { label }),
        onFocus: ({ label }) => label, onFilter: ({ resultsMessage }) => resultsMessage }} />
  </Stack>;
}
