import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import type { Role, RoleId } from '../types/api';

interface RolesContextValue {
    roles: Role[];
    rolesById: Record<RoleId, Role>;
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
}

const RolesContext = createContext<RolesContextValue | null>(null);

export function RolesProvider({ children }: { children: ReactNode }) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getRoles();
            setRoles(data);
        } catch (e: any) {
            setError(e.message || 'Не удалось загрузить роли');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const rolesById = roles.reduce<Record<RoleId, Role>>((acc, r) => {
        acc[r.id] = r;
        return acc;
    }, {});

    return (
        <RolesContext.Provider value={{ roles, rolesById, loading, error, reload: load }}>
            {children}
        </RolesContext.Provider>
    );
}

export function useRoles() {
    const ctx = useContext(RolesContext);
    if (!ctx) throw new Error('useRoles must be used within RolesProvider');
    return ctx;
}
