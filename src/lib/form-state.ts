/** What a form's server action returns, so the form can show errors and keep the user's input. */
export type FormState = {
  error?: string;
  /** Needs confirmation (duplicate phone, very large amount); the form offers "Save anyway". */
  warning?: string;
  /** Set when the action finished and the form can close. */
  done?: boolean;
  values?: Record<string, string>;
};

export function formValues(formData: FormData, fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? '')]));
}
