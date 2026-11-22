import { useId } from "react";
import Toggle from "@atlaskit/toggle";
import { Inline, Stack } from "@atlaskit/primitives";
import { useLocale } from "../../i18n/useLocale";
import { useMessage, type MessageId } from "../../i18n/messages";
import { useMode } from "../../modes/ModeContext";
import { useTheme } from "../../theme/useTheme";
import { SelectField } from "../../ui/SelectField";

function Preference<V extends string>({ id, label, value, choices, onChange }: {
  id: string; label: MessageId; value: V; choices: readonly V[]; onChange: (value: V) => void;
}) {
  const m = useMessage();
  const options = choices.map(choice => ({ value: choice, label: m(choice as MessageId) }));
  return <SelectField id={id} label={label} value={value} options={options} onChange={onChange} />;
}
export default function Preferences({ section = "all" }: { section?: "all" | "appearance" | "language" }) {
  const id = useId();
  const m = useMessage();
  const { mode, setMode } = useMode();
  const { locale, setLocale } = useLocale();
  const { mode: theme, setMode: setTheme } = useTheme();
  return <Stack space="space.200">
    {section !== "language" && <Inline space="space.100" alignBlock="center">
      <Toggle id={id + "mode"} isChecked={mode === "expert"} onChange={event => setMode(event.currentTarget.checked ? "expert" : "simple")} />
      <label htmlFor={id + "mode"}>{m("expertMode")}</label>
    </Inline>}
    {section !== "appearance" && <Preference id={id + "locale"} label="language" value={locale === "en" ? "english" : "spanish"}
      choices={["english", "spanish"]} onChange={choice => setLocale(choice === "spanish" ? "es" : "en")} />}
    {section !== "language" && <Preference id={id + "theme"} label="theme" value={theme} choices={["light", "dark", "auto"]} onChange={setTheme} />}
  </Stack>;
}
