import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { formatDate, daysUntil } from '../utils/date';
import type { Student, Debt, Reminder } from '../types/api';

type DebtDisplayStatus = 'overdue' | 'soon' | 'active' | 'closed';

function computeDebtStatus(d: Debt): DebtDisplayStatus {
    if (d.status === 'closed') return 'closed';
    const days = daysUntil(d.deadline);
    if (days < 0) return 'overdue';
    if (days <= 3) return 'soon';
    return 'active';
}

const STATUS_LABEL: Record<DebtDisplayStatus, string> = {
    overdue: 'Просрочен',
    soon: 'Скоро',
    active: 'Активен',
    closed: 'Закрыт',
};

const STATUS_CLASS: Record<DebtDisplayStatus, string> = {
    overdue: 'tag-red',
    soon: 'tag-yellow',
    active: 'tag-blue',
    closed: 'tag-green',
};

export default function MyStats() {
    const { user } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [me, setMe] = useState<Student | null>(null);
    const [myDebts, setMyDebts] = useState<Debt[]>([]);
    const [myReminders, setMyReminders] = useState<Reminder[]>([]);

    const load = () => {
        Promise.all([api.getStudents(), api.getDebts(), api.getReminders()]).then(
            ([students, debts, reminders]) => {
                const fullName = user ? `${user.firstName} ${user.lastName}` : '';
                const found =
                    students.find(s => fullName.includes(s.name)) ||
                    students.find(s => s.name.includes(user?.firstName ?? '')) ||
                    null;

                setMe(found);
                setMyDebts(found ? debts.filter(d => d.studentName === found.name) : []);
                setMyReminders(reminders.filter(r => r.type === 'personal'));
            }
        );
    };

    useEffect(() => {
        load();
    }, [user]);

    const handleRemindMe = (r: Reminder) => {
        run(() => api.remindReminder(r.id), {
            successMessage: 'Напоминание отправлено вам в личные сообщения',
            errorMessage: 'Ошибка отправки',
        });
    };

    const activeDebts = myDebts.filter(d => computeDebtStatus(d) !== 'closed');
    const overdueCount = myDebts.filter(d => computeDebtStatus(d) === 'overdue').length;
    const soonCount = myDebts.filter(d => computeDebtStatus(d) === 'soon').length;

    return (
        <PageWrapper
      title= "Личная статистика"
    subtitle = { me? `${me.name} · ${user?.groupName}` : 'Мои показатели'
}
actions = {
        < button className = "btn btn-ghost" onClick = { load } disabled = { pending } >
{ pending? '⏳ Обновляем...': '🔄 Обновить' }
    </button>
      }
    >
{/* KPI — только по долгам */ }
    < div className = "grid grid-3" style = {{ marginBottom: 20 }}>
        <div className="card" >
            <div
            className="kpi-value"
style = {{ color: activeDebts.length > 0 ? 'var(--red)' : 'var(--green)' }}
          >
{ activeDebts.length }
    </div>
    < div className = "kpi-label" > Активных долгов </div>
        </div>
        < div className = "card" >
            <div className="kpi-value" style = {{ color: 'var(--red)' }}>
            { overdueCount }
                </div>
                < div className = "kpi-label" > Просрочено </div>
                    </div>
                    < div className = "card" >
                        <div className="kpi-value" style = {{ color: 'var(--yellow)' }}>
                        { soonCount }
                            </div>
                            < div className = "kpi-label" > Скоро дедлайн </div>
                                </div>
                                </div>

{/* Мои долги + Мои напоминалки */ }
<div className="grid grid-2" >
    <div className="card" >
        <div className="card-header" >
            <h3>🔥 Мои долги </h3>
                < Link to = "/debts" className = "link" >
                    Все →
</Link>
    </div>
{
    myDebts.length === 0 ? (
        <div
              style= {{
        padding: 30,
            textAlign: 'center',
                color: 'var(--muted)',
                    fontSize: 13,
              }
}
            >
              🎉 Долгов нет, так держать!
    </div>
          ) : (
    <table className= "table" >
    <thead>
    <tr>
    <th>Предмет </th>
    < th > Тип </th>
    < th > Дедлайн </th>
    < th > Статус </th>
    </tr>
    </thead>
    <tbody>
{
    myDebts.map(d => {
        const st = computeDebtStatus(d);
        return (
            <tr key= { d.id } >
            <td>{ d.subject } </td>
            < td > { d.type } </td>
            < td > { formatDate(d.deadline)
} </td>
    < td >
    <span className={ `tag ${STATUS_CLASS[st]}` }>
    { STATUS_LABEL[st]}
        </span>
        </td>
        </tr>
                  );
                })}
</tbody>
    </table>
          )}
</div>

    < div className = "card" >
        <div className="card-header" >
            <h3>🔔 Мои напоминалки </h3>
                < Link to = "/reminders" className = "link" >
                    Все →
</Link>
    </div>
{
    myReminders.length === 0 ? (
        <div
              style= {{
        padding: 30,
            textAlign: 'center',
                color: 'var(--muted)',
                    fontSize: 13,
              }
}
            >
    Нет активных личных напоминалок
        </div>
          ) : (
    myReminders.map(r => {
        const days = daysUntil(r.deadline);
        const cls = days < 0 ? 'red' : days <= 1 ? 'yellow' : 'blue';
        return (
            <div key= { r.id } className = "reminder-item" >
                <div className={ `reminder-icon ${cls}` }>📌</div>
                    < div className = "reminder-content" style = {{ flex: 1 }
    }>
    <div className="title" > { r.title } </div>
    < div className = "desc" > { r.description } </div>
    < div className = "meta" >
    <span>🕐 { formatDate(r.deadline)}</span>
        </div>
        </div>
        < button
className = "btn btn-ghost"
style = {{ padding: '8px 12px' }}
onClick = {() => handleRemindMe(r)}
disabled = { pending }
title = "Напомнить себе"
    >
                    🔔
</button>
    </div>
              );
            })
          )}
</div>
    </div>
    </PageWrapper>
  );
}