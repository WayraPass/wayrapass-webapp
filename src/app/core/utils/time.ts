export function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function fromMinutes(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function durationBetween(first: string, last: string): number | null {
  const start = toMinutes(first);
  const end = toMinutes(last);
  if (start === null || end === null || end < start) return null;
  return end - start;
}
