// Хелперы для работы с датами. Всё хранится в ISO (YYYY-MM-DD или YYYY-MM-DDTHH:mm).

const MONTHS_RU = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** ISO → "15 мая 2026" */
export function formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

/** ISO → "15 мая 2026, 14:30" */
export function formatDateTime(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${formatDate(iso)}, ${hh}:${mm}`;
}

/** Сравнение по дням: true, если дата раньше сегодняшнего дня */
export function isOverdue(iso: string): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
}

/** Сколько дней до даты (отрицательное — просрочено) */
export function daysUntil(iso: string): number {
    if (!iso) return 0;
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Date → "YYYY-MM-DD" */
export function toISODate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** Сегодня в ISO (для input[type=date]) */
export function todayISO(): string {
    return toISODate(new Date());
}

/** Дата со сдвигом на N дней от сегодня в ISO */
export function isoPlusDays(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toISODate(d);
}