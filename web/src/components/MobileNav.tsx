import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';
import { api } from '../api/client';
import type { MenuItemPath } from '../types/api';

interface MobileNavProps {
    open: boolean;
    onClose: () => void;
    onToggle: () => void;
}

const ALL_MENU_ITEMS: { path: MenuItemPath; label: string; icon: string }[] = [
    { path: '/', label: 'Дашборд', icon: '🏠' },
    { path: '/my-stats', label: 'Личная статистика', icon: '📊' },
    { path: '/reminders', label: 'Напоминания', icon: '🔔' },
    { path: '/materials', label: 'Материалы', icon: '📁' },
    { path: '/mail', label: 'Почта', icon: '✉️' },
    { path: '/roles', label: 'Роли', icon: '👥' },
];

export default function MobileNav({ open, onClose, onToggle }: MobileNavProps) {
    const { theme, toggleTheme } = useTheme();
    const { user, role, hasMenuItem, reload } = useCurrentUser();
    const { showToast } = useToast();

    const [leaving, setLeaving] = useState(false);

    const visibleItems = ALL_MENU_ITEMS.filter(item => hasMenuItem(item.path));

    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
        : '??';

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
            await reload();
            onClose();
        } catch (err: any) {
            showToast(err?.message || 'Не удалось выйти из группы', 'error');
        } finally {
            setLeaving(false);
        }
    };

    return (
        <>
        <button className= "mobile-menu-btn" onClick = { onToggle } >
        { open? '✕': '☰' }
            </button>

    { open && <div className="mobile-overlay" onClick = { onClose } />}

    <nav className={ `mobile-nav ${open ? 'open' : ''}` }>
        <div className="mobile-nav-header" >
            <h2>Меню </h2>
            < button onClick = { onClose } >✕</button>
                </div>

    {/* Навигация */ }
    <div className="mobile-nav-list" >
    {
        visibleItems.map(item => (
            <NavLink
              key= { item.path }
              to = { item.path }
              end = { item.path === '/' }
              className = {({ isActive }) =>
            `mobile-nav-item ${isActive ? 'active' : ''}`
              }
    onClick = { onClose }
        >
        <span>{ item.icon } </span>
        < span > { item.label } </span>
        </NavLink>
          ))
}
</div>

{/* Футер: тема, профиль, выход */ }
<div className="mobile-nav-footer" >
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

    < button
className = "sidebar-action sidebar-action-danger"
onClick = { handleLeaveGroup }
disabled = { leaving }
title = "Удалить свои данные и выйти из группы"
    >
    <span>🚪</span>
        < span > { leaving? 'Выходим...': 'Покинуть группу' } </span>
        </button>
        </div>
        </nav>
        </>
  );
}