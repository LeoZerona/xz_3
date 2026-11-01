export function compound(...parts: (string | number)[]): string {
  return parts.map((part) => encodeURIComponent(String(part))).join(':')
}
