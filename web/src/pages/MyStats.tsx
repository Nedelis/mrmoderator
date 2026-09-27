import { useEffect, useState } from 'react';
import PageWrapper from '../components/PageWrapper';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import type { Student, Debt, Reminder } from '../types/api';

export default function MyStats() {
  const { user } = useCurrentUser();
  const [me, setMe] = useState<Student | null>(null);
  const [myDebts, setMyDebts] = useState<Debt[]>([]);
  const [myReminders, setMyReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    Promise.all([
      api.getStudents(),
      api.getDebts(),
      api.getReminders(),
    ]).then(([students, debts, reminders]) => {
      // Пытаемся найти себя в списке студентов по имени и фамилии
      const fullName = user ? `${user.firstName} ${user.lastName}` : '';
      const found =
        students.find(s => fullName.includes(s.name)) ||
        students.find(s => s.name.includes(user?.firstName ?? '')) ||
        null;

      setMe(found);
      setMyDebts(found ? debts.filter(d => d.studentName === found.name) : []);
      // Личные напоминалки — фильтруем по типу
      setMyReminders(reminders.filter(r => r.type === 'personal'));
    });
  }, [user]);

  return (
    <PageWrapper
      title="Личная статистика"
      subtitle={me ? `${me.name} · ${user?.groupName}` : 'Мои показатели'}
    >
      {/* KPI */}
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--green)' }}>
            {me?.avgScore ?? '—'}
          </div>
          <div className="kpi-label">Мой средний балл</div>
          <div className="progress" style={{ marginTop: 12 }}>
            <div
              className="progress-bar green"
              style={{ width: `${((me?.avgScore ?? 0) / 5) * 100}%` }}
            />
          </div>
        </div>
        <div className="card">
          <div className="kpi-value">{me?.attendance ?? '—'}%</div>
          <div className="kpi-label">Посещаемость</div>
          <div className="progress" style={{ marginTop: 12 }}>
            <div
              className="progress-bar"
              style={{ width: `${me?.attendance ?? 0}%` }}
            />
          </div>
        </div>
        <div className="card">
          <div
            className="kpi-value"
            style={{ color: myDebts.length > 0 ? 'var(--red)' : 'var(--green)' }}
          >
            {myDebts.length}
          </div>
          <div className="kpi-label">Моих долгов</div>
          <div className="progress" style={{ marginTop: 12 }}>
            <div
              className={`progress-bar ${myDebts.length > 0 ? 'red' : 'green'}`}
              style={{ width: `${Math.min(myDebts.length * 33, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Мои долги + Мои напоминалки */}
      <div className="grid grid-2">
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
                {myDebts.map(d => (
                  <tr key={d.id}>
                    <td>{d.subject}</td>
                    <td>{d.type}</td>
                    <td>{d.deadline}</td>
                    <td>
                      <span
                        className={`tag ${
                          d.status === 'overdue'
                            ? 'tag-red'
                            : d.status === 'active'
                            ? 'tag-yellow'
                            : 'tag-green'
                        }`}
                      >
                        {d.status === 'overdue'
                          ? 'Просрочен'
                          : d.status === 'active'
                          ? 'На подходе'
                          : 'Закрыт'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🔔 Мои напоминалки</h3>
          </div>
          {myReminders.length === 0 ? (
            <div
              style={{
                padding: 30,
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 13,
              }}
            >
              Нет активных личных напоминалок
            </div>
          ) : (
            myReminders.map(r => (
              <div key={r.id} className="reminder-item">
                <div className="reminder-icon blue">📌</div>
                <div className="reminder-content">
                  <div className="title">{r.title}</div>
                  <div className="desc">{r.description}</div>
                  <div className="meta">
                    <span>🕐 {r.deadline}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageWrapper>
  );
}