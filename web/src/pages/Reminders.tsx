import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../utils/validation';
import { formatDateTime, daysUntil } from '../utils/date';
import type { Reminder, Student } from '../types/api';

export default function Reminders() {
    const { can, user } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filter, setFilter] = useState('Все');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [scope, setScope] = useState<'group' | 'personal' | 'selected'>('personal');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const canCreateGroup = can('reminder.create.group');
    const canCreatePersonal = can('reminder.create.personal');
    const canCreateAny = canCreateGroup || canCreatePersonal;
    const canRemind = can('reminder.remind');

    const load = () => {
        api.getReminders().then(setReminders);
        if (canCreateGroup) {
            api.getStudents().then(setStudents);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!canCreateGroup && scope !== 'personal') setScope('personal');
    }, [canCreateGroup, scope]);

    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
        setSelectedStudentIds([]);
        setErrors({});
    };

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

        if (scope === 'selected' && selectedStudentIds.length === 0) {
            errs.selectedStudents = 'Выберите хотя бы одного студента';
        }

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
                    studentIds: scope === 'selected' ? selectedStudentIds : undefined,
                }),
            {
                successMessage: 'Напоминалка создана',
                onSuccess: () => {
                    resetForm();
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

    const isCompletedByMe = (r: Reminder) =>
        !!user && (r.completedBy ?? []).includes(user.id);

    const handleToggleCompleted = async (r: Reminder) => {
        const next = !isCompletedByMe(r);
        await run(() => api.markReminderCompleted(r.id, next), {
            successMessage: next ? 'Отмечено выполненным' : 'Отметка снята',
            errorMessage: 'Не удалось изменить статус',
            onSuccess: load,
        });
    };

    /** Сколько человек получат уведомление — с учётом completedBy */
    const recipientCount = (r: Reminder): number => {
        const completed = new Set(r.completedBy ?? []);
        if (r.targetStudentIds?.length) {
            return r.targetStudentIds.filter(id => !completed.has(id)).length;
        }
        // Групповое — все, кроме тех, кто уже выполнил
        const totalStudents = students.length || 0;
        return Math.max(totalStudents - completed.size, 0);
    };

    const handleRemind = async (r: Reminder) => {
        if (!canRemind) {
            showToast('У вашей роли нет прав на отправку напоминаний', 'error');
            return;
        }

        const count = recipientCount(r);
        if (count === 0) {
            showToast('Все уже отметили это напоминание выполненным', 'info');
            return;
        }

        const isTargeted = r.targetStudentIds && r.targetStudentIds.length > 0;
        const label = isTargeted
            ? `${count} студентам (остальные уже выполнили)`
            : `всем участникам группы (${count})`;

        if (!confirm(`Отправить напоминание «${r.title}» ${label}?`)) return;

        await run(() => api.remindReminder(r.id), {
            successMessage: 'Напоминание отправлено',
            errorMessage: 'Ошибка отправки',
            onSuccess: (res: any) => {
                if (typeof res?.sentTo === 'number') {
                    showToast(`Разослано ${res.sentTo} участникам`, 'success');
                }
            },
        });
    };

    const filters = ['Все', 'Личные', 'Групповые'];

    const visibleReminders = reminders.filter(r => {
        if (filter === 'Личные') return r.type === 'personal';
        if (filter === 'Групповые') return r.type === 'group';
        return true;
    });

    const canRemindThis = (r: Reminder) => canRemind && r.type === 'group';

    return (
        <PageWrapper title= "Напоминалки" subtitle = "Личные и групповые уведомления" >
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
            visibleReminders.length === 0 && (
                <div className="card" style = {{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                    Напоминалок пока нет
                        </div>
          )}
{
    visibleReminders.map(r => {
        const d = daysUntil(r.deadline);
        const cls = d < 0 ? 'red' : d <= 1 ? 'yellow' : 'blue';
        const isTargeted = r.targetStudentIds && r.targetStudentIds.length > 0;
        const completed = isCompletedByMe(r);
        const completedCount = (r.completedBy ?? []).length;

        return (
            <div
                key= { r.id }
        className = {`card reminder-item-card ${completed ? 'reminder-item-completed' : ''}`
    }
                style = {{ marginBottom: 14 }}
              >
    <div style={ { display: 'flex', gap: 12, alignItems: 'flex-start' } }>
        <div className={ `reminder-icon ${cls}` }>
        { completed? '✅': r.priority === 'high' ? '🔥' : '📌' }
            </div>
            < div className = "reminder-content" style = {{ flex: 1 }}>
                <div className="title" > { r.title } </div>
                    < div className = "desc" > { r.description } </div>
                        < div className = "meta" >
                            <span>🕐 { formatDateTime(r.deadline) } </span>
                                <span>
{
    r.type === 'group'
    ? isTargeted
        ? `👥 ${r.targetStudentIds!.length} студентам`
        : '👥 Вся группа'
    : '👤 Личное'
}
</span>
{
    r.type === 'group' && completedCount > 0 && (
        <span>✅ { completedCount } выполнили </span>
                      )
}
</div>
    </div>
    < div style = {{ display: 'flex', gap: 6 }}>
    { canRemindThis(r) && (
            <button
                        className="btn btn-ghost"
style = {{ padding: '6px 10px', fontSize: 12 }}
onClick = {() => handleRemind(r)}
disabled = { pending }
title = "Отправить напоминание"
    >
                        🔔
</button>
                    )}
<button
                      className="btn btn-ghost"
style = {{
    padding: '6px 10px',
        fontSize: 12,
            color: completed ? 'var(--muted)' : 'inherit',
                      }}
onClick = {() => handleToggleCompleted(r)}
disabled = { pending }
title = { completed? 'Вернуть в работу': 'Отметить выполненным' }
    >
{ completed? '↩️': '✅' }
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
            );
          })}
</div>

{
    canCreateAny ? (
        <div className= "card" id = "reminder-form" >
            <div className="card-header" >
                <h3>➕ Быстрое создание </h3>
                    </div>
                    < form onSubmit = { handleCreate } style = {{ display: 'flex', flexDirection: 'column', gap: 12 }
}>
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
{ errors.description && <div className="field-error-msg"> { errors.description } </div> }
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
onChange = { e => {
    setScope(e.target.value as any);
    setSelectedStudentIds([]);
}}
              >
{ canCreateGroup && <option value="group" > Для всей группы </option>}
{ canCreateGroup && <option value="selected" > Для конкретных студентов </option> }
{ canCreatePersonal && <option value="personal" > Только для меня </option> }
</select>

{
    scope === 'selected' && (
        <div
                  style={
        {
            maxHeight: 220,
                overflowY: 'auto',
                    border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                            padding: 8,
                                background: 'var(--panel-2)',
                  }
    }
                >
    {
        students.length === 0 ? (
            <div style= {{ fontSize: 12, color: 'var(--muted)', padding: 8 }
}>
    Студенты не найдены
        </div>
                  ) : (
    students.map(s => (
        <label
                        key= { s.id }
                        style = {{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        cursor: 'pointer',
        borderRadius: 8,
    }}
                      >
        <input
                          type="checkbox"
                          checked = { selectedStudentIds.includes(s.id) }
                          onChange = {() => toggleStudent(s.id)}
                        />
        < span style = {{ fontSize: 13 }}> { s.name } </span>
    </label>
    ))
                  )}
</div>
              )}

{
    errors.selectedStudents && (
        <div className="field-error-msg" > { errors.selectedStudents } </div>
              )
}

<button
                type="submit"
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
            < p style = {{ color: 'var(--muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
                У вашей роли нет прав на создание напоминалок
                    </p>
                    </div>
        )}
</div>
    </PageWrapper>
  );
}