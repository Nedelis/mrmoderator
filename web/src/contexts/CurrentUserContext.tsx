import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../api/client';
import { useRoles } from './RolesContext';
import type { CurrentUser, Role, RoleId, Permission, MenuItemPath } from '../types/api';

interface CurrentUserContextValue {
  user: CurrentUser | null;
  role: Role | null;
  loading: boolean;
  error: string | null;
  /** Может ли текущий юзер делать действие */
  can: (permission: Permission) => boolean;
  /** Доступен ли пункт меню текущему юзеру */
  hasMenuItem: (path: MenuItemPath) => boolean;
  /** Может ли текущий юзер назначить роль `targetRoleId` */
  canAssign: (targetRoleId: RoleId) => boolean;
  /** Роли, которые текущий юзер может назначить */
  assignableRoles: Role[];
  /**
   * ВРЕМЕННО: смена роли локально (для дизайна).
   * Потом выпилим — роль будет приходить только с бэка.
   */
  setRoleForPreview: (roleId: RoleId) => void;
  /** Является ли текущая роль админской */
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
  // ВРЕМЕННО: локальный override роли для просмотра дизайна
  const [previewRoleId, setPreviewRoleId] = useState<RoleId | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await api.getMe();
      setUser(u);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить пользователя');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Реальная роль с бэка, либо временная для превью
  const effectiveRoleId = previewRoleId ?? user?.roleId ?? null;
  const role = effectiveRoleId ? rolesById[effectiveRoleId] ?? null : null;

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

            // Роль старосты нельзя выдать через UI — она фиксируется сервером
            if (target.id === 'starosta') return false;

            // Староста может назначать любую, кроме старосты
            if (role.id === 'starosta') return true;

            // Остальные — только роли ниже своего уровня
            return target.level < role.level;
        },
        [role, rolesById]
    );

  const assignableRoles = role
    ? roles.filter(r => canAssign(r.id))
    : [];

  const isAdmin = role?.level ? role.level >= 3 : false;

  return (
    <CurrentUserContext.Provider
      value={{
        user,
        role,
        loading,
        error,
        can,
        hasMenuItem,
        canAssign,
        assignableRoles,
        setRoleForPreview: setPreviewRoleId,
        isAdmin,
        reload: load,
      }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider');
  return ctx;
}