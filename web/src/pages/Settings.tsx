import { useState } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { api } from '../api/client';

interface ToggleState {
  pushNotifications: boolean;
  dailySummary: boolean;
  debtNotifications: boolean;
  newMaterials: boolean;
  autoAiSummaries: boolean;
  speechRecognition: boolean;
  generateTheses: boolean;
  twoFactor: boolean;
  auditLog: boolean;
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { can } = useCurrentUser();
  const { showToast } = useToast();

  const canEdit = can('settings.edit');

  const [toggles, setToggles] = useState<ToggleState>({
    pushNotifications: true,
    dailySummary: true,
    debtNotifications: true,
    newMaterials: false,
    autoAiSummaries: true,
    speechRecognition: true,
    generateTheses: true,
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
    try {
      await api.saveSettings(toggles);
      showToast('Настройки сохранены', 'success');
    } catch (err: any) {
      showToast(err.message || 'Ошибка сохранения', 'error');
    }
  };

  const handleAddMailbox = () => {
    if (!canEdit) {
      showToast('Нет прав на изменение ящиков', 'error');
      return;
    }
    showToast('Форма добавления ящика — в разработке', 'info');
  };

  const handleExport = () => {
    showToast('Экспорт данных запущен (демо)', 'success');
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
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{hint}</div>
      </div>
      <div
        className={`toggle ${value ? 'on' : ''}`}
        onClick={onToggle}
        style={{ cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : 0.5 }}
      />
    </div>
  );

  return (
    <PageWrapper
      title="Настройки"
      subtitle="Параметры бота и уведомлений"
      actions={
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!canEdit}
        >
          💾 Сохранить
        </button>
      }
    >
      {!canEdit && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            borderColor: 'var(--yellow)',
            color: 'var(--yellow)',
            fontSize: 13,
          }}
        >
          🔒 У вашей роли нет прав на изменение настроек. Доступен только просмотр.
        </div>
      )}

      <div className="grid grid-2">
        {/* Уведомления */}
        <div className="card">
          <div className="card-header">
            <h3>🔔 Уведомления</h3>
          </div>
          <Row
            label="Push-уведомления в VK"
            hint="Напоминания о дедлайнах и экзаменах"
            value={toggles.pushNotifications}
            onToggle={() => flip('pushNotifications')}
          />
          <Row
            label="Ежедневная сводка"
            hint="Каждое утро в 9:00"
            value={toggles.dailySummary}
            onToggle={() => flip('dailySummary')}
          />
          <Row
            label="Уведомления о долгах"
            hint="Только для актива группы"
            value={toggles.debtNotifications}
            onToggle={() => flip('debtNotifications')}
          />
          <Row
            label="Новые материалы"
            hint="При загрузке преподавателем"
            value={toggles.newMaterials}
            onToggle={() => flip('newMaterials')}
          />
        </div>

        {/* Почта */}
        <div className="card">
          <div className="card-header">
            <h3>📧 Почтовые ящики</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>dean@iu7.ru</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Деканат · авто-пересылка</div>
              </div>
              <span className="tag tag-green">Активен</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>kaf@iu7.ru</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Кафедра · авто-пересылка</div>
              </div>
              <span className="tag tag-green">Активен</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>prof@bmstu.ru</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Профком · не подключён</div>
              </div>
              <span className="tag tag-gray">Отключён</span>
            </div>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={handleAddMailbox}
              disabled={!canEdit}
            >
              ➕ Добавить ящик
            </button>
          </div>
        </div>

        {/* Внешний вид */}
        <div className="card">
          <div className="card-header">
            <h3>🎨 Внешний вид</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Тема оформления</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Сейчас: {theme === 'dark' ? 'тёмная' : 'светлая'}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}
            </button>
          </div>
        </div>

        {/* AI */}
        <div className="card">
          <div className="card-header">
            <h3>🤖 AI-обработка</h3>
          </div>
          <Row
            label="Авто-конспекты лекций"
            hint="Автоматически обрабатывать записи"
            value={toggles.autoAiSummaries}
            onToggle={() => flip('autoAiSummaries')}
          />
          <Row
            label="Распознавание речи"
            hint="Русский язык, модель large"
            value={toggles.speechRecognition}
            onToggle={() => flip('speechRecognition')}
          />
          <Row
            label="Генерация тезисов"
            hint="Краткое содержание + термины"
            value={toggles.generateTheses}
            onToggle={() => flip('generateTheses')}
          />
        </div>

        {/* Безопасность */}
        <div className="card">
          <div className="card-header">
            <h3>🛡️ Безопасность</h3>
          </div>
          <Row
            label="Двухфакторная аутентификация"
            hint="Для актива группы"
            value={toggles.twoFactor}
            onToggle={() => flip('twoFactor')}
          />
          <Row
            label="Логирование действий"
            hint="История изменений ролей и материалов"
            value={toggles.auditLog}
            onToggle={() => flip('auditLog')}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Экспорт данных</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Скачать отчёт по группе</div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={handleExport}
            >
              ⬇️ Скачать
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!canEdit}
        >
          💾 Сохранить настройки
        </button>
      </div>
    </PageWrapper>
  );
}