import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMaxBridge } from '../hooks/useMaxBridge';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import type { MenuItemPath } from '../types/api';

const ALL_MENU_ITEMS: { path: MenuItemPath; label: string; icon: string }[] = [
    { path: '/', label: 'Дашборд', icon: '🏠' },
    { path: '/my-stats', label: 'Личная статистика', icon: '📊' },
    { path: '/reminders', label: 'Напоминания', icon: '🔔' },
    { path: '/materials', label: 'Материалы', icon: '📁' },
    { path: '/mail', label: 'Почта', icon: '✉️' },
    { path: '/roles', label: 'Роли', icon: '👥' },
];

export default function Sidebar() {
    const { theme, toggleTheme } = useTheme();
    const { isInsideMax, platform, deviceName } = useMaxBridge();
    const { user, role, hasMenuItem, reload } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [leaving, setLeaving] = useState(false);

    const visibleItems = ALL_MENU_ITEMS.filter(item => hasMenuItem(item.path));

    const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}` : '??';

    const handleLeaveGroup = async () => {
        if (leaving) return;

        const confirmed = window.confirm(
            'Вы точно хотите покинуть группу?\n\n' +
                'Все ваши данные (долги, задания, напоминания, история) будут удалены без возможности восстановления.'
        );
        if (!confirmed) return;

        setLeaving(true);
        try {
            await api.leaveGroup();
            showToast('Вы вышли из группы', 'success');
            // Перечитываем пользователя — App увидит, что группы нет, и покажет 504
            await reload();
        } catch (err: any) {
            showToast(err?.message || 'Не удалось выйти из группы', 'error');
        } finally {
            setLeaving(false);
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo">🤖</div>
                <div>
                    <h1>Мистер Модератор</h1>
                    <span>мини-приложение</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {visibleItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
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

                <div className="user-mini">
                    <div className="user-avatar">{initials}</div>
                    <div>
                        <p>{user ? `${user.firstName} ${user.lastName}` : 'Гость'}</p>
                        <span>
                            {role?.shortLabel ?? '—'} · {user?.groupName ?? '—'}
                        </span>
                    </div>
                </div>

                <button
                    className="sidebar-action sidebar-action-danger"
                    onClick={handleLeaveGroup}
                    disabled={leaving || pending}
                    title="Удалить свои данные и выйти из группы"
                >
                    <span>🚪</span>
                    <span>{leaving ? 'Выходим...' : 'Покинуть группу'}</span>
                </button>

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
