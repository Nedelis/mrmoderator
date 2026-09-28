import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMaxBridge } from '../hooks/useMaxBridge';
import type { MenuItemPath } from '../types/api';

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
];

export default function Sidebar() {
    const { theme, toggleTheme } = useTheme();
    const { isInsideMax, platform, deviceName } = useMaxBridge();
    const { user, role, hasMenuItem } = useCurrentUser();

    const visibleItems = ALL_MENU_ITEMS.filter(item => hasMenuItem(item.path));

    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
        : '??';

    return (
        <aside className= "sidebar" >
        <div className="sidebar-brand" >
            <div className="sidebar-logo" >🤖</div>
                < div >
                <h1>VK Max Bot </h1>
                    < span > мини - приложение </span>
                    </div>
                    </div>

                    < nav className = "sidebar-nav" >
                    {
                        visibleItems.map(item => (
                            <NavLink
            key= { item.path }
            to = { item.path }
            end = { item.path === '/' }
            className = {({ isActive }) =>
                            `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
                        >
                        <span className="nav-icon" > { item.icon } </span>
                            < span > { item.label } </span>
                            </NavLink>
        ))
}
</nav>

    < div className = "sidebar-footer" >
        <button className="sidebar-action" onClick = { toggleTheme } >
            <span>{ theme === 'dark' ? '☀️' : '🌙'}</span>
                < span > { theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
                    </button>

                    < div className = "user-mini" >
                        <div className="user-avatar" > { initials } </div>
                            < div >
                            <p>{ user? `${user.firstName} ${user.lastName}` : 'Гость'}</p>
                                <span>
{ role?.shortLabel ?? '—' } · { user?.groupName ?? '—' }
</span>
    </div>
    </div>

{
    isInsideMax && (
        <div className="platform-badge" >
        { platform }
    { deviceName ? ` · ${deviceName}` : '' }
    </div>
        )
}
</div>
    </aside>
  );
}