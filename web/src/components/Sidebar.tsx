import { NavLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useMaxBridge } from '../hooks/useMaxBridge';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { useRoles } from '../contexts/RolesContext';
import type { MenuItemPath } from '../types/api';

// Только описание пунктов — что показывать.
// Видимость определяется через hasMenuItem из контекста.
const ALL_MENU_ITEMS: { path: MenuItemPath; label: string; icon: string }[] = [
    { path: '/', label: 'Дашборд', icon: '🏠' },
    { path: '/my-stats', label: 'Личная статистика', icon: '📊' },
    { path: '/reminders', label: 'Напоминалки', icon: '🔔' },
    { path: '/debts', label: 'Долги', icon: '🔥' },
    { path: '/exams', label: 'Экзамены', icon: '📅' },
    { path: '/tasks', label: 'Задания', icon: '📝' },
    { path: '/materials', label: 'Материалы', icon: '📁' },
    { path: '/mail', label: 'Почта', icon: '✉️' },
    { path: '/roles', label: 'Роли', icon: '👥' },
    { path: '/settings', label: 'Настройки', icon: '⚙️' },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { isInsideMax, platform, deviceName } = useMaxBridge();
  const { user, role, hasMenuItem, setRoleForPreview } = useCurrentUser();
  const { roles } = useRoles();

  const visibleItems = ALL_MENU_ITEMS.filter(item => hasMenuItem(item.path));
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
    : '??';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">🤖</div>
        <div>
          <h1>VK Max Bot</h1>
          <span>мини-приложение</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-action" onClick={toggleTheme}>
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
        </button>

        {/* ВРЕМЕННЫЙ переключатель ролей. Роли приходят с бэка (GET /api/roles). */}
        <div className="role-switcher">
          <label>Роль (превью)</label>
          <select
            value={role?.id ?? ''}
            onChange={e => setRoleForPreview(e.target.value)}
            className="role-select"
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="user-mini">
          <div className="user-avatar">{initials}</div>
          <div>
            <p>
              {user ? `${user.firstName} ${user.lastName}` : 'Гость'}
            </p>
            <span>
              {role?.shortLabel ?? '—'} · {user?.groupName ?? '—'}
            </span>
          </div>
        </div>

        {isInsideMax && (
          <div className="platform-badge">
            {platform}
            {deviceName ? ` · ${deviceName}` : ''}
          </div>
        )}
      </div>
    </aside>
  );
}