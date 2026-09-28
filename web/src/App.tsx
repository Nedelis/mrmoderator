import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import { useMaxBridge } from './hooks/useMaxBridge';
import { useRoles } from './contexts/RolesContext';
import { useCurrentUser } from './contexts/CurrentUserContext';

import Dashboard from './pages/Dashboard';
import MyStats from './pages/MyStats';
import Reminders from './pages/Reminders';
import Debts from './pages/Debts';
import Exams from './pages/Exams';
import Tasks from './pages/Tasks';
import Materials from './pages/Materials';
import Mail from './pages/Mail';
import Roles from './pages/Roles';
import NotRegistered from './pages/NotRegistered';

function RequireMenu({ path, children }: { path: string; children: React.ReactNode }) {
    const { hasMenuItem } = useCurrentUser();
    if (!hasMenuItem(path)) {
        return (
            <div style= {{ padding: 40, textAlign: 'center', color: 'var(--muted)' }
    }>
        🔒 Доступ к этому разделу ограничен
        </div>
    );
}
return <>{ children } </>;
}

export default function App() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const { isReady } = useMaxBridge();
    const { loading: rolesLoading, error: rolesError } = useRoles();
    const {
        loading: userLoading,
        error: userError,
        user,
        role,
    } = useCurrentUser();
    const location = useLocation();

    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    if (!isReady || rolesLoading || userLoading) {
        return (
            <div
        style= {{
            display: 'flex',
                alignItems: 'center',
                    justifyContent: 'center',
                        height: '100vh',
                            background: 'var(--bg)',
                                color: 'var(--text)',
                                    fontSize: 16,
        }
    }
      >
        Загрузка...
    </div>
    );
}

if (rolesError || userError) {
    return (
        <div style= {{ padding: 40, textAlign: 'center', color: 'var(--red)' }
}>
    Ошибка: { rolesError || userError }
</div>
    );
  }

// Если у юзера нет группы — показываем страницу 504
const notInGroup = !user || !user.groupId || user.groupId === '';

if (notInGroup) {
    return <NotRegistered />;
}

if (!role) {
    return (
        <div style= {{ padding: 40, textAlign: 'center', color: 'var(--muted)' }
}>
    Не удалось определить роль пользователя
        </div>
    );
  }

return (
    <div className= "app-layout" >
    <Sidebar />
    < MobileNav
open = { mobileNavOpen }
onClose = {() => setMobileNavOpen(false)}
onToggle = {() => setMobileNavOpen(prev => !prev)}
      />

    < main className = "main-content" >
        <Routes>
        <Route
            path="/"
element = {< RequireMenu path = "/" > <Dashboard /></RequireMenu >}
          />
    < Route
path = "/my-stats"
element = {< RequireMenu path = "/my-stats" > <MyStats /></RequireMenu >}
          />
    < Route
path = "/reminders"
element = {< RequireMenu path = "/reminders" > <Reminders /></RequireMenu >}
          />
    < Route
path = "/debts"
element = {< RequireMenu path = "/debts" > <Debts /></RequireMenu >}
          />
    < Route
path = "/exams"
element = {< RequireMenu path = "/exams" > <Exams /></RequireMenu >}
          />
    < Route
path = "/tasks"
element = {< RequireMenu path = "/tasks" > <Tasks /></RequireMenu >}
          />
    < Route
path = "/materials"
element = {< RequireMenu path = "/materials" > <Materials /></RequireMenu >}
          />
    < Route
path = "/mail"
element = {< RequireMenu path = "/mail" > <Mail /></RequireMenu >}
          />
    < Route
path = "/roles"
element = {< RequireMenu path = "/roles" > <Roles /></RequireMenu >}
          />
    < Route path = "*" element = {< Navigate to = "/" replace />} />
        </Routes>
        </main>
        </div>
  );
}