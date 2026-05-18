export const TEMPLATE_VARIABLES = ['contactName', 'phonebankerName'] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export const TEMPLATE_PLACEHOLDERS: Record<TemplateVariable, string> = {
  contactName: 'their name',
  phonebankerName: 'your name',
};

export function variableToken(variable: TemplateVariable): string {
  return `{${variable}}`;
}

export function interpolate(
  template: string,
  values: Partial<Record<TemplateVariable, string>>,
): string {
  return TEMPLATE_VARIABLES.reduce((acc, variable) => {
    const value = values[variable] ?? TEMPLATE_PLACEHOLDERS[variable];
    return acc.replaceAll(variableToken(variable), value);
  }, template);
}
