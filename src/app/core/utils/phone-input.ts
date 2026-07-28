/** Strips any non-digit character from a phone-number `<input>` as the user
 *  types (type="tel" + inputmode="numeric" only affect mobile keyboards —
 *  a physical/desktop keyboard can still type letters straight into the
 *  field). Mutates the DOM value for immediate visual feedback and returns
 *  the cleaned digits for the caller to push into a form control or filter. */
export function digitsOnlyInput(event: Event): string {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, '');
  if (digits !== input.value) input.value = digits;
  return digits;
}
