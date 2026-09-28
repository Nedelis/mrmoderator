import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../utils/validation';
import type { Reminder } from '../types/api';
import { formatDateTime, daysUntil } from '../utils/date';
export default function Reminders() {
    const { can } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [filter, setFilter] = useState('Все');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [scope, setScope] = useState<'group' | 'personal' | 'selected'>('personal');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const canCreateGroup = can('reminder.create.group');
    const canCreatePersonal = can('reminder.create.personal');
    const canCreateAny = canCreateGroup || canCreatePersonal;
    const canRemind = can('reminder.remind');

    const load = () => api.getReminders().then(setReminders);

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!canCreateGroup && scope === 'group') setScope('personal');
    }, [canCreateGroup, scope]);

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();

        const errs = validateObject(
            { title, description, date, time },
            {
                title: [rules.required('Введите название'), rules.minLen(3), rules.maxLen(120)],
                description: [rules.maxLen(500)],
                date: [rules.date({ minYearOffset: 0, maxYearOffset: 1 })],
                time: [rules.time()],
            }
        );

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        await run(
            () =>
                api.createReminder({
                    title: title.trim(),
                    description: description.trim(),
                    date,
                    time,
                    scope,
                }),
            {
                successMessage: 'Напоминалка создана',
                onSuccess: () => {
                    setTitle('');
                    setDescription('');
                    setDate('');
                    setTime('');
                    setErrors({});
                    load();
                },
            }
        );
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить напоминалку?')) return;
        await run(() => api.deleteReminder(id), {
            successMessage: 'Напоминалка удалена',
            onSuccess: load,
        });
    };

    const handleRemind = async (r: Reminder) => {
        if (!canRemind) {
            showToast('У вашей роли нет прав на принудительные напоминания', 'error');
            return;
        }
        if (!confirm(`Отправить напоминание «${r.title}» всем участникам группы?`)) return;

        await run(() => api.remindReminder(r.id), {
            successMessage: 'Напоминание разослано',
            errorMessage: 'Ошибка отправки',
            onSuccess: (res: any) => {
                if (res?.sentTo) {
                    showToast(`Разослано ${res.sentTo} участникам`, 'success');
                }
            },
        });
    };

    const filters = ['Все', 'Личные', 'Групповые', 'Дедлайны', 'Экзамены'];

    return (
        <PageWrapper
      title= "Напоминалки"
    subtitle = "Личные и групповые уведомления"
        >
        <div style={ { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' } }>
        {
            filters.map(f => (
                <span
            key= { f }
            className = {`tag ${f === filter ? 'tag-blue' : 'tag-gray'}`}
    style = {{ cursor: 'pointer' }
}
onClick = {() => setFilter(f)}
          >
{ f }
    </span>
        ))}
</div>

    < div className = "grid grid-2" >
        <div>
        {
            reminders.length === 0 && (
                <div
              className="card"
              style = {{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}
            >
    Напоминалок пока нет
        </div>
          )}
{
    reminders.map(r => (
        <div key= { r.id } className = "card" style = {{ marginBottom: 14 }}>
            <div style={ { display: 'flex', gap: 12, alignItems: 'flex-start' } }>
                <div className={ `reminder-icon ${r.priority === 'high' ? 'red' : 'yellow'}` }>
                { r.priority === 'high' ? '🔥' : '📌' }
                    </div>
                    < div className = "reminder-content" style = {{ flex: 1 }}>
                        <div className="title" > { r.title } </div>
                            < div className = "desc" > { r.description } </div>
                                < div className = "meta" >
                                     <span>🕐 { formatDateTime(r.deadline) } </span>
                                        < span > { r.type === 'group' ? '👥 Вся группа' : '👤 Личное' } </span>
                                        </div>
                                        </div>
                                        < div style = {{ display: 'flex', gap: 6 }}>
                                        { canRemind && r.type === 'group' && (
                                                <button
                      className="btn btn-ghost"
style = {{ padding: '6px 10px', fontSize: 12 }}
onClick = {() => handleRemind(r)}
disabled = { pending }
title = "Напомнить всем"
    >
                      🔔
</button>
                  )}
<button
                    className="btn btn-ghost"
style = {{ padding: '6px 10px', fontSize: 12 }}
onClick = {() =>
showToast(`Напоминалка «${r.title}» — выполнена`, 'success')
                    }
disabled = { pending }
title = "Отметить выполненной"
    >
                    ✅
</button>
    < button
className = "btn btn-ghost"
style = {{ padding: '6px 10px', fontSize: 12 }}
onClick = {() => handleDelete(r.id)}
disabled = { pending }
title = "Удалить"
    >
                    🗑️
</button>
    </div>
    </div>
    </div>
          ))}
</div>

{
    canCreateAny ? (
        <div className= "card" id = "reminder-form" >
            <div className="card-header" >
                <h3>➕ Быстрое создание </h3>
                    </div>
                    < form
    onSubmit = { handleCreate }
    style = {{ display: 'flex', flexDirection: 'column', gap: 12 }
}
            >
    <div>
    <input
                  className={ `role-select ${errors.title ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Название напоминалки"
value = { title }
onChange = { e => setTitle(e.target.value) }
    />
{ errors.title && <div className="field-error-msg"> { errors.title } </div> }
    </div>

    < div >
    <input
                  className={ `role-select ${errors.description ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Описание"
value = { description }
onChange = { e => setDescription(e.target.value) }
    />
{
    errors.description && (
        <div className="field-error-msg"> { errors.description } </div>
                )
}
    </div>

    < div style = {{ display: 'flex', gap: 10 }}>
        <div style={ { flex: 1 } }>
            <input
                    className={ `role-select ${errors.date ? 'field-error' : ''}` }
style = {{ width: '100%' }}
type = "date"
value = { date }
onChange = { e => setDate(e.target.value) }
    />
{ errors.date && <div className="field-error-msg"> { errors.date } </div> }
    </div>
    < div style = {{ flex: 1 }}>
        <input
                    className={ `role-select ${errors.time ? 'field-error' : ''}` }
style = {{ width: '100%' }}
type = "time"
value = { time }
onChange = { e => setTime(e.target.value) }
    />
{ errors.time && <div className="field-error-msg"> { errors.time } </div> }
    </div>
    </div>

    < select
className = "role-select"
value = { scope }
onChange = { e => setScope(e.target.value as any) }
    >
{ canCreateGroup && <option value="group" > Для всей группы </option>}
{ canCreatePersonal && <option value="personal" > Только для меня </option> }
{ canCreateGroup && <option value="selected" > Выбрать студентов </option> }
</select>

    < button
type = "submit"
className = "btn btn-primary"
style = {{ justifyContent: 'center' }}
disabled = { pending }
    >
{ pending? '⏳ Создаём...': '🔔 Создать напоминалку' }
    </button>
    </form>
    </div>
        ) : (
    <div className= "card" >
    <div className="card-header" >
        <h3>🔒 Создание напоминалок </h3>
            </div>
            < p
style = {{
    color: 'var(--muted)',
        fontSize: 13,
            padding: 20,
                textAlign: 'center',
              }}
            >
    У вашей роли нет прав на создание напоминалок
        </p>
        </div>
        )}
</div>
    </PageWrapper>
  );
}