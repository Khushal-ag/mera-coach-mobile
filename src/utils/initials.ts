/** First letters of up to `max` words — avatars and coach list placeholders. */
export function nameInitials(name: string, max = 2): string {
  return name
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, max)
    .join('')
    .toUpperCase();
}
