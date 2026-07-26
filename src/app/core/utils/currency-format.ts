/** Shared amount formatter — every screen that shows a salary/payslip figure
 *  should go through this instead of formatting the number on its own, so a
 *  bare amount is never shown without the currency it's actually in. */
export function formatCurrencyAmount(amount: number | null | undefined, symbol?: string | null): string {
  const num = (amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol ? `${num} ${symbol}` : num;
}
