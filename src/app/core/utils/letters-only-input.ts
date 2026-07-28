/** Strips digits and most symbols from a person-name `<input>` as the user
 *  types, keeping Arabic and Latin letters, spaces, and a couple of common
 *  name characters (apostrophe, hyphen). */
export function lettersOnlyInput(event: Event): string {
  const input = event.target as HTMLInputElement;
  const letters = input.value.replace(/[^A-Za-z؀-ۿ\s'-]/g, '');
  if (letters !== input.value) input.value = letters;
  return letters;
}
