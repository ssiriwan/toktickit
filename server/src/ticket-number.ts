export function toDateStamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function nextTicketNumber(seq: number, date: Date = new Date()): string {
  // seq is the 1-based sequence for the day
  return `TK-${toDateStamp(date)}-${String(seq).padStart(4, '0')}`;
}