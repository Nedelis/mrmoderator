import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import type { MenuItemPath } from '../types/api';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
}

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

export default function MobileNav({ open, onClose, onToggle }: MobileNavProps) {
  const { hasMenuItem } = useCurrentUser();
  const visibleItems = ALL_MENU_ITEMS.filter(item => hasMenuItem(item.path));

  return (
    <>
      <button className="mobile-menu-btn" onClick={onToggle}>
        {open ? '✕' : '☰'}
      </button>

      {open && <div className="mobile-overlay" onClick={onClose} />}

      <nav className={`mobile-nav ${open ? 'open' : ''}`}>
        <div className="mobile-nav-header">
          <h2>Меню</h2>
          <button onClick={onClose}>✕</button>
        </div>
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `mobile-nav-item ${isActive ? 'active' : ''}`
            }
            onClick={onClose}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}