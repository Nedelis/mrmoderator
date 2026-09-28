import { useEffect, useState } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import type { Student, Debt } from '../types/api';

export default function Progress() {
    const { can } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [students, setStudents] = useState<Student[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);

    const canViewAll = can('progress.view.all');

    const load = () => {
        Promise.all([api.getStudents(), api.getDebts()]).then(([s, d]) => {
            setStudents(s);
            setDebts(d);
        });
    };

    useEffect(() => {
        load();
    }, []);

    const handleRefresh = () => {
        run(() => Promise.resolve(), {
            successMessage: 'Данные обновлены',
            onSuccess: load,
        });
    };

    const handleExport = () => {
        showToast('Экспорт запущен (демо)', 'success');
    };

    // Считаем долги каждого студента
    const debtCount = (name: string) =>
        debts.filter(d => d.studentName === name && d.status !== 'closed').length;

    // Общее число долгов по группе
    const totalDebts = debts.length;

    // Студенты с долгами
    const studentsWithDebts = students.filter(s => debtCount(s.name) > 0).length;

    // Классификация статуса по количеству долгов
    const statusFor = (count: number) => {
        if (count === 0) return { label: 'Чисто', cls: 'tag-green' };
        if (count === 1) return { label: 'Внимание', cls: 'tag-yellow' };
        return { label: 'Риск', cls: 'tag-red' };
    };

    return (
        <PageWrapper
      title= "Успеваемость"
    subtitle = "Академические задолженности группы"
    actions = {
        <>
        <button className="btn btn-ghost" onClick = { handleExport } disabled = { pending } >
            📊 Экспорт
        </button>
        < button className = "btn btn-primary" onClick = { handleRefresh } disabled = { pending } >
        { pending? '⏳ Обновляем...': '🔄 Обновить' }
            </button>
            </>
}
    >
    {!canViewAll && (
        <div
          className="card"
style = {{
    marginBottom: 20,
        borderColor: 'var(--yellow)',
            color: 'var(--yellow)',
                fontSize: 13,
          }}
        >
          🔒 Вы видите только свою статистику.Полная картина доступна активу группы.
        </div>
      )}

<div className="grid grid-3" style = {{ marginBottom: 20 }}>
    <div className="card" >
        <div
            className="kpi-value"
style = {{ color: totalDebts > 0 ? 'var(--red)' : 'var(--green)' }}
          >
{ totalDebts }
    </div>
    < div className = "kpi-label" > Всего долгов по группе </div>
        </div>
        < div className = "card" >
            <div
            className="kpi-value"
style = {{ color: studentsWithDebts > 0 ? 'var(--yellow)' : 'var(--green)' }}
          >
{ studentsWithDebts }
    </div>
    < div className = "kpi-label" > Студентов с долгами </div>
        </div>
        < div className = "card" >
            <div className="kpi-value" style = {{ color: 'var(--green)' }}>
            { students.length - studentsWithDebts }
                </div>
                < div className = "kpi-label" > Без задолженностей </div>
                    </div>
                    </div>

                    < div className = "card" >
                        <div className="card-header" >
                            <h3>📊 Задолженности по студентам </h3>
                                </div>
                                < table className = "table" >
                                    <thead>
                                    <tr>
                                    <th>Студент </th>
                                    < th > Долгов </th>
                                    < th > Статус </th>
                                    </tr>
                                    </thead>
                                    <tbody>
{
    students.map(s => {
        const count = debtCount(s.name);
        const status = statusFor(count);
        return (
            <tr key= { s.id } >
            <td>{ s.name } </td>
            < td >
            <span
                      style={
            {
                fontWeight: 600,
                    color:
                count === 0
                    ? 'var(--green)'
                    : count === 1
                        ? 'var(--yellow)'
                        : 'var(--red)',
                      }
        }
                    >
        { count }
            </span>
            </td>
            < td >
            <span className={ `tag ${status.cls}` }> { status.label } </span>
                </td>
                </tr>
              );
})}
{
    students.length === 0 && (
        <tr>
        <td
                  colSpan={ 3 }
    style = {{ textAlign: 'center', color: 'var(--muted)', padding: 24 }
}
                >
    Нет данных
        </td>
        </tr>
            )}
</tbody>
    </table>
    </div>
    </PageWrapper>
  );
}