/** True for MySQL's duplicate-key error (ER_DUP_ENTRY), also when wrapped by Drizzle. */
export function isDuplicateKeyError(error: unknown): boolean {
  for (let e: unknown = error; e; e = (e as { cause?: unknown }).cause) {
    const err = e as { code?: string; errno?: number };
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) return true;
  }
  return false;
}
