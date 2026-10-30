import { useTranslation } from "../../i18n/LanguageProvider";
interface Props {
  input: string;
  output: string;
  onChange: (input: string) => void;
  inputLabel: string;
  placeholder: string;
  outputPlaceholder: string;
}
export default function TextEditors({
  input,
  output,
  onChange,
  inputLabel,
  placeholder,
  outputPlaceholder,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="editor-grid">
      <label className="editor-card">
        <span className="editor-label">
          <b>{t(inputLabel)}</b>
          <small>
            {input.length.toLocaleString()} {t("characters")}
          </small>
        </span>
        <textarea
          value={input}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
      </label>
      <label className="editor-card">
        <span className="editor-label">
          <b>{t("Result")}</b>
          <small>
            {output.length.toLocaleString()} {t("characters")}
          </small>
        </span>
        <textarea
          value={output}
          readOnly
          placeholder={t(outputPlaceholder)}
          spellCheck={false}
        />
      </label>
    </div>
  );
}
