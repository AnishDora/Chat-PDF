export const SOURCE_TYPES = ['pdf', 'url', 'screenshot'] as const;
export type SourceType = typeof SOURCE_TYPES[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  pdf: 'PDF',
  url: 'URL',
  screenshot: 'Screenshot',
};

export const isSourceType = (value: unknown): value is SourceType =>
  typeof value === 'string' && (SOURCE_TYPES as readonly string[]).includes(value);
