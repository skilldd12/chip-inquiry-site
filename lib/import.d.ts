export const TEMPLATE_HEADERS: string[];
export function parseCsv(text: string): string[][];
export function readTable(
  buffer: Buffer,
  filename: string
): Promise<{ headers: string[]; rows: Record<string, any>[]; formulas: number }>;
export function buildTemplate(): Promise<Buffer>;
export function buildErrorWorkbook(rows: any[]): Promise<Buffer>;
