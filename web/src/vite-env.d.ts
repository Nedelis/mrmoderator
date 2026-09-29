/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Базовый URL бэкенда. Например: http://localhost:8000/api */
    readonly VITE_API_BASE: string;

    /** Флаг использования моков. Строка "true" или "false". */
    readonly VITE_USE_API_MOCK: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
