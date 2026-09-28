import { useState } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { api } from '../api/client';

interface ToggleState {
    pushNotifications: boolean;
    dailySummary: boolean;
    debtNotifications: boolean;
    newMaterials: boolean;
    twoFactor: boolean;
    auditLog: boolean;
}

export default function Settings() {
    const { can } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const canEdit = can('settings.edit');

    const [toggles, setToggles] = useState<ToggleState>({
        pushNotifications: true,
        dailySummary: true,
        debtNotifications: true,
        newMaterials: false,
        twoFactor: true,
        auditLog: true,
    });

    const flip = (key: keyof ToggleState) => {
        if (!canEdit) {
            showToast('Нет прав на изменение настроек', 'error');
            return;
        }
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (!canEdit) {
            showToast('Нет прав на сохранение настроек', 'error');
            return;
        }
        await run(() => api.saveSettings(toggles), {
            successMessage: 'Настройки сохранены',
            errorMessage: 'Ошибка сохранения',
        });
    };

    const handleAddMailbox = () => {
        if (!canEdit) {
            showToast('Нет прав на изменение ящиков', 'error');
            return;
        }
        showToast('Форма добавления ящика — в разработке', 'info');
    };

    const handleExport = () => {
        run(() => Promise.resolve({ ok: true }), {
            successMessage: 'Экспорт данных запущен (демо)',
        });
    };

    const Row = ({
        label,
        hint,
        value,
        onToggle,
    }: {
        label: string;
        hint: string;
        value: boolean;
        onToggle: () => void;
    }) => (
        <div
      style= {{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 0',
            borderBottom: '1px solid var(--border)',
        }
}
    >
    <div>
    <div style={ { fontSize: 14, fontWeight: 500 } }> { label } </div>
        < div style = {{ fontSize: 12, color: 'var(--muted)' }}> { hint } </div>
            </div>
            < div
className = {`toggle ${value ? 'on' : ''}`}
onClick = { onToggle }
style = {{ cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : 0.5 }}
      />
    </div>
  );

return (
    <PageWrapper
  title= "Настройки"
subtitle = "Параметры бота и уведомлений"
actions = {
    < button
className = "btn btn-primary"
onClick = { handleSave }
disabled = {!canEdit || pending}
    >
{ pending? '⏳ Сохраняем...': '💾 Сохранить' }
    </button>
  }
>
        {!canEdit && (
            <div
          className="card"
style = {{
    marginBottom: 20,
        borderColor: 'var(--yellow)',
            color: 'var(--yellow)',
                fontSize: 13,
          }}
        >
          🔒 У вашей роли нет прав на изменение настроек.Доступен только просмотр.
        </div>
      )}

<div className="grid grid-2" >
    <div className="card" >
        <div className="card-header" >
            <h3>🔔 Уведомления </h3>
                </div>
                < Row
label = "Push-уведомления в VK"
hint = "Напоминания о дедлайнах и экзаменах"
value = { toggles.pushNotifications }
onToggle = {() => flip('pushNotifications')}
          />
    < Row
label = "Ежедневная сводка"
hint = "Каждое утро в 9:00"
value = { toggles.dailySummary }
onToggle = {() => flip('dailySummary')}
          />
    < Row
label = "Уведомления о долгах"
hint = "Только для актива группы"
value = { toggles.debtNotifications }
onToggle = {() => flip('debtNotifications')}
          />
    < Row
label = "Новые материалы"
hint = "При загрузке преподавателем"
value = { toggles.newMaterials }
onToggle = {() => flip('newMaterials')}
          />
    </div>

    < div className = "card" >
        <div className="card-header" >
            <h3>📧 Почтовые ящики </h3>
                </div>
                < div style = {{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
                        <div>
                        <div style={ { fontSize: 13, fontWeight: 600 } }> dean@iu7.ru</div>
                            < div style = {{ fontSize: 11, color: 'var(--muted)' }}> Деканат · авто - пересылка </div>
                                </div>
                                < span className = "tag tag-green" > Активен </span>
                                    </div>
                                    < div style = {{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                        <div style={ { fontSize: 13, fontWeight: 600 } }> kaf@iu7.ru</div>
                                            < div style = {{ fontSize: 11, color: 'var(--muted)' }}> Кафедра · авто - пересылка </div>
                                                </div>
                                                < span className = "tag tag-green" > Активен </span>
                                                    </div>
                                                    < div style = {{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                        <div style={ { fontSize: 13, fontWeight: 600 } }> prof@bmstu.ru</div>
                                                            < div style = {{ fontSize: 11, color: 'var(--muted)' }}> Профком · не подключён </div>
                                                                </div>
                                                                < span className = "tag tag-gray" > Отключён </span>
                                                                    </div>
                                                                    < button
className = "btn btn-ghost"
style = {{ width: '100%', justifyContent: 'center', marginTop: 8 }}
onClick = { handleAddMailbox }
disabled = {!canEdit || pending}
            >
              ➕ Добавить ящик
    </button>
    </div>
    </div>

    < div className = "card" >
        <div className="card-header" >
            <h3>🛡️ Безопасность </h3>
                </div>
                < Row
label = "Двухфакторная аутентификация"
hint = "Для актива группы"
value = { toggles.twoFactor }
onToggle = {() => flip('twoFactor')}
          />
    < Row
label = "Логирование действий"
hint = "История изменений ролей и материалов"
value = { toggles.auditLog }
onToggle = {() => flip('auditLog')}
          />
    </div>

    < div className = "card" >
        <div className="card-header" >
            <h3>📊 Экспорт данных </h3>
                </div>
    < p style = {{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        Скачать отчёт по группе: список студентов, задолженности и посещаемость.
</p>
                        < button
className = "btn btn-ghost"
style = {{ width: '100%', justifyContent: 'center' }}
onClick = { handleExport }
disabled = { pending }
    >
{ pending? '⏳ Экспортируем...': '⬇️ Скачать отчёт' }
    </button>
    </div>
    </div>
    </PageWrapper>
  );
}