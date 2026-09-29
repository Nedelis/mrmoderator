import { useState, useEffect } from 'react';

// ==== Типы (по документации dev.max.ru/docs/webapps/bridge) ====

export interface MaxInitDataUnsafe {
    query_id: string;
    ip?: string;
    auth_date: number;
    hash: string;
    user: {
        id: number;
        first_name: string;
        last_name: string;
        username: string;
        language_code: string;
        photo_url: string;
    };
    chat: {
        id: number;
        type: 'DIALOG' | 'CHAT' | 'CHANNEL';
    };
    start_param: string;
}

export type MaxPlatform = 'ios' | 'android' | 'desktop' | 'web';

interface MaxBackButton {
    show: () => void;
    hide: () => void;
    isVisible: boolean;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
}

interface MaxHapticFeedback {
    impactOccurred: (
        style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft',
        disableVibrationFallback?: boolean
    ) => void;
    notificationOccurred: (
        type: 'error' | 'success' | 'warning',
        disableVibrationFallback?: boolean
    ) => void;
    selectionChanged: (disableVibrationFallback?: boolean) => void;
}

interface MaxDeviceStorage {
    setItem: (key: string, value: string) => void;
    getItem: (key: string) => string | null;
    removeItem: (key: string) => void;
    clear: () => void;
}

interface MaxWebApp {
    initData: string;
    initDataUnsafe: MaxInitDataUnsafe;
    platform: MaxPlatform;
    version: string;
    deviceName: string;

    getViewportSize: () => Promise<{ height: string; width: string }>;
    getLaunchContext: () => Promise<{ entryPoint: 'tabbar' | 'default' }>;

    BackButton: MaxBackButton;
    HapticFeedback: MaxHapticFeedback;
    DeviceStorage: MaxDeviceStorage;

    openLink: (url: string) => void;
    openMaxLink: (url: string) => void;
    downloadFile: (url: string, fileName: string) => void;

    enableClosingConfirmation: () => void;
    disableClosingConfirmation: () => void;

    requestContact: () => Promise<{ phone: string; authDate: string; hash: string }>;
}

declare global {
    interface Window {
        WebApp?: MaxWebApp;
    }
}

// ==== Хук ====

export function useMaxBridge() {
    const [isReady, setIsReady] = useState(false);
    const [isInsideMax, setIsInsideMax] = useState(false);
    const [platform, setPlatform] = useState<MaxPlatform>('web');
    const [deviceName, setDeviceName] = useState<string>('');
    const [initDataUnsafe, setInitDataUnsafe] = useState<MaxInitDataUnsafe | null>(null);

    useEffect(() => {
        const webApp = window.WebApp;

        // Открыто вне MAX (dev в браузере) — просто включаем fallback
        if (!webApp || !webApp.initData) {
            console.warn('[MAX Bridge] WebApp недоступен или открыт вне MAX. Dev-режим.');
            setIsReady(true);
            setIsInsideMax(false);
            return;
        }

        setIsInsideMax(true);
        setPlatform(webApp.platform || 'web');
        setDeviceName(webApp.deviceName || '');
        setInitDataUnsafe(webApp.initDataUnsafe || null);

        // Кнопка «Назад» — показываем всегда, чтобы юзер мог выйти из раздела
        const handleBack = () => window.history.back();
        try {
            webApp.BackButton.show();
            webApp.BackButton.onClick(handleBack);
        } catch (e) {
            console.warn('[MAX Bridge] BackButton error:', e);
        }

        // Подгоняем высоту приложения под viewport MAX
        try {
            webApp.getViewportSize().then(({ height }) => {
                if (height) document.documentElement.style.setProperty('--max-vh', height);
            });
        } catch (e) {
            console.warn('[MAX Bridge] getViewportSize error:', e);
        }

        setIsReady(true);

        return () => {
            try {
                webApp.BackButton.offClick(handleBack);
            } catch (e) {
                /* ignore */
            }
        };
    }, []);

    // Хелпер: безопасно дёрнуть haptic
    const haptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
        try {
            window.WebApp?.HapticFeedback?.impactOccurred(style);
        } catch (e) {
            /* ignore */
        }
    };

    return {
        isReady,
        isInsideMax,
        platform,
        deviceName,
        initDataUnsafe,
        haptic,
    };
}
