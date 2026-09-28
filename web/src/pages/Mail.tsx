import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api, type Mailbox } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../lib/validation';
import type { MailItem } from '../types/api';

export default function Mail() {
    const { can } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [mail, setMail] = useState<MailItem[]>([]);
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [configOpen, setConfigOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState({ email: '', label: '', autoForward: true });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Локальный буфер настроек ящиков внутри модалки
    const [draft, setDraft] = useState<Mailbox[]>([]);

    const canForward = can('mail.forward');
    const canConfigure = can('mail.configure');

    const load = () => {
        api.getMail().then(setMail);
        api.getMailboxes().then(setMailboxes);
    };

    useEffect(() => {
        load();
    }, []);

    const openConfig = () => {
        // Копируем текущее состояние в draft
        setDraft(mailboxes.map(m => ({ ...m })));
        setConfigOpen(true);
    };

    const toggleConnected = (id: string) => {
        setDraft(prev =>
            prev.map(m => {
                if (m.id !== id) return m;
                const connected = !m.connected;
                return {
                    ...m,
                    connected,
                    // Если отключаем — авто-пересылка тоже выключается
                    autoForward: connected ? m.autoForward : false,
                };
            })
        );
    };

    const toggleAutoForward = (id: string) => {
        setDraft(prev =>
            prev.map(m =>
                m.id === id && m.connected ? { ...m, autoForward: !m.autoForward } : m
            )
        );
    };

    const handleSaveMailboxes = async (e: FormEvent) => {
        e.preventDefault();
        const payload = {
            mailboxes: draft.map(m => ({
                id: m.id,
                connected: m.connected,
                autoForward: m.autoForward,
            })),
        };
        await run(() => api.configureMailboxes(payload), {
            successMessage: 'Настройки ящиков сохранены',
            errorMessage: 'Ошибка сохранения',
            onSuccess: () => {
                setConfigOpen(false);
                load();
            },
        });
    };

    const handleForward = (id: string) => {
        run(() => api.forwardMail(id), {
            successMessage: 'Письмо переслано в группу',
            errorMessage: 'Ошибка пересылки',
        });
    };

    const handleRefresh = () => {
        run(() => api.refreshMail(), {
            successMessage: 'Почта обновлена',
            errorMessage: 'Ошибка обновления',
            onSuccess: load,
        });
    };

    const handleAddMailbox = async (e: FormEvent) => {
        e.preventDefault();

        const errs = validateObject(form, {
            email: [
                rules.required('Введите email'),
                (v: string) =>
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Неверный формат email',
            ],
            label: [rules.required('Введите название'), rules.minLen(2), rules.maxLen(60)],
        });

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        await run(
            () =>
                api.addMailbox({
                    email: form.email.trim(),
                    label: form.label.trim(),
                    autoForward: form.autoForward,
                }),
            {
                successMessage: `Ящик ${form.email} добавлен`,
                errorMessage: 'Ошибка добавления',
                onSuccess: () => {
                    setAddOpen(false);
                    setForm({ email: '', label: '', autoForward: true });
                    setErrors({});
                    load();
                },
            }
        );
    };

    const handleRemoveMailbox = async (mb: Mailbox) => {
        if (!canConfigure) {
            showToast('Нет прав на удаление ящиков', 'error');
            return;
        }
        if (!confirm(`Удалить ящик «${mb.label}»?`)) return;
        await run(() => api.removeMailbox(mb.id), {
            successMessage: 'Ящик удалён',
            onSuccess: load,
        });
    };

    return (
        <PageWrapper
      title= "Почта"
    subtitle = "Агрегатор писем от преподавателей и кафедр"
    actions = {
        <>
    {
        canConfigure && (
            <>
            <button
                className="btn btn-ghost"
        onClick = { openConfig }
        disabled = { pending }
            >
                ⚙️ Настроить ящики
            </button>
            < button
        className = "btn btn-ghost"
        onClick = {() => {
            setForm({ email: '', label: '', autoForward: true });
            setErrors({});
            setAddOpen(true);
        }
    }
    disabled = { pending }
        >
                ➕ Добавить ящик
        </button>
        </>
          )
}
<button className="btn btn-primary" onClick = { handleRefresh } disabled = { pending } >
{ pending? '⏳ Обновляем...': '🔄 Обновить' }
    </button>
    </>
      }
    >
    <div className="grid grid-3" style = {{ marginBottom: 20 }}>
        <div className="card" >
            <div className="card-header" >
                <h3>📥 Ящики </h3>
                    </div>
                    < div style = {{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {
                        mailboxes.map(m => (
                            <div
                key= { m.id }
                style = {{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                        }}
                        >
                        <div style={ { flex: 1, minWidth: 0 } }>
                            <div style={ { fontSize: 13, fontWeight: 600 } }> { m.label } </div>
                                < div
style = {{
    fontSize: 11,
        color: 'var(--muted)',
            overflow: 'hidden',
                textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    }}
                  >
{ m.email }
    </div>
{
    m.connected && (
        <div style={ { fontSize: 10, marginTop: 4 } }>
        {
            m.autoForward ? (
                <span className= "tag tag-blue" style={{ fontSize: 10 }
}>
                          🤖 Авто → группа
    </span>
                      ) : (
    <span className= "tag tag-gray" style = {{ fontSize: 10 }}>
                          ✋ Вручную
    </span>
                      )}
</div>
                  )}
</div>
    < span className = {`tag ${m.connected ? 'tag-green' : 'tag-gray'}`}>
    { m.connected ? 'Активен' : 'Отключён' }
        </span>
{
    canConfigure && (
        <button
                    className="icon-btn"
    onClick = {() => handleRemoveMailbox(m)
}
disabled = { pending }
title = "Удалить"
    >
                    🗑️
</button>
                )}
</div>
            ))}
{
    mailboxes.length === 0 && (
        <div
                style={
        {
            fontSize: 12,
                color: 'var(--muted)',
                    textAlign: 'center',
                        padding: 12,
                }
    }
              >
        Ящиков пока нет
            </div>
            )
}
</div>
    </div>

    < div className = "card" style = {{ gridColumn: 'span 2' }}>
        <div className="card-header" >
            <h3>✉️ Входящие </h3>
                </div>
{
    mail.map(m => (
        <div key= { m.id } className = "reminder-item" >
        <div
                className={`reminder-icon ${m.source === 'dean' ? 'blue' :
            m.source === 'kafedra' ? 'purple' : 'yellow'
        }`}
              >
{ m.source === 'dean' ? '🎓' : m.source === 'kafedra' ? '🔬' : '👨‍🏫' }
    </div>
    < div className = "reminder-content" style = {{ flex: 1 }}>
        <div className="title" > { m.from } </div>
            < div className = "desc" > { m.subject } </div>
                < div className = "meta" >
                    <span>{ m.preview } </span>
                    </div>
                    < div style = {{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <span className="tag tag-blue" >
                        {
                            m.source === 'dean' ? 'Деканат' :
                                m.source === 'kafedra' ? 'Кафедра' : 'Преподаватель'
                        }
                            </span>
{
    m.autoForward ? (
        <span className= "tag tag-gray" >🤖 Авто → группа </span>
                  ) : (
        <span className= "tag tag-gray" >✋ Вручную </span>
                  )
}
</div>
    </div>
{
    canForward && !m.autoForward && (
        <button
                  className="btn btn-ghost"
    style = {{ padding: '8px 12px' }
}
onClick = {() => handleForward(m.id)}
disabled = { pending }
title = "Переслать в группу"
    >
                  ↗️
</button>
              )}
</div>
          ))}
</div>
    </div>

{/* Модалка настройки ящиков */ }
<Modal
        open={ configOpen }
onClose = {() => setConfigOpen(false)}
title = "Настроить почтовые ящики"
    >
    <form
          onSubmit={ handleSaveMailboxes }
style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
    <p style={ { fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 } }>
        Отметьте ящики, которые должны попадать в агрегатор.Для каждого можно
выбрать, пересылать ли новые письма автоматически в группу или оставить
            их для ручной отправки активом.
          </p>

    < div
style = {{
    display: 'grid',
        gridTemplateColumns: '1fr 100px 140px',
            gap: 8,
                fontSize: 11,
                    color: 'var(--muted)',
                        textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                                padding: '0 14px',
            }}
          >
    <div>Ящик </div>
    < div style = {{ textAlign: 'center' }}> Подключён </div>
        < div style = {{ textAlign: 'center' }}> Авто → группа </div>
            </div>

            < div style = {{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {
                draft.map(m => (
                    <div
                key= { m.id }
                style = {{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 140px',
                    gap: 8,
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'var(--panel-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                }}
                >
                <div>
                <div style={ { fontSize: 13, fontWeight: 600 } }> { m.label } </div>
                    < div style = {{ fontSize: 11, color: 'var(--muted)' }}> { m.email } </div>
                        </div>

                        < div style = {{ textAlign: 'center' }}>
                            <input
                    type="checkbox"
checked = { m.connected }
onChange = {() => toggleConnected(m.id)}
                  />
    </div>

    < div style = {{ textAlign: 'center' }}>
        <input
                    type="checkbox"
checked = { m.autoForward }
disabled = {!m.connected}
onChange = {() => toggleAutoForward(m.id)}
title = {
    m.connected
        ? 'Пересылать автоматически в группу'
        : 'Сначала подключите ящик'
}
    />
    </div>
    </div>
            ))}
</div>

    < div
style = {{
    fontSize: 12,
        color: 'var(--muted)',
            background: 'var(--panel-2)',
                padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                            lineHeight: 1.5,
            }}
          >
    <div><strong>🤖 Авто → группа < /strong> — новые письма из ящика сразу попадают в чат группы.</div >
        <div><strong>✋ Вручную < /strong> — письма копятся в агрегаторе, староста или зам могут переслать их вручную.</div >
            </div>

            < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className = "btn btn-ghost" onClick = {() => setConfigOpen(false)}>
                    Отмена
                    </button>
                    < button type = "submit" className = "btn btn-primary" disabled = { pending } >
                    { pending? '⏳ Сохраняем...': '✅ Сохранить' }
                        </button>
                        </div>
                        </form>
                        </Modal>

{/* Модалка добавления ящика */ }
<Modal
        open={ addOpen }
onClose = {() => setAddOpen(false)}
title = "Добавить почтовый ящик"
    >
    <form
          onSubmit={ handleAddMailbox }
style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
    <div>
    <input
              className={ `role-select ${errors.email ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Email (например: dean@iu7.ru)"
value = { form.email }
onChange = { e => setForm({ ...form, email: e.target.value })}
            />
{ errors.email && <div className="field-error-msg" > { errors.email } </div> }
</div>

    < div >
    <input
              className={ `role-select ${errors.label ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Название (например: Деканат)"
value = { form.label }
onChange = { e => setForm({ ...form, label: e.target.value })}
            />
{ errors.label && <div className="field-error-msg" > { errors.label } </div> }
</div>

    < label
style = {{
    display: 'flex',
        alignItems: 'center',
            gap: 10,
                fontSize: 13,
                    color: 'var(--text)',
                        cursor: 'pointer',
            }}
          >
    <input
              type="checkbox"
checked = { form.autoForward }
onChange = { e => setForm({ ...form, autoForward: e.target.checked })}
            />
            Автоматически пересылать новые письма в группу
    </label>

    < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className = "btn btn-ghost" onClick = {() => setAddOpen(false)}>
            Отмена
            </button>
            < button type = "submit" className = "btn btn-primary" disabled = { pending } >
            { pending? '⏳ Добавляем...': '✅ Добавить' }
                </button>
                </div>
                </form>
                </Modal>
                </PageWrapper>
  );
}