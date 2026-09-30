import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../utils/validation';
import { formatDate, formatDateTime, daysUntil } from '../utils/date';
import type { Reminder, Debt, Task, Exam, Student } from '../types/api';

type CreateKind = 'reminder' | 'debt' | 'task' | 'exam';
type DebtKind = 'Экзамен' | 'Зачёт' | 'Лаба' | 'Курсовая';
type TaskKind = 'group' | 'personal';
type ExamKind = 'exam' | 'consultation';
type ReminderScope = 'group' | 'selected' | 'personal';

type EventItem =
    | { kind: 'reminder'; data: Reminder }
    | { kind: 'debt'; data: Debt }
    | { kind: 'task'; data: Task }
    | { kind: 'exam'; data: Exam };

const KIND_META: Record<CreateKind, { label: string; icon: string; cls: string }> = {
    reminder: { label: 'Напоминание', icon: '🔔', cls: 'blue' },
    debt: { label: 'Долг', icon: '🔥', cls: 'red' },
    task: { label: 'Задание', icon: '📝', cls: 'yellow' },
    exam: { label: 'Экзамен', icon: '📅', cls: 'purple' },
};

// "YYYY-MM-DDTHH:mm" → { date: "YYYY-MM-DD", time: "HH:mm" }
function splitDateTime(iso: string): { date: string; time: string } {
    if (!iso) return { date: '', time: '' };
    const [d, t] = iso.split('T');
    return { date: d ?? '', time: (t ?? '').slice(0, 5) };
}

// Состояние формы редактирования. Поля — надмножество всех четырёх типов,
// при открытии модалки заполняются только релевантные.
interface EditFormState {
    kind: CreateKind;
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    scope: ReminderScope;
    selectedStudentIds: string[];
    debtType: DebtKind;
    debtStudentId: string;
    taskType: TaskKind;
    examType: ExamKind;
    examRoom: string;
    examTeacher: string;
}

