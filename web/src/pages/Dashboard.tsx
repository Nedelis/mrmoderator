import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import { api } from '../api/client';
import { formatDate, formatDateTime, daysUntil } from '../utils/date';
import type { Reminder, Debt, MailItem, Material } from '../types/api';

interface GroupInfo {
    name: string;
    studentsCount?: number;
}

export default function Dashboard() {
    const [group, setGroup] = useState<GroupInfo | null>(null);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [mail, setMail] = useState<MailItem[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

    useEffect(() => {
        Promise.all([
            api.getGroup(),
            api.getReminders(),
            api.getDebts(),
            api.getMail(),
            api.getMaterials(),
        ]).then(([g, r, d, m, mat]) => {
            setGroup(g as GroupInfo);
            setReminders(r.slice(0, 3));
            setDebts(d.slice(0, 5));
            setMail(m.slice(0, 2));
            setMaterials(mat.slice(0, 3));
        });
    }, []);

    const subtitle = group?.name ? `Обзор группы ${group.name}` : 'Загрузка...';

    return (
        <PageWrapper title= "Дашборд" subtitle = { subtitle } >
            <div className="grid grid-2" style = {{ marginBottom: 18 }
}>
    <div className="card" >
        <div className="card-header" >
            <h3>🔔 Ближайшие напоминалки </h3>
                < Link to = "/reminders" className = "link" > Все →</Link>
                    </div>
{
    reminders.length === 0 && (
        <div style={ { color: 'var(--muted)', fontSize: 13, padding: 12 } }>
            Напоминалок нет
                </div>
          )
}
{
    reminders.map(r => {
        const d = daysUntil(r.deadline);
        const cls = d < 0 ? 'red' : d <= 1 ? 'yellow' : 'blue';
        return (
            <div key= { r.id } className = "reminder-item" >
                <div className={ `reminder-icon ${cls}` }>
                { r.priority === 'high' ? '🔥' : '📌' }
                    </div>
                    < div className = "reminder-content" >
                        <div className="title" > { r.title } </div>
                            < div className = "desc" > { r.description } </div>
                                < div className = "meta" >
                                    <span>🕐 { formatDateTime(r.deadline) } </span>
                                        < span > { r.type === 'group' ? '👥 Вся группа' : '👤 Личное' } </span>
                                        </div>
                                        </div>
                                        </div>
            );
})}
</div>

    < div className = "card" >
        <div className="card-header" >
            <h3>🔥 Долги группы </h3>
                < Link to = "/debts" className = "link" > Все →</Link>
                    </div>
                    < table className = "table" >
                        <thead>
                        <tr>
                        <th>Студент </th>
                        < th > Предмет </th>
                        < th > Дедлайн </th>
                        < th > Статус </th>
                        </tr>
                        </thead>
                        <tbody>
{
    debts.map(d => {
        const days = daysUntil(d.deadline);
        const closed = d.status === 'closed';
        const overdue = !closed && days < 0;
        const soon = !closed && days >= 0 && days <= 3;
        const cls = closed ? 'tag-green' : overdue ? 'tag-red' : soon ? 'tag-yellow' : 'tag-blue';
        const label = closed ? 'Закрыт' : overdue ? 'Просрочен' : soon ? 'Скоро' : 'Активен';
        return (
            <tr key= { d.id } >
            <td>{ d.studentName } </td>
            < td > { d.subject } </td>
            < td > { formatDate(d.deadline)
} </td>
    < td > <span className={ `tag ${cls}` }> { label } < /span></td >
        </tr>
                );
              })}
{
    debts.length === 0 && (
        <tr>
        <td colSpan={ 4 } style = {{ textAlign: 'center', color: 'var(--muted)', padding: 20 }
}>
    Долгов нет
        </td>
        </tr>
              )}
</tbody>
    </table>
    </div>
    </div>

    < div className = "grid grid-2" >
        <div className="card" >
            <div className="card-header" >
                <h3>✉️ Последние письма </h3>
                    < Link to = "/mail" className = "link" > Все →</Link>
                        </div>
{
    mail.map(m => (
        <div key= { m.id } className = "reminder-item" >
        <div className="reminder-icon blue" >📧</div>
    < div className = "reminder-content" >
    <div className="title" > { m.from } </div>
    < div className = "desc" > { m.subject } </div>
    < div className = "meta" >
    <span>{ m.preview } </span>
    </div>
    </div>
    </div>
    ))
}
</div>

    < div className = "card" >
        <div className="card-header" >
            <h3>📁 Новые материалы </h3>
                < Link to = "/materials" className = "link" > Все →</Link>
                    </div>
{
    materials.map(m => (
        <div key= { m.id } className = "reminder-item" >
        <div className={`reminder-icon ${m.type === 'pdf' ? 'red' : m.type === 'video' ? 'blue' : 'green'
            }`}>
            { m.type === 'pdf' ? '📄' : m.type === 'video' ? '🎬' : '📎' }
                </div>
                < div className = "reminder-content" >
                    <div className="title" > { m.title } </div>
                        < div className = "desc" > { m.author } </div>
                            < div className = "meta" >
                                <span>🕐 { m.createdAt } </span>
                                    </div>
                                    </div>
                                    </div>
          ))}
</div>
    </div>
    </PageWrapper>
  );
}