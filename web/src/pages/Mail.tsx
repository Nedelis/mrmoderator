import { useEffect, useState } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import type { MailItem } from '../types/api';

export default function Mail() {
  const { can } = useCurrentUser();
  const { showToast } = useToast();
  const [mail, setMail] = useState<MailItem[]>([]);
  const [loading, setLoading] = useState(false);

  const canForward = can('mail.forward');
  const canConfigure = can('mail.configure');

  const load = () => {
    api.getMail().then(setMail);
  };

  useEffect(() => {
    load();
  }, []);

  const handleForward = async (id: string) => {
    try {
      const res: any = await api.forwardMail(id);
      showToast(`Письмо переслано: ${res.forwardedTo}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Ошибка', 'error');
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res: any = await api.refreshMail();
      showToast(`Обновлено. Новых: ${res.newMessages}`, 'success');
      load();
    } catch (err: any) {
      showToast(err.message || 'Ошибка', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = async () => {
    try {
      await api.configureMailboxes({ sources: ['dean@iu7.ru', 'kaf@iu7.ru'] });
      showToast('Ящики настроены', 'success');
    } catch (err: any) {
      showToast(err.message || 'Ошибка', 'error');
    }
  };

  return (
    <PageWrapper
      title="Почта"
      subtitle="Агрегатор писем от преподавателей и кафедр"
      actions={
        <>
          {canConfigure && (
            <button className="btn btn-ghost" onClick={handleConfigure}>
              ⚙️ Настроить ящики
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '⏳ Обновляем...' : '🔄 Обновить'}
          </button>
        </>
      }
    >
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3>📥 Ящики</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Деканат</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>dean@iu7.ru</div>
              </div>
              <span className="tag tag-green">Активен</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Кафедра ИУ7</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>kaf@iu7.ru</div>
              </div>
              <span className="tag tag-green">Активен</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Профком</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>prof@bmstu.ru</div>
              </div>
              <span className="tag tag-gray">Не подключён</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3>✉️ Входящие</h3>
          </div>
          {mail.map(m => (
            <div key={m.id} className="reminder-item">
              <div className={`reminder-icon ${m.source === 'dean' ? 'blue' : m.source === 'kafedra' ? 'purple' : 'yellow'}`}>
                {m.source === 'dean' ? '🎓' : m.source === 'kafedra' ? '🔬' : '👨‍🏫'}
              </div>
              <div className="reminder-content" style={{ flex: 1 }}>
                <div className="title">{m.from}</div>
                <div className="desc">{m.subject}</div>
                <div className="meta">
                  <span>{m.preview}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <span className="tag tag-blue">
                    {m.source === 'dean' ? 'Деканат' : m.source === 'kafedra' ? 'Кафедра' : 'Преподаватель'}
                  </span>
                  {m.autoForward && <span className="tag tag-gray">Авто → группа</span>}
                </div>
              </div>
              {canForward && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '8px 12px' }}
                  onClick={() => handleForward(m.id)}
                  title="Переслать в группу"
                >
                  ↗️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}