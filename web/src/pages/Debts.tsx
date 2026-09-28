import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../utils/validation';
import { formatDate, daysUntil, todayISO } from '../utils/date';
import type { Debt } from '../types/api';

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

export default function Debts() {
    const { can, user } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [debts, setDebts] = useState<Debt[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

    const [form, setForm] = useState({
        studentName: '',
        subject: '',
        type: '',
        deadline: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const canEditAll = can('debts.edit');
    const canCreateOwn = can('debts.create.own');
    const canViewAll = can('debts.view.all');

    const myFullName = user ? `${user.firstName} ${user.lastName}` : '';

    const load = () => api.getDebts().then(setDebts);

    useEffect(() => {
        load();
    }, []);

    // Фильтр по правам: актив видит все, остальные — только свои
    const visibleDebts = canViewAll
        ? debts
        : debts.filter(d => d.studentName === myFullName);

    const openCreate = () => {
        if (!canCreateOwn && !canEditAll) {
            showToast('Нет прав на добавление долгов', 'error');
            return;
        }
        setEditingDebt(null);
        setForm({
            studentName: canEditAll ? '' : myFullName,
            subject: '',
            type: '',
            deadline: '',
        });
        setErrors({});
        setModalOpen(true);
    };

    const openEdit = (debt: Debt) => {
        if (!canEditAll) {
            showToast('Нет прав на редактирование чужих долгов', 'error');
            return;
        }
        setEditingDebt(debt);
        setForm({
            studentName: debt.studentName,
            subject: debt.subject,
            type: debt.type,
            deadline: debt.deadline,
        });
        setErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingDebt(null);
        setForm({ studentName: '', subject: '', type: '', deadline: '' });
        setErrors({});
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const errs = validateObject(form, {
            studentName: [rules.required('Укажите студента'), rules.minLen(2)],
            subject: [rules.required('Укажите предмет'), rules.minLen(2)],
            type: [rules.required('Укажите тип')],
            deadline: [rules.required('Укажите дедлайн')],
        });

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        await run(
            () =>
                editingDebt
                    ? api.updateDebt(editingDebt.id, form)
                    : api.createDebt(form),
            {
                successMessage: editingDebt ? 'Долг обновлён' : 'Долг добавлен',
                errorMessage: editingDebt ? 'Ошибка обновления' : 'Ошибка добавления',
                onSuccess: () => {
                    closeModal();
                    load();
                },
            }
        );
    };

    const handleDelete = async (debt: Debt) => {
        if (!canEditAll) {
            showToast('Нет прав на удаление долгов', 'error');
            return;
        }
        if (!confirm(`Удалить долг «${debt.subject}» у ${debt.studentName}?`)) return;
        await run(() => api.deleteDebt(debt.id), {
            successMessage: 'Долг удалён',
            onSuccess: load,
        });
    };

    const canManage = canEditAll || canCreateOwn;

    // KPI считаются по видимым долгам
    const overdueCount = visibleDebts.filter(d => computeDebtStatus(d) === 'overdue').length;
    const soonCount = visibleDebts.filter(d => computeDebtStatus(d) === 'soon').length;
    const closedCount = visibleDebts.filter(d => computeDebtStatus(d) === 'closed').length;

    return (
        <PageWrapper
      title= "Долги"
    subtitle = {
        canViewAll
        ? 'Академические задолженности группы'
            : 'Мои академические задолженности'
    }
    actions = {
        canManage?(
          <button className = "btn btn-primary" onClick = { openCreate } disabled = { pending } >
            ➕ Добавить долг
          </ button >
        ) : null
}
    >
    {!canViewAll && (
        <div
          className="card"
style = {{
    marginBottom: 20,
        borderColor: 'var(--accent)',
            color: 'var(--accent)',
                fontSize: 13,
          }}
        >
    ℹ️ Вы видите только свои задолженности.Полный список доступен активу группы.
        </div>
      )}

<div className="grid grid-4" style = {{ marginBottom: 20 }}>
    <div className="card" >
        <div className="kpi-value" style = {{ color: 'var(--red)' }}> { overdueCount } </div>
            < div className = "kpi-label" > Просрочено </div>
                </div>
                < div className = "card" >
                    <div className="kpi-value" style = {{ color: 'var(--yellow)' }}> { soonCount } </div>
                        < div className = "kpi-label" > Скоро </div>
                            </div>
                            < div className = "card" >
                                <div className="kpi-value" style = {{ color: 'var(--green)' }}> { closedCount } </div>
                                    < div className = "kpi-label" > Закрыто </div>
                                        </div>
                                        < div className = "card" >
                                            <div className="kpi-value" > { visibleDebts.length } </div>
                                                < div className = "kpi-label" >
                                                { canViewAll? 'Всего задолженностей': 'Моих задолженностей' }
                                                    </div>
                                                    </div>
                                                    </div>

                                                    < div className = "card" >
                                                        <div className="card-header" >
                                                            <h3>📋 { canViewAll ? 'Список задолженностей' : 'Мои задолженности' } </h3>
                                                                </div>
                                                                < table className = "table" >
                                                                    <thead>
                                                                    <tr>
                                                                    { canViewAll && <th>Студент </th>}
<th>Предмет </th>
    < th > Тип </th>
    < th > Дедлайн </th>
    < th > Статус </th>
{ canEditAll && <th>Действия </th> }
</tr>
    </thead>
    <tbody>
{
    visibleDebts.map(d => {
        const st = computeDebtStatus(d);
        return (
            <tr key= { d.id } >
            { canViewAll && <td>{ d.studentName } </td>
    }
                  <td>{ d.subject } </td>
        < td > { d.type } </td>
        < td > { formatDate(d.deadline)
} </td>
    < td >
    <span className={ `tag ${STATUS_CLASS[st]}` }>
    { STATUS_LABEL[st]}
        </span>
        </td>
{
    canEditAll && (
        <td>
        <div style={ { display: 'flex', gap: 6 } }>
            <button
                          className="btn btn-ghost"
    style = {{ padding: '6px 10px', fontSize: 12 }
}
onClick = {() => openEdit(d)}
disabled = { pending }
title = "Редактировать"
    >
                          ✏️
</button>
    < button
className = "btn btn-ghost"
style = {{ padding: '6px 10px', fontSize: 12 }}
onClick = {() => handleDelete(d)}
disabled = { pending }
title = "Удалить"
    >
                          🗑️
</button>
    </div>
    </td>
                  )}
</tr>
              );
            })}
{
    visibleDebts.length === 0 && (
        <tr>
        <td
                  colSpan={ (canViewAll ? 5 : 4) + (canEditAll ? 1 : 0) }
    style = {{ textAlign: 'center', color: 'var(--muted)', padding: 24 }
}
                >
{ canViewAll? 'Долгов нет': '🎉 У вас нет задолженностей' }
    </td>
    </tr>
            )}
</tbody>
    </table>
    </div>

    < Modal
open = { modalOpen }
onClose = { closeModal }
title = { editingDebt? 'Редактировать долг': 'Добавить долг' }
    >
    <form
          onSubmit={ handleSubmit }
style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
    <div>
    <input
              className={ `role-select ${errors.studentName ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "ФИО студента"
value = { form.studentName }
onChange = { e => setForm({ ...form, studentName: e.target.value })}
disabled = {!canEditAll}
            />
{
    errors.studentName && (
        <div className="field-error-msg" > { errors.studentName } </div>
            )
}
{
    !canEditAll && (
        <div style={ { fontSize: 11, color: 'var(--muted)', marginTop: 4 } }>
            Вы можете добавлять долги только для себя
                </div>
            )
}
</div>

    < div >
    <input
              className={ `role-select ${errors.subject ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Предмет"
value = { form.subject }
onChange = { e => setForm({ ...form, subject: e.target.value })}
            />
{
    errors.subject && (
        <div className="field-error-msg" > { errors.subject } </div>
            )
}
</div>

    < div >
    <select
              className={ `role-select ${errors.type ? 'field-error' : ''}` }
style = {{ width: '100%' }}
value = { form.type }
onChange = { e => setForm({ ...form, type: e.target.value })}
            >
    <option value="" > Тип...</option>
        < option value = "Экзамен" > Экзамен </option>
            < option value = "Зачёт" > Зачёт </option>
                < option value = "Лаба" > Лаба </option>
                    < option value = "Курсовая" > Курсовая </option>
                        </select>
{ errors.type && <div className="field-error-msg" > { errors.type } </div> }
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
{
    errors.deadline && (
        <div className="field-error-msg" > { errors.deadline } </div>
            )
}
{
    form.deadline && (
        <div style={ { fontSize: 11, color: 'var(--muted)', marginTop: 4 } }>
        { formatDate(form.deadline) }
            </div>
            )
}
</div>

    < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className = "btn btn-ghost" onClick = { closeModal } >
            Отмена
            </button>
            < button type = "submit" className = "btn btn-primary" disabled = { pending } >
            {
                pending
                ? '⏳ Сохраняем...'
                    : editingDebt
                        ? '✅ Сохранить'
                        : '➕ Добавить'
            }
                </button>
                </div>
                </form>
                </Modal>
                </PageWrapper>
  );
}