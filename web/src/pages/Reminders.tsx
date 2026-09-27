import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import type { Reminder } from '../types/api';

export default function Reminders() {
  const { can } = useCurrentUser();
  const { showToast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  // Форма
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [scope, setScope] = useState<'group' | 'personal' | 'selected'>('personal');

  const canCreateGroup = can('reminder.create.group');
  const canCreatePersonal = can('reminder.create.personal');
  const canCreateAny = canCreateGroup || canCreatePersonal;

  const load = () => {
    api.getReminders().then(setReminders);
  };

  useEffect(() => {
    load();
  }, []);

  // Если роль не может создавать групповые — переключаем scope
  useEffect(() => {
    if (!canCreateGroup && scope === 'group') setScope('personal');
  }, [canCreateGroup, scope]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Введите название', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.createReminder({ title, description, date, time, scope });
      showToast('Напоминалка создана', 'success');
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      load();
    } catch (err: any) {
      showToast(err.message || 'Не удалось создать', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteReminder(id);
      showToast('Напоминалка удалена', 'success');
      load();
    } catch (err: any) {
      showToast(err.message || 'Ошибка удаления', 'error');
    }
  };

  return (
    <PageWrapper
      title="Напоминалки"
      subtitle="Личные и групповые уведомления"
      actions={
        <>
          <button className="btn btn-ghost" onClick={() => showToast('Фильтр пока в разработке', 'info')}>
            Фильтр
          </button>
          {canCreateAny && (
            <button
              className="btn btn-primary"
              onClick={() => {
                document.getElementById('reminder-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              + Создать
            </button>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['Все', 'Личные', 'Групповые', 'Дедлайны', 'Экзамены'].map(f => (
          <span key={f} className={`tag ${f === 'Все' ? 'tag-blue' : 'tag-gray'}`} style={{ cursor: 'pointer' }}>
            {f}
          </span>
        ))}
      </div>

      <div className="grid grid-2">
        <div>
          {reminders.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              Напоминалок пока нет
            </div>
          )}
          {reminders.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className={`reminder-icon ${r.priority === 'high' ? 'red' : 'yellow'}`}>
                  {r.priority === 'high' ? '🔥' : '📌'}
                </div>
                <div className="reminder-content" style={{ flex: 1 }}>
                  <div className="title">{r.title}</div>
                  <div className="desc">{r.description}</div>
                  <div className="meta">
                    <span>🕐 {r.deadline}</span>
                    <span>{r.type === 'group' ? '👥 Вся группа' : '👤 Личное'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => showToast(`Напоминалка «${r.title}» — выполнена`, 'success')}
                    title="Отметить выполненной"
                  >
                    ✅
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => handleDelete(r.id)}
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {canCreateAny ? (
          <div className="card" id="reminder-form">
            <div className="card-header">
              <h3>➕ Быстрое создание</h3>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="role-select"
                placeholder="Название напоминалки"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <input
                className="role-select"
                placeholder="Описание"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="role-select"
                  style={{ flex: 1 }}
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                <input
                  className="role-select"
                  style={{ flex: 1 }}
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
              <select
                className="role-select"
                value={scope}
                onChange={e => setScope(e.target.value as any)}
              >
                {canCreateGroup && <option value="group">Для всей группы</option>}
                {canCreatePersonal && <option value="personal">Только для меня</option>}
                {canCreateGroup && <option value="selected">Выбрать студентов</option>}
              </select>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? '⏳ Создаём...' : '🔔 Создать напоминалку'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <h3>🔒 Создание напоминалок</h3>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
              У вашей роли нет прав на создание напоминалок
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}