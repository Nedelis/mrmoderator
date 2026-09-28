import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useToast } from '../components/Toast';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../lib/validation';
import { formatDate, daysUntil, todayISO } from '../lib/date';
import type { Task } from '../types/api';

/** Статус задания с учётом текущей даты (done — вручную) */
function computeTaskStatus(t: Task): Task['status'] {
    if (t.status === 'done') return 'done';
    const days = daysUntil(t.deadline);
    if (days < 0) return 'overdue';
    if (days <= 3) return 'soon';
    return 'active';
}

const STATUS_LABEL: Record<Task['status'], string> = {
    active: 'Активно',
    soon: 'Скоро',
    done: 'Проверено',
    overdue: 'Просрочено',
};

const STATUS_CLASS: Record<Task['status'], string> = {
    active: 'tag-blue',
    soon: 'tag-yellow',
    done: 'tag-green',
    overdue: 'tag-red',
};

const ICON: Record<Task['status'], string> = {
    active: '📝',
    soon: '⏳',
    done: '✅',
    overdue: '⚠️',
};

const ICON_CLASS: Record<Task['status'], string> = {
    active: 'blue',
    soon: 'yellow',
    done: 'green',
    overdue: 'red',
};

export default function Tasks() {
    const { can } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [filter, setFilter] = useState('Все');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        deadline: '',
        type: 'group' as 'group' | 'personal',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const canCreateGroup = can('task.create.group');
    const canCreatePersonal = can('task.create.personal');
    const canEdit = can('task.edit');
    const canDelete = can('task.delete');
    const canRemind = can('task.remind');
    const canCreateAny = canCreateGroup || canCreatePersonal;

    const load = () => api.getTasks().then(setTasks);

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        if (!canCreateAny) {
            showToast('Нет прав на создание заданий', 'error');
            return;
        }
        setEditingTask(null);
        setForm({
            title: '',
            description: '',
            deadline: '',
            type: canCreateGroup ? 'group' : 'personal',
        });
        setErrors({});
        setModalOpen(true);
    };

    const openEdit = (task: Task) => {
        if (!canEdit) {
            showToast('Нет прав на редактирование', 'error');
            return;
        }
        setEditingTask(task);
        setForm({
            title: task.title,
            description: task.description,
            deadline: task.deadline,
            type: task.type,
        });
        setErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingTask(null);
        setForm({ title: '', description: '', deadline: '', type: 'group' });
        setErrors({});
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const errs = validateObject(form, {
            title: [rules.required('Введите название'), rules.minLen(3), rules.maxLen(120)],
            description: [rules.maxLen(500)],
            deadline: [rules.required('Укажите дедлайн')],
        });

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        await run(
            () => (editingTask ? api.updateTask(editingTask.id, form) : api.createTask(form)),
            {
                successMessage: editingTask ? 'Задание обновлено' : 'Задание создано',
                onSuccess: () => {
                    closeModal();
                    load();
                },
            }
        );
    };

    const handleDelete = async (task: Task) => {
        if (!canDelete && task.type === 'group') {
            showToast('Нет прав на удаление', 'error');
            return;
        }
        if (!confirm(`Удалить задание «${task.title}»?`)) return;
        await run(() => api.deleteTask(task.id), {
            successMessage: 'Задание удалено',
            onSuccess: load,
        });
    };

    const handleRemind = async (task: Task) => {
        if (!canRemind) {
            showToast('Нет прав на принудительные напоминания', 'error');
            return;
        }
        if (!confirm(`Отправить напоминание о задании «${task.title}» всем участникам?`)) return;

        await run(() => api.remindTask(task.id), {
            successMessage: 'Напоминание разослано',
            onSuccess: (res: any) => {
                if (res?.sentTo) showToast(`Разослано ${res.sentTo} участникам`, 'success');
            },
        });
    };

    // Фильтрация по статусу
    const visibleTasks = tasks.filter(t => {
        const st = computeTaskStatus(t);
        if (filter === 'Активные') return st === 'active';
        if (filter === 'Проверенные') return st === 'done';
        if (filter === 'Просроченные') return st === 'overdue';
        return true;
    });

    return (
        <PageWrapper
      title= "Задания"
    subtitle = "Домашние и лабораторные работы"
    actions = {
        canCreateAny?(
          <button className = "btn btn-primary" onClick = { openCreate } disabled = { pending } >
            ➕ Добавить задание
          </ button >
        ) : null
}
    >
    <div style={ { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' } }>
    {
        ['Все', 'Активные', 'Проверенные', 'Просроченные'].map(f => (
            <span
            key= { f }
            className = {`tag ${f === filter ? 'tag-blue' : 'tag-gray'}`}
style = {{ cursor: 'pointer' }}
onClick = {() => setFilter(f)}
          >
{ f }
    </span>
        ))}
</div>

    < div className = "grid grid-2" >
    {
        visibleTasks.length === 0 && (
            <div
            className="card"
            style = {{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--muted)', padding: 40 }}
          >
    Заданий пока нет
        </div>
        )}
{
    visibleTasks.map(t => {
        const st = computeTaskStatus(t);
        return (
            <div key= { t.id } className = "card" >
                <div style={ { display: 'flex', gap: 12, alignItems: 'flex-start' } }>
                    <div className={ `reminder-icon ${ICON_CLASS[st]}` }>
                    { ICON[st]}
                        </div>
                        < div className = "reminder-content" style = {{ flex: 1 }
    }>
    <div className="title" > { t.title } </div>
    < div className = "desc" > { t.description } </div>
    < div className = "meta" >
    <span>🕐 Дедлайн: { formatDate(t.deadline)
} </span>
    < span > { t.type === 'group' ? '👥 Вся группа' : '👤 Персонально' } </span>
    </div>
    < div style = {{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
    { canRemind && t.type === 'group' && (
            <button
                        className="btn btn-ghost"
style = {{ padding: '6px 12px', fontSize: 12 }}
onClick = {() => handleRemind(t)}
disabled = { pending }
    >
                        🔔 Напомнить
    </button>
                    )}
{
    canEdit && t.type === 'group' && (
        <button
                        className="btn btn-ghost"
    style = {{ padding: '6px 12px', fontSize: 12 }
}
onClick = {() => openEdit(t)}
disabled = { pending }
    >
                        ✏️ Изменить
    </button>
                    )}
{
    (canDelete && t.type === 'group') || t.type === 'personal' ? (
        <button
                        className= "btn btn-ghost"
                        style = {{ padding: '6px 12px', fontSize: 12, color: 'var(--red)' }
}
onClick = {() => handleDelete(t)}
disabled = { pending }
    >
                        🗑️ Удалить
    </button>
                    ) : null}
</div>
    </div>
    < span className = {`tag ${STATUS_CLASS[st]}`}>
    { STATUS_LABEL[st]}
        </span>
        </div>
        </div>
          );
        })}
</div>

    < Modal
open = { modalOpen }
onClose = { closeModal }
title = { editingTask? 'Редактировать задание': 'Новое задание' }
    >
    <form
          onSubmit={ handleSubmit }
style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
    <div>
    <input
              className={ `role-select ${errors.title ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Название"
value = { form.title }
onChange = { e => setForm({ ...form, title: e.target.value })}
            />
{ errors.title && <div className="field-error-msg" > { errors.title } </div> }
</div>

    < div >
    <textarea
              className={ `role-select ${errors.description ? 'field-error' : ''}` }
style = {{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
placeholder = "Описание"
value = { form.description }
onChange = { e => setForm({ ...form, description: e.target.value })}
            />
{
    errors.description && (
        <div className="field-error-msg" > { errors.description } </div>
            )
}
</div>

    < div >
    <label style={ { fontSize: 12, color: 'var(--muted)' } }> Дедлайн </label>
        < input
type = "date"
className = {`role-select ${errors.deadline ? 'field-error' : ''}`}
style = {{ width: '100%', marginTop: 4 }}
value = { form.deadline }
min = { todayISO() }
onChange = { e => setForm({ ...form, deadline: e.target.value })}
            />
{ errors.deadline && <div className="field-error-msg" > { errors.deadline } </div> }
{
    form.deadline && (
        <div style={ { fontSize: 11, color: 'var(--muted)', marginTop: 4 } }>
        { formatDate(form.deadline) }
            </div>
            )
}
</div>

    < select
className = "role-select"
value = { form.type }
onChange = { e => setForm({ ...form, type: e.target.value as any })}
disabled = {!canCreateGroup}
          >
{ canCreateGroup && <option value="group" > Для всей группы </option>}
<option value="personal" > Личное </option>
    </select>

    < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className = "btn btn-ghost" onClick = { closeModal } >
            Отмена
            </button>
            < button type = "submit" className = "btn btn-primary" disabled = { pending } >
            { pending? '⏳ Сохраняем...': editingTask ? '✅ Сохранить' : '➕ Создать' }
                </button>
                </div>
                </form>
                </Modal>
                </PageWrapper>
  );
}