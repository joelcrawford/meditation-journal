const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function getLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPreviousDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  const py = prev.getFullYear();
  const pm = String(prev.getMonth() + 1).padStart(2, '0');
  const pd = String(prev.getDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDisplayDate(): string {
  const now = new Date();
  return `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

export function getDayCount(startDate: number): number {
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const startMs = new Date(startDate * 1000).setHours(0, 0, 0, 0);
  return Math.floor((todayMs - startMs) / 86400000) + 1;
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function formatDateShort(ts: number): string {
  const d = new Date(ts * 1000);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function formatDateRange(startTs: number, endTs?: number): string {
  const start = formatDateShort(startTs);
  if (!endTs) return `${start} – present`;
  return `${start} – ${formatDateShort(endTs)}`;
}

export function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
