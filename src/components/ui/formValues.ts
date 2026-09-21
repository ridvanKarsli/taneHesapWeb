export type FormValues = Record<string, string | boolean>;

/** Form değerlerini backend isteğine çevirirken kullanılan küçük dönüştürücüler. */
export const formValue = {
  text: (values: FormValues, name: string): string => String(values[name] ?? "").trim(),
  optionalText: (values: FormValues, name: string): string | null => formValue.text(values, name) || null,
  number: (values: FormValues, name: string): number => Number(String(values[name] ?? "").replace(",", ".")),
  optionalNumber: (values: FormValues, name: string): number | null =>
    formValue.text(values, name) === "" ? null : formValue.number(values, name),
  bool: (values: FormValues, name: string): boolean => values[name] === true,
};
