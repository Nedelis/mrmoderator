// ============================================================
// ТИПЫ ДАННЫХ, КОТОРЫЕ ПРИХОДЯТ С БЭКЕНДА
// ============================================================

export type RoleId = string;       // бэк решает, какие id — сейчас 'starosta', 'zam' и т.д.
export type MenuItemPath = string; // путь пункта меню, например '/settings'
export type Permission = string;   // право, например 'material.upload'

/** Описание одной роли — приходит с бэка */
export interface Role {
  id: RoleId;
  label: string;           // «Староста»
  shortLabel: string;      // «Староста»
  description: string;     // «Полный доступ...»
  level: number;           // 4 > 3 > 2 > 1
  badgeClass: string;      // CSS-класс: 'role-starosta'
  badgeIcon: string;       // '👑'
  badgeText: string;       // 'Высшая'
  menu: MenuItemPath[];    // какие пункты меню доступны
  permissions: Permission[]; // какие действия разрешены
}

/** Текущий пользователь — приходит с бэка */
export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photoUrl?: string;
  groupId: string;
  groupName: string;       // 'ИУ7-42Б'
  roleId: RoleId;          // ссылка на Role.id
}

/** Ответ на GET /api/roles */
export interface RolesResponse {
  roles: Role[];
}

/** Ответ на GET /api/me */
export interface MeResponse {
  user: CurrentUser;
}