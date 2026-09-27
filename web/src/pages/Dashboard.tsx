import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import type { Reminder, Debt, MailItem, Material } from '../types/api';

export default function Dashboard() {
  const { can } = useCurrentUser();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [mail, setMail] = useState<MailItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    Promise.all([
      api.getReminders(),
      api.getDebts(),
      api.getMail(),
      api.getMaterials(),
    ]).then(([r, d, m, mat]) => {
      setReminders(r.slice(0, 3));
      setDebts(d);
      setMail(m.slice(0, 2));
      setMaterials(mat.slice(0, 3));
    });
  }, []);

  const canCreateReminder =
    can('reminder.create.group') || can('reminder.create.personal');

  return (
    <PageWrapper
      title="Дашборд"
      subtitle="Обзор группы ИУ7-42Б · 2 курс · 4 семестр"
      actions={
        canCreateReminder ? (
          <button className="btn btn-primary">+ Напоминалка</button>
        ) : null
      }
    >
      {/* KPI */}
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="kpi-value">24</div>
          <div className="kpi-label">Студента в группе</div>
        </div>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--yellow)' }}>5</div>
          <div className="kpi-label">Активных напоминалок</div>
        </div>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--red)' }}>2</div>
          <div className="kpi-label">Долга по группе</div>
        </div>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--green)' }}>87%</div>
          <div className="kpi-label">Средняя успеваемость</div>
        </div>
      </div>

      {/* Reminders + Debts */}
      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header">
            <h3>🔔 Ближайшие напоминалки</h3>
            <Link to="/reminders" className="link">Все →</Link>
          </div>
          {reminders.map(r => (
            <div key={r.id} className="reminder-item">
              <div className={`reminder-icon ${r.priority === 'high' ? 'red' : 'blue'}`}>
                {r.priority === 'high' ? '🔥' : '📌'}
              </div>
              <div className="reminder-content">
                <div className="title">{r.title}</div>
                <div className="desc">{r.description}</div>
                <div className="meta">
                  <span>🕐 {r.deadline}</span>
                  <span>{r.type === 'group' ? '👥 Вся группа' : '👤 Личное'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🔥 Долги группы</h3>
            <Link to="/debts" className="link">Все →</Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Студент</th>
                <th>Предмет</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {debts.map(d => (
                <tr key={d.id}>
                  <td>{d.studentName}</td>
                  <td>{d.subject}</td>
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
        </div>
      </div>

      {/* Mail + Materials */}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>✉️ Последние письма</h3>
            <Link to="/mail" className="link">Все →</Link>
          </div>
          {mail.map(m => (
            <div key={m.id} className="reminder-item">
              <div className="reminder-icon blue">📧</div>
              <div className="reminder-content">
                <div className="title">{m.from}</div>
                <div className="desc">{m.subject}</div>
                <div className="meta">
                  <span>{m.preview}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>📁 Новые материалы</h3>
            <Link to="/materials" className="link">Все →</Link>
          </div>
          {materials.map(m => (
            <div key={m.id} className="reminder-item">
              <div
                className={`reminder-icon ${
                  m.type === 'pdf' ? 'red' : m.type === 'video' ? 'blue' : 'green'
                }`}
              >
                {m.type === 'pdf' ? '📄' : m.type === 'video' ? '🎬' : '🤖'}
              </div>
              <div className="reminder-content">
                <div className="title">{m.title}</div>
                <div className="desc">{m.author}</div>
                <div className="meta">
                  <span>🕐 {m.createdAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}