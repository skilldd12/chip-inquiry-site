export function notifySales(
  inquiry: Record<string, any>,
  config: Record<string, any>
): Promise<{ status: string; detail: string }>;
