import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { api, NotRegisteredError } from '../api/client';
import { useRoles } from './RolesContext';
import type {
    CurrentUser,
    Role,
    RoleId,
    Permission,
    MenuItemPath,
} from '../types/api';

interface CurrentUserContextValue {
    user: CurrentUser | null;
    role: Role | null;
    loading: boolean;
    error: string | null;
    /** Показывать страницу 504 — юзер не привязан к группе */
    needsOnboarding: boolean;
    /** Есть ли у текущего юзера право */
    can: (permission: Permission) => boolean;
    /** Доступен ли пункт меню */
    hasMenuItem: (path: MenuItemPath) => boolean;
    /** Может ли текущий юзер назначить роль */
    canAssign: (targetRoleId: RoleId) => boolean;
    /** Роли, которые доступны для назначения */
    assignableRoles: Role[];
    /** Админ ли текущий юзер */
    isAdmin: boolean;
    /** Перезагрузить юзера */
    reload: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
    const { rolesById, roles } = useRoles();
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNeedsOnboarding(false);
        try {
            const u = await api.getMe();
            setUser(u);
        } catch (e: any) {
            if (e instanceof NotRegisteredError) {
                setNeedsOnboarding(true);
                setUser(null);
            } else {
                setError(e?.message || 'Не удалось загрузить пользователя');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const role = user?.roleId ? rolesById[user.roleId] ?? null : null;

    const can = useCallback(
        (permission: Permission) => {
            if (!role) return false;
            return role.permissions.includes(permission);
        },
        [role]
    );

    const hasMenuItem = useCallback(
        (path: MenuItemPath) => {
            if (!role) return false;
            return role.menu.includes(path);
        },
        [role]
    );

    const canAssign = useCallback(
        (targetRoleId: RoleId) => {
            if (!role) return false;
            const target = rolesById[targetRoleId];
            if (!target) return false;

            // Староста может назначать любую, кроме старосты
            if (role.id === 'starosta') return true;

            // Остальные — только роли ниже своего уровня
            return target.level < role.level;
        },
        [role, rolesById]
    );

    const assignableRoles = role ? roles.filter(r => canAssign(r.id)) : [];
    const isAdmin = role?.level ? role.level >= 3 : false;

    return (
        <CurrentUserContext.Provider
      value= {{
        user,
            role,
            loading,
            error,
            needsOnboarding,
            can,
            hasMenuItem,
            canAssign,
            assignableRoles,
            isAdmin,
            reload: load,
      }
}
    >
{ children }
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
    const ctx = useContext(CurrentUserContext);
    if (!ctx) {
        throw new Error('useCurrentUser must be used within CurrentUserProvider');
    }
    return ctx;
}