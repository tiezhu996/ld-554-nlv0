export function money(value: number | string) {
  return Number(value).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' });
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
