// Простые валидаторы. Каждый возвращает строку с ошибкой или null.

export type Rule = (v: any) => string | null;

export const rules = {
    required:
        (msg = 'Обязательное поле'): Rule =>
        (v: any) => {
            if (v === null || v === undefined) return msg;
            if (typeof v === 'string' && !v.trim()) return msg;
            return null;
        },

    minLen:
        (n: number, msg?: string): Rule =>
        (v: any) => {
            if (typeof v !== 'string' || v.trim().length < n) {
                return msg ?? `Минимум ${n} символов`;
            }
            return null;
        },

    maxLen:
        (n: number, msg?: string): Rule =>
        (v: any) => {
            if (typeof v === 'string' && v.trim().length > n) {
                return msg ?? `Максимум ${n} символов`;
            }
            return null;
        },

    date:
        (opts?: { minYearOffset?: number; maxYearOffset?: number; msg?: string }): Rule =>
        (v: any) => {
            const msg = opts?.msg ?? 'Укажите дату';
            if (!v || typeof v !== 'string') return msg;

            const d = new Date(v);
            if (isNaN(d.getTime())) return 'Неверный формат даты';

            const min = opts?.minYearOffset;
            const max = opts?.maxYearOffset;
            if (min !== undefined || max !== undefined) {
                const currentYear = new Date().getFullYear();
                const minYear = currentYear + (min ?? -Infinity);
                const maxYear = currentYear + (max ?? Infinity);
                const y = d.getFullYear();
                if (y < minYear || y > maxYear) {
                    if (minYear === maxYear) return `Год должен быть ${minYear}`;
                    return `Год должен быть от ${minYear} до ${maxYear}`;
                }
            }
            return null;
        },

    time:
        (msg = 'Укажите время'): Rule =>
        (v: any) => {
            if (!v || typeof v !== 'string') return msg;
            return /^\d{2}:\d{2}$/.test(v) ? null : 'Формат ЧЧ:ММ';
        },
};

export function validate(value: any, checks: Rule[]): string | null {
    for (const check of checks) {
        const err = check(value);
        if (err) return err;
    }
    return null;
}

/**
 * Прогоняет объект по схеме { field: [rules] } и возвращает { field: error }.
 * Ошибки — всегда Record<string, string>, чтобы можно было дописать что угодно.
 */
export function validateObject<T extends object>(
    values: T,
    schema: Partial<Record<keyof T, Rule[]>>
): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const key in schema) {
        const checks = schema[key];
        if (!checks) continue;
        const err = validate((values as any)[key], checks);
        if (err) errors[key] = err;
    }
    return errors;
}
