import { useEffect, useState, useRef, ChangeEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import type { Material } from '../types/api';

export default function Materials() {
  const { can } = useCurrentUser();
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [filter, setFilter] = useState('Все');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = can('material.upload');
  const canAi = can('material.ai');

  const load = () => {
    api.getMaterials().then(setMaterials);
  };

  useEffect(() => {
    load();
  }, []);

  const filters = ['Все', 'Лекции', 'Семинары', 'AI-конспекты', 'Мои загрузки'];

  const handleUploadClick = () => {
    if (!canUpload) {
      showToast('У вашей роли нет прав на загрузку материалов', 'error');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await api.uploadMaterial({
        title: file.name,
        type: file.type.startsWith('video') ? 'video' : 'pdf',
        file,
      });
      showToast(`Файл «${file.name}» загружен`, 'success');
      load();
    } catch (err: any) {
      showToast(err.message || 'Ошибка загрузки', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAi = async () => {
    if (!canAi) {
      showToast('У вашей роли нет прав на AI-обработку', 'error');
      return;
    }
    const target = materials[0];
    if (!target) {
      showToast('Нет материалов для обработки', 'error');
      return;
    }
    setAiRunning(true);
    try {
      const res: any = await api.runAiProcessing({ materialId: target.id });
      showToast(`AI: ${res.summary}`, 'success');
      load();
    } catch (err: any) {
      showToast(err.message || 'Ошибка AI-обработки', 'error');
    } finally {
      setAiRunning(false);
    }
  };

  const handleDownload = async (id: string, title: string) => {
    try {
      await api.downloadMaterial(id);
      showToast(`Файл «${title}» скачивается...`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Ошибка скачивания', 'error');
    }
  };

  const handleFilterClick = (f: string) => {
    setFilter(f);
    showToast(`Фильтр: ${f}`, 'info');
  };

  return (
    <PageWrapper
      title="Материалы"
      subtitle="Лекции, конспекты, записи и AI-обработка"
      actions={
        <>
          <button
            className="btn btn-ghost"
            onClick={handleAi}
            disabled={aiRunning || !canAi}
          >
            {aiRunning ? '⏳ Обработка...' : '🤖 AI-конспект'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUploadClick}
            disabled={uploading || !canUpload}
          >
            {uploading ? '⏳ Загрузка...' : '📤 Загрузить'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <span
            key={f}
            className={`tag ${f === filter ? 'tag-blue' : 'tag-gray'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => handleFilterClick(f)}
          >
            {f}
          </span>
        ))}
      </div>

      <div className="grid grid-2">
        <div>
          {materials.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              Материалов пока нет
            </div>
          )}
          {materials.map(m => (
            <div
              key={m.id}
              className="card"
              style={{ marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center' }}
            >
              <div
                className={`reminder-icon ${
                  m.type === 'pdf' ? 'red' : m.type === 'video' ? 'blue' : 'green'
                }`}
              >
                {m.type === 'pdf' ? '📄' : m.type === 'video' ? '🎬' : '🤖'}
              </div>
              <div className="reminder-content" style={{ flex: 1 }}>
                <div className="title">{m.title}</div>
                <div className="meta">
                  <span>👤 {m.author}</span>
                  <span>🕐 {m.createdAt}</span>
                </div>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '8px 12px' }}
                onClick={() => handleDownload(m.id, m.title)}
                title="Скачать"
              >
                ⬇️
              </button>
              {m.type === 'video' && canAi && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '8px 12px' }}
                  onClick={async () => {
                    setAiRunning(true);
                    try {
                      const res: any = await api.runAiProcessing({ materialId: m.id });
                      showToast(`AI: ${res.summary}`, 'success');
                    } catch (err: any) {
                      showToast(err.message || 'Ошибка AI', 'error');
                    } finally {
                      setAiRunning(false);
                    }
                  }}
                  title="Сделать AI-конспект"
                >
                  🤖
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🤖 AI-обработка</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
            Загрузите аудио или видео лекции — AI автоматически распознает речь, структурирует
            материал и создаст краткий конспект с тезисами.
          </p>
          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: 30,
              textAlign: 'center',
              marginBottom: 16,
              cursor: canUpload ? 'pointer' : 'not-allowed',
              opacity: canUpload ? 1 : 0.5,
            }}
            onClick={handleUploadClick}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>☁️</div>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {canUpload ? 'Перетащите файл или нажмите для выбора' : 'Загрузка недоступна для вашей роли'}
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleAi}
            disabled={aiRunning || !canAi}
          >
            {aiRunning ? '⏳ Обработка...' : '✨ Запустить AI-обработку'}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}