/** The outcome of a player action that the rules may refuse, with a reason the UI can show. */
export type Result<T, E extends string> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value };
}

export function fail<E extends string>(error: E): { readonly ok: false; readonly error: E } {
  return { ok: false, error };
}
