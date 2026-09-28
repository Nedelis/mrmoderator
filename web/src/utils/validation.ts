// Простые валидаторы. Каждый возвращает строку с ошибкой или null.

export const rules = {
    required: (msg = 'Обязательное поле') => (v: unknown) => {
        if (v === null || v === undefined) return msg;
        if (typeof v === 'string' && !v.trim()) return msg;
        return null;
    },

    minLen: (n: number, msg?: string) => (v: string) => {
        if (!v || v.trim().length < n) return msg ?? `Минимум ${n} символов`;
        return null;
    },

    maxLen: (n: number, msg?: string) => (v: string) => {
        if (v && v.trim().length > n) return msg ?? `Максимум ${n} символов`;
        return null;
    },

    /**
     * Валидация даты. Опционально — ограничение по году.
     * minYearOffset: минимальный сдвиг года от текущего (0 = текущий)
     * maxYearOffset: максимальный сдвиг года от текущего (1 = следующий)
     */
    date: (opts?: { minYearOffset?: number; maxYearOffset?: number; msg?: string }) =>
        (v: string) => {
            const msg = opts?.msg ?? 'Укажите дату';
            if (!v) return msg;
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

    time: (msg = 'Укажите время') => (v: string) => {
        if (!v) return msg;
        return /^\d{2}:\d{2}$/.test(v) ? null : 'Формат ЧЧ:ММ';
    },
};

export function validate(
    value: unknown,
    checks: Array<(v: unknown) => string | null>
): string | null {
    for (const check of checks) {
        const err = check(value);
        if (err) return err;
    }
    return null;
}

export function validateObject<T extends Record<string, unknown>>(
    values: T,
    schema: Partial<Record<keyof T, Array<(v: unknown) => string | null>>>
): Partial<Record<keyof T, string>> {
    const errors: Partial<Record<keyof T, string>> = {};
    for (const key in schema) {
        const checks = schema[key];
        if (!checks) continue;
        const err = validate(values[key], checks);
        if (err) errors[key] = err;
    }
    return errors;
}