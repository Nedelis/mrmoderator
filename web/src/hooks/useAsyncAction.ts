import { useState, useCallback } from 'react';
import { useToast } from '../components/Toast';

/**
 * Оборачивает асинхронное действие: показывает состояние загрузки,
 * ловит ошибки, показывает тосты успеха/ошибки.
 */
export function useAsyncAction() {
    const { showToast } = useToast();
    const [pending, setPending] = useState(false);

    const run = useCallback(
        async <T,>(
            fn: () => Promise<T>,
            options?: {
                successMessage?: string;
                errorMessage?: string;
                onSuccess?: (result: T) => void;
            }
        ): Promise<T | null> => {
            setPending(true);
            try {
                const result = await fn();
                if (options?.successMessage) {
                    showToast(options.successMessage, 'success');
                }
                options?.onSuccess?.(result);
                return result;
            } catch (err: any) {
                showToast(options?.errorMessage || err.message || 'Ошибка', 'error');
                return null;
            } finally {
                setPending(false);
            }
        },
        [showToast]
    );

    return { pending, run };
}