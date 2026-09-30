import { useEffect, useState } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { formatDate, daysUntil } from '../utils/date';
import type { Student, Debt } from '../types/api';

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
    const { pending, run } = useAsyncAction();

    const [me, setMe] = useState<Student | null>(null);
    const [myDebts, setMyDebts] = useState<Debt[]>([]);

    const load = () => {
        Promise.all([api.getStudents(), api.getDebts()]).then(([students, debts]) => {
            // Сопоставляем по id: имя в списке участников и в долгах может быть в разном порядке
            setMe(students.find(s => s.id === user?.id) ?? null);
            setMyDebts(user ? debts.filter(d => d.studentId === user.id) : []);
        });
    };

    useEffect(() => {
        load();
    }, [user]);

    const handleRefresh = () => {
        run(() => Promise.resolve(), {
            successMessage: 'Данные обновлены',
            onSuccess: load,
        });
    };

    const activeDebts = myDebts.filter(d => computeDebtStatus(d) !== 'closed');
    const overdueCount = myDebts.filter(d => computeDebtStatus(d) === 'overdue').length;
    const soonCount = myDebts.filter(d => computeDebtStatus(d) === 'soon').length;

    return (
        <PageWrapper
            title="Личная статистика"
            subtitle={me ? `${me.name} · ${user?.groupName}` : 'Мои показатели'}
            actions={
                <button className="btn btn-ghost" onClick={handleRefresh} disabled={pending}>
                    {pending ? '⏳ Обновляем...' : '🔄 Обновить'}
                </button>
            }
        >
            <div className="grid grid-3" style={{ marginBottom: 20 }}>
                <div className="card">
                    <div
                        className="kpi-value"
                        style={{ color: activeDebts.length > 0 ? 'var(--red)' : 'var(--green)' }}
                    >
                        {activeDebts.length}
                    </div>
                    <div className="kpi-label">Активных долгов</div>
                </div>
                <div className="card">
                    <div className="kpi-value" style={{ color: 'var(--red)' }}>
                        {overdueCount}
                    </div>
                    <div className="kpi-label">Просрочено</div>
                </div>
                <div className="card">
                    <div className="kpi-value" style={{ color: 'var(--yellow)' }}>
                        {soonCount}
                    </div>
                    <div className="kpi-label">Скоро дедлайн</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>🔥 Мои долги</h3>
                </div>
                {myDebts.length === 0 ? (
                    <div
                        style={{
                            padding: 30,
                            textAlign: 'center',
                            color: 'var(--muted)',
                            fontSize: 13,
                        }}
                    >
                        🎉 Долгов нет, так держать!
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Предмет</th>
                                <th>Тип</th>
                                <th>Дедлайн</th>
                                <th>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myDebts.map(d => {
                                const st = computeDebtStatus(d);
                                return (
                                    <tr key={d.id}>
                                        <td>{d.subject}</td>
                                        <td>{d.type}</td>
                                        <td>{formatDate(d.deadline)}</td>
                                        <td>
                                            <span className={`tag ${STATUS_CLASS[st]}`}>
                                                {STATUS_LABEL[st]}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </PageWrapper>
    );
}