export default function Reminders() {
    const { can, user } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filter, setFilter] = useState<'all' | CreateKind>('all');

    // === Форма создания ===
    const [kind, setKind] = useState<CreateKind>('reminder');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [scope, setScope] = useState<ReminderScope>('personal');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    const [debtType, setDebtType] = useState<DebtKind>('Экзамен');
    const [debtStudentId, setDebtStudentId] = useState('');

    const [taskType, setTaskType] = useState<TaskKind>('group');

    const [examType, setExamType] = useState<ExamKind>('exam');
    const [examRoom, setExamRoom] = useState('');
    const [examTeacher, setExamTeacher] = useState('');

    // === Форма редактирования ===
    const [editForm, setEditForm] = useState<EditFormState | null>(null);
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});

    const canCreateReminderPersonal = can('reminder.create.personal');
    const canCreateReminderGroup = can('reminder.create.group');
    const canCreateReminder = canCreateReminderPersonal || canCreateReminderGroup;
    const canRemind = can('reminder.remind');

    const canCreateDebtOwn = can('debts.create.own');
    const canCreateDebtAny = can('debts.edit');
    const canCreateDebt = canCreateDebtOwn || canCreateDebtAny;

    const canCreateTaskPersonal = can('task.create.personal');
    const canCreateTaskGroup = can('task.create.group');
    const canCreateTask = canCreateTaskPersonal || canCreateTaskGroup;
    const canRemindTask = can('task.remind');
    const canEditTaskGroup = can('task.edit');

    const canCreateExam = can('exam.create');
    const canEditExam = can('exam.edit');
    const canDeleteExam = can('exam.delete');

    const availableKinds: CreateKind[] = [];
    if (canCreateReminder) availableKinds.push('reminder');
    if (canCreateDebt) availableKinds.push('debt');
    if (canCreateTask) availableKinds.push('task');
    if (canCreateExam) availableKinds.push('exam');

    const canCreateAnything = availableKinds.length > 0;

    const myFullName = user ? `${user.firstName} ${user.lastName}` : '';

    const load = () => {
        api.getReminders().then(setReminders);
        api.getDebts().then(setDebts);
        api.getTasks().then(setTasks);
        api.getExams().then(setExams);
        if (canCreateReminderGroup || canCreateDebtAny || canCreateTaskGroup) {
            api.getStudents().then(setStudents);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (kind === 'reminder') {
            if (!canCreateReminderGroup && scope !== 'personal') setScope('personal');
        }
    }, [kind, canCreateReminderGroup, scope]);

    useEffect(() => {
        if (canCreateAnything && !availableKinds.includes(kind)) {
            setKind(availableKinds[0]);
        }
    }, [availableKinds, kind, canCreateAnything]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
        setSelectedStudentIds([]);
        setDebtStudentId('');
        setExamRoom('');
        setExamTeacher('');
        setErrors({});
    };

    // ==================================================================
    // СОЗДАНИЕ
    // ==================================================================

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();

        const baseErrs = validateObject(
            { title, description, date },
            {
                title: [
                    rules.required('Введите название'),
                    rules.minLen(3, 'Минимум 3 символа'),
                    rules.maxLen(120),
                ],
                description: [rules.maxLen(500)],
                date: [rules.date({ minYearOffset: 0, maxYearOffset: 1 })],
            }
        );

        if (kind === 'reminder') {
            const timeErr = validateObject({ time }, { time: [rules.time()] });
            Object.assign(baseErrs, timeErr);
        }

        if (kind === 'reminder' && scope === 'selected' && selectedStudentIds.length === 0) {
            baseErrs.selectedStudents = 'Выберите хотя бы одного студента';
        }

        if (Object.keys(baseErrs).length > 0) {
            setErrors(baseErrs);
            return;
        }

        await run(
            async () => {
                if (kind === 'reminder') {
                    await api.createReminder({
                        title: title.trim(),
                        description: description.trim(),
                        date,
                        time,
                        scope,
                        studentIds: scope === 'selected' ? selectedStudentIds : undefined,
                    });
                } else if (kind === 'debt') {
                    const selectedStudent = debtStudentId
                        ? students.find(s => s.id === debtStudentId)
                        : null;
                    const targetStudentId =
                        canCreateDebtAny && debtStudentId ? debtStudentId : user?.id;
                    const targetStudentName = selectedStudent?.name || myFullName;

                    await api.createDebt({
                        studentId: targetStudentId,
                        studentName: targetStudentName,
                        subject: title.trim(),
                        type: debtType,
                        deadline: date,
                    });
                } else if (kind === 'task') {
                    await api.createTask({
                        title: title.trim(),
                        description: description.trim(),
                        deadline: date,
                        type: canCreateTaskGroup ? taskType : 'personal',
                    });
                } else if (kind === 'exam') {
                    await api.createExam({
                        subject: title.trim(),
                        type: examType,
                        date,
                        time: time || '10:00',
                        room: examRoom.trim(),
                        teacher: examTeacher.trim(),
                    });
                }
            },
            {
                successMessage: `Создано: ${KIND_META[kind].label.toLowerCase()}`,
                errorMessage: 'Не удалось создать',
                onSuccess: () => {
                    resetForm();
                    load();
                },
            }
        );
    };

    // ==================================================================
    // РЕДАКТИРОВАНИЕ
    // ==================================================================

    /**
     * Право на редактирование конкретной карточки.
     * Личные напоминания и личные задания каждый может править (они его собственные),
     * групповые — только те, у кого есть соответствующее право.
     */
    const canEditItem = (item: EventItem): boolean => {
        switch (item.kind) {
            case 'reminder':
                return item.data.type === 'group' ? canRemind : true;
            case 'debt':
                // Любой долг — с правом debts.edit, свой — с правом debts.create.own
                return canCreateDebtAny || (canCreateDebtOwn && item.data.studentId === user?.id);
            case 'task':
                return item.data.type === 'group' ? canEditTaskGroup : true;
            case 'exam':
                return canEditExam;
        }
    };

    const openEdit = (item: EventItem) => {
        setEditErrors({});

        if (item.kind === 'reminder') {
            const r = item.data;
            const { date: d, time: t } = splitDateTime(r.deadline);
            setEditForm({
                kind: 'reminder',
                id: r.id,
                title: r.title,
                description: r.description,
                date: d,
                time: t,
                scope:
                    r.type === 'personal'
                        ? 'personal'
                        : r.targetStudentIds?.length
                          ? 'selected'
                          : 'group',
                selectedStudentIds: r.targetStudentIds ?? [],
                debtType: 'Экзамен',
                debtStudentId: '',
                taskType: 'group',
                examType: 'exam',
                examRoom: '',
                examTeacher: '',
            });
        } else if (item.kind === 'debt') {
            const d = item.data;
            setEditForm({
                kind: 'debt',
                id: d.id,
                title: d.subject,
                description: '',
                date: d.deadline,
                time: '',
                scope: 'personal',
                selectedStudentIds: [],
                debtType: (d.type as DebtKind) || 'Экзамен',
                debtStudentId: d.studentId ?? '',
                taskType: 'group',
                examType: 'exam',
                examRoom: '',
                examTeacher: '',
            });
        } else if (item.kind === 'task') {
            const t = item.data;
            setEditForm({
                kind: 'task',
                id: t.id,
                title: t.title,
                description: t.description,
                date: t.deadline,
                time: '',
                scope: 'personal',
                selectedStudentIds: [],
                debtType: 'Экзамен',
                debtStudentId: '',
                taskType: t.type,
                examType: 'exam',
                examRoom: '',
                examTeacher: '',
            });
        } else {
            const e = item.data;
            const { date: d, time: t } = splitDateTime(e.date);
            setEditForm({
                kind: 'exam',
                id: e.id,
                title: e.subject,
                description: '',
                date: d,
                time: t,
                scope: 'personal',
                selectedStudentIds: [],
                debtType: 'Экзамен',
                debtStudentId: '',
                taskType: 'group',
                examType: e.type,
                examRoom: e.room,
                examTeacher: e.teacher,
            });
        }
    };

    const handleEditSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!editForm) return;

        const baseErrs = validateObject(
            { title: editForm.title, date: editForm.date },
            {
                title: [
                    rules.required('Введите название'),
                    rules.minLen(3, 'Минимум 3 символа'),
                    rules.maxLen(120),
                ],
                date: [rules.date({ minYearOffset: 0, maxYearOffset: 1 })],
            }
        );

        if (editForm.kind === 'reminder') {
            const timeErr = validateObject({ time: editForm.time }, { time: [rules.time()] });
            Object.assign(baseErrs, timeErr);
            if (editForm.scope === 'selected' && editForm.selectedStudentIds.length === 0) {
                baseErrs.selectedStudents = 'Выберите хотя бы одного студента';
            }
        }

        if (Object.keys(baseErrs).length > 0) {
            setEditErrors(baseErrs);
            return;
        }

        await run(
            async () => {
                if (editForm.kind === 'reminder') {
                    await api.updateReminder(editForm.id, {
                        title: editForm.title.trim(),
                        description: editForm.description.trim(),
                        date: editForm.date,
                        time: editForm.time,
                        scope: editForm.scope,
                        studentIds:
                            editForm.scope === 'selected' ? editForm.selectedStudentIds : undefined,
                    });
                } else if (editForm.kind === 'debt') {
                    const selectedStudent = editForm.debtStudentId
                        ? students.find(s => s.id === editForm.debtStudentId)
                        : null;
                    await api.updateDebt(editForm.id, {
                        studentId: editForm.debtStudentId || user?.id,
                        studentName: selectedStudent?.name || myFullName,
                        subject: editForm.title.trim(),
                        type: editForm.debtType,
                        deadline: editForm.date,
                    });
                } else if (editForm.kind === 'task') {
                    await api.updateTask(editForm.id, {
                        title: editForm.title.trim(),
                        description: editForm.description.trim(),
                        deadline: editForm.date,
                        type: editForm.taskType,
                    });
                } else if (editForm.kind === 'exam') {
                    await api.updateExam(editForm.id, {
                        subject: editForm.title.trim(),
                        type: editForm.examType,
                        date: editForm.date,
                        time: editForm.time || '10:00',
                        room: editForm.examRoom.trim(),
                        teacher: editForm.examTeacher.trim(),
                    });
                }
            },
            {
                successMessage: 'Изменения сохранены',
                errorMessage: 'Не удалось сохранить',
                onSuccess: () => {
                    setEditForm(null);
                    load();
                },
            }
        );
    };

    // ==================================================================
    // УДАЛЕНИЕ / ДЕЙСТВИЯ
    // ==================================================================

    const handleDelete = async (item: EventItem) => {
        const confirmText =
            item.kind === 'reminder'
                ? `Удалить напоминание «${item.data.title}»?`
                : item.kind === 'debt'
                  ? `Удалить долг «${item.data.subject}»?`
                  : item.kind === 'task'
                    ? `Удалить задание «${item.data.title}»?`
                    : `Удалить экзамен «${item.data.subject}»?`;
        if (!confirm(confirmText)) return;

        if (item.kind === 'reminder') {
            await run(() => api.deleteReminder(item.data.id), {
                successMessage: 'Напоминание удалено',
                onSuccess: load,
            });
        } else if (item.kind === 'debt') {
            await run(() => api.deleteDebt(item.data.id), {
                successMessage: 'Долг удалён',
                onSuccess: load,
            });
        } else if (item.kind === 'task') {
            await run(() => api.deleteTask(item.data.id), {
                successMessage: 'Задание удалено',
                onSuccess: load,
            });
        } else if (item.kind === 'exam') {
            if (!canDeleteExam) {
                showToast('Нет прав на удаление экзаменов', 'error');
                return;
            }
            await run(() => api.deleteExam(item.data.id), {
                successMessage: 'Экзамен удалён',
                onSuccess: load,
            });
        }
    };

    const isCompletedByMe = (r: Reminder) => !!user && (r.completedBy ?? []).includes(user.id);

    const handleToggleCompleted = async (r: Reminder) => {
        const next = !isCompletedByMe(r);
        await run(() => api.markReminderCompleted(r.id, next), {
            successMessage: next ? 'Отмечено выполненным' : 'Отметка снята',
            onSuccess: load,
        });
    };

    const handleRemind = async (r: Reminder) => {
        if (!canRemind) {
            showToast('Нет прав на отправку напоминаний', 'error');
            return;
        }
        const isTargeted = r.targetStudentIds && r.targetStudentIds.length > 0;
        const label = isTargeted
            ? `${r.targetStudentIds!.length} студентам`
            : 'всем участникам группы';

        if (!confirm(`Отправить напоминание «${r.title}» ${label}?`)) return;

        await run(() => api.remindReminder(r.id), {
            successMessage: 'Напоминание отправлено',
            onSuccess: (res: any) => {
                if (typeof res?.sentTo === 'number') {
                    showToast(`Разослано ${res.sentTo} участникам`, 'success');
                }
            },
        });
    };

    const handleRemindTask = async (t: Task) => {
        if (!canRemindTask) {
            showToast('Нет прав на отправку напоминаний о заданиях', 'error');
            return;
        }
        if (!confirm(`Отправить напоминание о задании «${t.title}» всей группе?`)) return;

        await run(() => api.remindTask(t.id), {
            successMessage: 'Напоминание отправлено',
            onSuccess: (res: any) => {
                if (typeof res?.sentTo === 'number') {
                    showToast(`Разослано ${res.sentTo} участникам`, 'success');
                }
            },
        });
    };

    // ==================================================================
    // РЕНДЕР
    // ==================================================================

    const allEvents: EventItem[] = [
        ...reminders.map(r => ({ kind: 'reminder' as const, data: r })),
        ...debts.map(d => ({ kind: 'debt' as const, data: d })),
        ...tasks.map(t => ({ kind: 'task' as const, data: t })),
        ...exams.map(e => ({ kind: 'exam' as const, data: e })),
    ];

    const getDeadline = (item: EventItem): string => {
        if (item.kind === 'exam') return item.data.date;
        return item.data.deadline;
    };

    const filteredEvents = allEvents
        .filter(item => filter === 'all' || item.kind === filter)
        .sort((a, b) => new Date(getDeadline(a)).getTime() - new Date(getDeadline(b)).getTime());

    const filters: { key: 'all' | CreateKind; label: string }[] = [
        { key: 'all', label: 'Все' },
        { key: 'reminder', label: '🔔 Напоминания' },
        { key: 'debt', label: '🔥 Долги' },
        { key: 'task', label: '📝 Задания' },
        { key: 'exam', label: '📅 Экзамены' },
    ];

    const renderCard = (item: EventItem) => {
        const meta = KIND_META[item.kind];
        const canEdit = canEditItem(item);

        if (item.kind === 'reminder') {
            const r = item.data;
            const d = daysUntil(r.deadline);
            const cls = d < 0 ? 'red' : d <= 1 ? 'yellow' : 'blue';
            const completed = isCompletedByMe(r);
            const isTargeted = r.targetStudentIds && r.targetStudentIds.length > 0;
            const completedCount = (r.completedBy ?? []).length;

            return (
                <div
                    key={`reminder-${r.id}`}
                    className={`card ${completed ? 'reminder-item-completed' : ''}`}
                    style={{ marginBottom: 10 }}
                >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div className={`reminder-icon ${cls}`}>{completed ? '✅' : meta.icon}</div>
                        <div className="reminder-content" style={{ flex: 1 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'center',
                                    marginBottom: 4,
                                }}
                            >
                                <div className="title" style={{ margin: 0 }}>
                                    {r.title}
                                </div>
                                <span className="tag tag-blue" style={{ fontSize: 10 }}>
                                    {meta.label}
                                </span>
                            </div>
                            <div className="desc">{r.description}</div>
                            <div className="meta">
                                <span>🕐 {formatDateTime(r.deadline)}</span>
                                <span>
                                    {r.type === 'group'
                                        ? isTargeted
                                            ? `👥 ${r.targetStudentIds!.length} студентам`
                                            : '👥 Вся группа'
                                        : '👤 Личное'}
                                </span>
                                {r.type === 'group' && completedCount > 0 && (
                                    <span>✅ {completedCount} выполнили</span>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {canRemind && r.type === 'group' && (
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => handleRemind(r)}
                                    disabled={pending}
                                    title="Отправить напоминание"
                                >
                                    🔔
                                </button>
                            )}
                            <button
                                className="btn btn-ghost"
                                style={{
                                    padding: '6px 10px',
                                    fontSize: 12,
                                    color: completed ? 'var(--muted)' : 'inherit',
                                }}
                                onClick={() => handleToggleCompleted(r)}
                                disabled={pending}
                                title={completed ? 'Вернуть в работу' : 'Отметить выполненным'}
                            >
                                {completed ? '↩️' : '✅'}
                            </button>
                            {canEdit && (
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => openEdit(item)}
                                    disabled={pending}
                                    title="Редактировать"
                                >
                                    ✏️
                                </button>
                            )}
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                onClick={() => handleDelete(item)}
                                disabled={pending}
                                title="Удалить"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (item.kind === 'debt') {
            const d = item.data;
            const days = daysUntil(d.deadline);
            const closed = d.status === 'closed';
            const overdue = !closed && days < 0;
            const soon = !closed && days >= 0 && days <= 3;
            const statusCls = closed
                ? 'tag-green'
                : overdue
                  ? 'tag-red'
                  : soon
                    ? 'tag-yellow'
                    : 'tag-blue';
            const statusLabel = closed
                ? 'Закрыт'
                : overdue
                  ? 'Просрочен'
                  : soon
                    ? 'Скоро'
                    : 'Активен';

            return (
                <div key={`debt-${d.id}`} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div className="reminder-icon red">{meta.icon}</div>
                        <div className="reminder-content" style={{ flex: 1 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'center',
                                    marginBottom: 4,
                                }}
                            >
                                <div className="title" style={{ margin: 0 }}>
                                    {d.subject}
                                </div>
                                <span className="tag tag-red" style={{ fontSize: 10 }}>
                                    {meta.label}
                                </span>
                                <span className={`tag ${statusCls}`}>{statusLabel}</span>
                            </div>
                            <div className="desc">
                                {d.type} · {d.studentName}
                            </div>
                            <div className="meta">
                                <span>🕐 Дедлайн: {formatDate(d.deadline)}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {canEdit && (
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => openEdit(item)}
                                    disabled={pending}
                                    title="Редактировать"
                                >
                                    ✏️
                                </button>
                            )}
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                onClick={() => handleDelete(item)}
                                disabled={pending}
                                title="Удалить"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (item.kind === 'task') {
            const t = item.data;
            const days = daysUntil(t.deadline);
            const done = t.status === 'done';
            const overdue = !done && days < 0;
            const soon = !done && days >= 0 && days <= 3;
            const statusCls = done
                ? 'tag-green'
                : overdue
                  ? 'tag-red'
                  : soon
                    ? 'tag-yellow'
                    : 'tag-blue';
            const statusLabel = done
                ? 'Выполнено'
                : overdue
                  ? 'Просрочено'
                  : soon
                    ? 'Скоро'
                    : 'Активно';

            return (
                <div key={`task-${t.id}`} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div className="reminder-icon yellow">{meta.icon}</div>
                        <div className="reminder-content" style={{ flex: 1 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'center',
                                    marginBottom: 4,
                                }}
                            >
                                <div className="title" style={{ margin: 0 }}>
                                    {t.title}
                                </div>
                                <span className="tag tag-yellow" style={{ fontSize: 10 }}>
                                    {meta.label}
                                </span>
                                <span className={`tag ${statusCls}`}>{statusLabel}</span>
                            </div>
                            <div className="desc">{t.description}</div>
                            <div className="meta">
                                <span>🕐 Дедлайн: {formatDate(t.deadline)}</span>
                                <span>{t.type === 'group' ? '👥 Вся группа' : '👤 Личное'}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {canRemindTask && t.type === 'group' && (
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => handleRemindTask(t)}
                                    disabled={pending}
                                    title="Напомнить всей группе"
                                >
                                    🔔
                                </button>
                            )}
                            {canEdit && (
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => openEdit(item)}
                                    disabled={pending}
                                    title="Редактировать"
                                >
                                    ✏️
                                </button>
                            )}
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                onClick={() => handleDelete(item)}
                                disabled={pending}
                                title="Удалить"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // exam
        const e = item.data;
        return (
            <div key={`exam-${e.id}`} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div className="reminder-icon purple">{e.icon || meta.icon}</div>
                    <div className="reminder-content" style={{ flex: 1 }}>
                        <div
                            style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                                marginBottom: 4,
                            }}
                        >
                            <div className="title" style={{ margin: 0 }}>
                                {e.subject}
                            </div>
                            <span className="tag tag-purple" style={{ fontSize: 10 }}>
                                {e.type === 'exam' ? 'Экзамен' : 'Консультация'}
                            </span>
                        </div>
                        <div className="desc">
                            {e.room ? `Ауд. ${e.room}` : ''}
                            {e.room && e.teacher ? ' · ' : ''}
                            {e.teacher}
                        </div>
                        <div className="meta">
                            <span>🕐 {formatDateTime(e.date)}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {canEdit && (
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                onClick={() => openEdit(item)}
                                disabled={pending}
                                title="Редактировать"
                            >
                                ✏️
                            </button>
                        )}
                        {canDeleteExam && (
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                onClick={() => handleDelete(item)}
                                disabled={pending}
                                title="Удалить"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <PageWrapper
            title="Напоминания"
            subtitle="Напоминания, долги, задания и экзамены в одном месте"
        >
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {filters.map(f => (
                    <span
                        key={f.key}
                        className={`tag ${filter === f.key ? 'tag-blue' : 'tag-gray'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}
                    </span>
                ))}
            </div>

            <div className="grid grid-2">
                <div>
                    {filteredEvents.length === 0 && (
                        <div
                            className="card"
                            style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}
                        >
                            Здесь пока ничего нет
                        </div>
                    )}
                    {filteredEvents.map(renderCard)}
                </div>

                {canCreateAnything ? (
                    <div className="card">
                        <div className="card-header">
                            <h3>➕ Создать</h3>
                        </div>

                        <form
                            onSubmit={handleCreate}
                            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                        >
                            <div>
                                <label
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontWeight: 600,
                                    }}
                                >
                                    Что создать
                                </label>
                                <select
                                    className="role-select"
                                    style={{ width: '100%', marginTop: 4 }}
                                    value={kind}
                                    onChange={e => {
                                        setKind(e.target.value as CreateKind);
                                        setErrors({});
                                    }}
                                >
                                    {availableKinds.map(k => (
                                        <option key={k} value={k}>
                                            {KIND_META[k].icon} {KIND_META[k].label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <input
                                    className={`role-select ${errors.title ? 'field-error' : ''}`}
                                    style={{ width: '100%' }}
                                    placeholder={
                                        kind === 'debt'
                                            ? 'Предмет'
                                            : kind === 'exam'
                                              ? 'Предмет'
                                              : 'Название'
                                    }
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                                {errors.title && (
                                    <div className="field-error-msg">{errors.title}</div>
                                )}
                            </div>

                            {(kind === 'reminder' || kind === 'task') && (
                                <div>
                                    <input
                                        className={`role-select ${errors.description ? 'field-error' : ''}`}
                                        style={{ width: '100%' }}
                                        placeholder="Описание"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                    {errors.description && (
                                        <div className="field-error-msg">{errors.description}</div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        className={`role-select ${errors.date ? 'field-error' : ''}`}
                                        style={{ width: '100%' }}
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                    {errors.date && (
                                        <div className="field-error-msg">{errors.date}</div>
                                    )}
                                </div>
                                {kind === 'reminder' && (
                                    <div style={{ flex: 1 }}>
                                        <input
                                            className={`role-select ${errors.time ? 'field-error' : ''}`}
                                            style={{ width: '100%' }}
                                            type="time"
                                            value={time}
                                            onChange={e => setTime(e.target.value)}
                                        />
                                        {errors.time && (
                                            <div className="field-error-msg">{errors.time}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {kind === 'reminder' && (
                                <>
                                    <select
                                        className="role-select"
                                        value={scope}
                                        onChange={e => {
                                            setScope(e.target.value as ReminderScope);
                                            setSelectedStudentIds([]);
                                        }}
                                    >
                                        {canCreateReminderGroup && (
                                            <option value="group">Для всей группы</option>
                                        )}
                                        {canCreateReminderGroup && (
                                            <option value="selected">
                                                Для конкретных студентов
                                            </option>
                                        )}
                                        {canCreateReminderPersonal && (
                                            <option value="personal">Только для меня</option>
                                        )}
                                    </select>

                                    {scope === 'selected' && (
                                        <div
                                            style={{
                                                maxHeight: 220,
                                                overflowY: 'auto',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: 8,
                                                background: 'var(--panel-2)',
                                            }}
                                        >
                                            {students.length === 0 ? (
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: 'var(--muted)',
                                                        padding: 8,
                                                    }}
                                                >
                                                    Студенты не найдены
                                                </div>
                                            ) : (
                                                students.map(s => (
                                                    <label
                                                        key={s.id}
                                                        style={{
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
                                                            checked={selectedStudentIds.includes(
                                                                s.id
                                                            )}
                                                            onChange={() =>
                                                                setSelectedStudentIds(prev =>
                                                                    prev.includes(s.id)
                                                                        ? prev.filter(
                                                                              x => x !== s.id
                                                                          )
                                                                        : [...prev, s.id]
                                                                )
                                                            }
                                                        />
                                                        <span style={{ fontSize: 13 }}>
                                                            {s.name}
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    )}
                                    {errors.selectedStudents && (
                                        <div className="field-error-msg">
                                            {errors.selectedStudents}
                                        </div>
                                    )}
                                </>
                            )}

                            {kind === 'debt' && (
                                <>
                                    <select
                                        className="role-select"
                                        value={debtType}
                                        onChange={e => setDebtType(e.target.value as DebtKind)}
                                    >
                                        <option value="Экзамен">Экзамен</option>
                                        <option value="Зачёт">Зачёт</option>
                                        <option value="Лаба">Лаба</option>
                                        <option value="Курсовая">Курсовая</option>
                                    </select>

                                    {canCreateDebtAny ? (
                                        <select
                                            className="role-select"
                                            value={debtStudentId}
                                            onChange={e => setDebtStudentId(e.target.value)}
                                        >
                                            <option value="">Себе ({myFullName})</option>
                                            {students.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                            Долг будет создан для вас
                                        </div>
                                    )}
                                </>
                            )}

                            {kind === 'task' && (
                                <select
                                    className="role-select"
                                    value={taskType}
                                    onChange={e => setTaskType(e.target.value as TaskKind)}
                                >
                                    {canCreateTaskGroup && (
                                        <option value="group">Для всей группы</option>
                                    )}
                                    <option value="personal">Личное</option>
                                </select>
                            )}

                            {kind === 'exam' && (
                                <>
                                    <select
                                        className="role-select"
                                        value={examType}
                                        onChange={e => setExamType(e.target.value as ExamKind)}
                                    >
                                        <option value="exam">Экзамен</option>
                                        <option value="consultation">Консультация</option>
                                    </select>
                                    <input
                                        className="role-select"
                                        style={{ width: '100%' }}
                                        placeholder="Аудитория (например: 412)"
                                        value={examRoom}
                                        onChange={e => setExamRoom(e.target.value)}
                                    />
                                    <input
                                        className="role-select"
                                        style={{ width: '100%' }}
                                        placeholder="Преподаватель"
                                        value={examTeacher}
                                        onChange={e => setExamTeacher(e.target.value)}
                                    />
                                </>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ justifyContent: 'center' }}
                                disabled={pending}
                            >
                                {pending
                                    ? '⏳ Создаём...'
                                    : `➕ Создать ${KIND_META[kind].label.toLowerCase()}`}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="card">
                        <div className="card-header">
                            <h3>🔒 Создание</h3>
                        </div>
                        <p
                            style={{
                                color: 'var(--muted)',
                                fontSize: 13,
                                padding: 20,
                                textAlign: 'center',
                            }}
                        >
                            У вашей роли нет прав на создание событий
                        </p>
                    </div>
                )}
            </div>

            {/* ===== Модалка редактирования ===== */}
            <Modal
                open={!!editForm}
                onClose={() => setEditForm(null)}
                title={
                    editForm ? `Редактировать · ${KIND_META[editForm.kind].label}` : 'Редактировать'
                }
            >
                {editForm && (
                    <form
                        onSubmit={handleEditSubmit}
                        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    >
                        <div>
                            <input
                                className={`role-select ${editErrors.title ? 'field-error' : ''}`}
                                style={{ width: '100%' }}
                                placeholder={
                                    editForm.kind === 'debt' || editForm.kind === 'exam'
                                        ? 'Предмет'
                                        : 'Название'
                                }
                                value={editForm.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            />
                            {editErrors.title && (
                                <div className="field-error-msg">{editErrors.title}</div>
                            )}
                        </div>

                        {(editForm.kind === 'reminder' || editForm.kind === 'task') && (
                            <div>
                                <input
                                    className={`role-select ${editErrors.description ? 'field-error' : ''}`}
                                    style={{ width: '100%' }}
                                    placeholder="Описание"
                                    value={editForm.description}
                                    onChange={e =>
                                        setEditForm({ ...editForm, description: e.target.value })
                                    }
                                />
                                {editErrors.description && (
                                    <div className="field-error-msg">{editErrors.description}</div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    className={`role-select ${editErrors.date ? 'field-error' : ''}`}
                                    style={{ width: '100%' }}
                                    type="date"
                                    value={editForm.date}
                                    onChange={e =>
                                        setEditForm({ ...editForm, date: e.target.value })
                                    }
                                />
                                {editErrors.date && (
                                    <div className="field-error-msg">{editErrors.date}</div>
                                )}
                            </div>
                            {(editForm.kind === 'reminder' || editForm.kind === 'exam') && (
                                <div style={{ flex: 1 }}>
                                    <input
                                        className={`role-select ${editErrors.time ? 'field-error' : ''}`}
                                        style={{ width: '100%' }}
                                        type="time"
                                        value={editForm.time}
                                        onChange={e =>
                                            setEditForm({ ...editForm, time: e.target.value })
                                        }
                                    />
                                    {editErrors.time && (
                                        <div className="field-error-msg">{editErrors.time}</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {editForm.kind === 'reminder' && (
                            <>
                                <select
                                    className="role-select"
                                    value={editForm.scope}
                                    onChange={e =>
                                        setEditForm({
                                            ...editForm,
                                            scope: e.target.value as ReminderScope,
                                            selectedStudentIds: [],
                                        })
                                    }
                                >
                                    {canCreateReminderGroup && (
                                        <option value="group">Для всей группы</option>
                                    )}
                                    {canCreateReminderGroup && (
                                        <option value="selected">Для конкретных студентов</option>
                                    )}
                                    {canCreateReminderPersonal && (
                                        <option value="personal">Только для меня</option>
                                    )}
                                </select>

                                {editForm.scope === 'selected' && (
                                    <div
                                        style={{
                                            maxHeight: 200,
                                            overflowY: 'auto',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: 8,
                                            background: 'var(--panel-2)',
                                        }}
                                    >
                                        {students.map(s => (
                                            <label
                                                key={s.id}
                                                style={{
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
                                                    checked={editForm.selectedStudentIds.includes(
                                                        s.id
                                                    )}
                                                    onChange={() =>
                                                        setEditForm({
                                                            ...editForm,
                                                            selectedStudentIds:
                                                                editForm.selectedStudentIds.includes(
                                                                    s.id
                                                                )
                                                                    ? editForm.selectedStudentIds.filter(
                                                                          x => x !== s.id
                                                                      )
                                                                    : [
                                                                          ...editForm.selectedStudentIds,
                                                                          s.id,
                                                                      ],
                                                        })
                                                    }
                                                />
                                                <span style={{ fontSize: 13 }}>{s.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {editErrors.selectedStudents && (
                                    <div className="field-error-msg">
                                        {editErrors.selectedStudents}
                                    </div>
                                )}
                            </>
                        )}

                        {editForm.kind === 'debt' && (
                            <>
                                <select
                                    className="role-select"
                                    value={editForm.debtType}
                                    onChange={e =>
                                        setEditForm({
                                            ...editForm,
                                            debtType: e.target.value as DebtKind,
                                        })
                                    }
                                >
                                    <option value="Экзамен">Экзамен</option>
                                    <option value="Зачёт">Зачёт</option>
                                    <option value="Лаба">Лаба</option>
                                    <option value="Курсовая">Курсовая</option>
                                </select>

                                {canCreateDebtAny && (
                                    <select
                                        className="role-select"
                                        value={editForm.debtStudentId}
                                        onChange={e =>
                                            setEditForm({
                                                ...editForm,
                                                debtStudentId: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="">Себе ({myFullName})</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </>
                        )}

                        {editForm.kind === 'task' && (
                            <select
                                className="role-select"
                                value={editForm.taskType}
                                onChange={e =>
                                    setEditForm({
                                        ...editForm,
                                        taskType: e.target.value as TaskKind,
                                    })
                                }
                            >
                                {canCreateTaskGroup && (
                                    <option value="group">Для всей группы</option>
                                )}
                                <option value="personal">Личное</option>
                            </select>
                        )}

                        {editForm.kind === 'exam' && (
                            <>
                                <select
                                    className="role-select"
                                    value={editForm.examType}
                                    onChange={e =>
                                        setEditForm({
                                            ...editForm,
                                            examType: e.target.value as ExamKind,
                                        })
                                    }
                                >
                                    <option value="exam">Экзамен</option>
                                    <option value="consultation">Консультация</option>
                                </select>
                                <input
                                    className="role-select"
                                    style={{ width: '100%' }}
                                    placeholder="Аудитория (например: 412)"
                                    value={editForm.examRoom}
                                    onChange={e =>
                                        setEditForm({ ...editForm, examRoom: e.target.value })
                                    }
                                />
                                <input
                                    className="role-select"
                                    style={{ width: '100%' }}
                                    placeholder="Преподаватель"
                                    value={editForm.examTeacher}
                                    onChange={e =>
                                        setEditForm({ ...editForm, examTeacher: e.target.value })
                                    }
                                />
                            </>
                        )}

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setEditForm(null)}
                                disabled={pending}
                            >
                                Отмена
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={pending}>
                                {pending ? '⏳ Сохраняем...' : '✅ Сохранить'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </PageWrapper>
    );
}
