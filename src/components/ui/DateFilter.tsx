import { DateInput } from "./DateInput";
import "./ui.css";

interface DateFilterProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** Sayfa başlığındaki tarih seçici (gün sonu, kapanış, rapor sayfaları). */
export function DateFilter({ id, label, value, onChange }: DateFilterProps) {
  return (
    <div className="ui-filter">
      <label htmlFor={id}>{label}</label>
      <DateInput id={id} value={value} onChange={onChange} />
    </div>
  );
}
