/** First value of a search param (Next.js gives string | string[] | undefined). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
