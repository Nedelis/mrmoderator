import { useEffect, useState, useRef, ChangeEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import type { Material } from '../types/api';

export default function Materials() {
    const { can, user } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [materials, setMaterials] = useState<Material[]>([]);
    const [filter, setFilter] = useState('Все');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canUpload = can('material.upload');
    const canDeleteAny = can('material.delete.any');
    const canDeleteOwn = can('material.delete.own');

    const myFullName = user ? `${user.firstName} ${user.lastName}` : '';

    const canDelete = (m: Material) =>
        canDeleteAny || (canDeleteOwn && m.author === myFullName);

    const load = () => api.getMaterials().then(setMaterials);

    useEffect(() => {
        load();
    }, []);

    const filters = ['Все', 'Лекции', 'Семинары', 'Мои загрузки'];

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

        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            showToast('Файл больше 50 МБ', 'error');
            return;
        }

        await run(
            () =>
                api.uploadMaterial({
                    title: file.name,
                    type: file.type.startsWith('video') ? 'video' : 'pdf',
                    file,
                }),
            {
                successMessage: `Файл «${file.name}» загружен`,
                errorMessage: 'Ошибка загрузки',
                onSuccess: load,
            }
        );

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDownload = (id: string, title: string) => {
        run(() => api.downloadMaterial(id), {
            successMessage: `Файл «${title}» скачивается...`,
            errorMessage: 'Ошибка скачивания',
        });
    };

    const handleDelete = async (m: Material) => {
        if (!canDelete(m)) {
            showToast('Нет прав на удаление этого материала', 'error');
            return;
        }
        if (!confirm(`Удалить «${m.title}»?`)) return;
        await run(() => api.deleteMaterial(m.id), {
            successMessage: 'Материал удалён',
            onSuccess: load,
        });
    };

    return (
        <PageWrapper
      title= "Материалы"
    subtitle = "Лекции, конспекты и записи"
    actions = {
        canUpload?(
          <>
        <button
              className="btn btn-primary"
    onClick = { handleUploadClick }
    disabled = { pending }
        >
    { pending? '⏳ Загрузка...': '📤 Загрузить' }
        </button>
        < input
    ref = { fileInputRef }
    type = "file"
    style = {{ display: 'none' }
}
onChange = { handleFileChange }
accept = ".pdf,.doc,.docx,.ppt,.pptx,video/*,audio/*"
    />
    </>
        ) : null
      }
    >
    <div style={ { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' } }>
    {
        filters.map(f => (
            <span
            key= { f }
            className = {`tag ${f === filter ? 'tag-blue' : 'tag-gray'}`}
style = {{ cursor: 'pointer' }}
onClick = {() => setFilter(f)}
          >
{ f }
    </span>
        ))}
</div>

    < div className = "grid grid-1" >
    {
        materials.length === 0 && (
            <div
            className="card"
            style = {{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}
          >
    Материалов пока нет
        </div>
        )}
{
    materials.map(m => (
        <div
            key= { m.id }
            className = "card"
            style = {{ marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center' }}
          >
    <div
              className={
    `reminder-icon ${m.type === 'pdf' ? 'red' : m.type === 'video' ? 'blue' : 'green'
    }`
}
            >
{ m.type === 'pdf' ? '📄' : m.type === 'video' ? '🎬' : '📎' }
    </div>
    < div className = "reminder-content" style = {{ flex: 1 }}>
        <div className="title" > { m.title } </div>
            < div className = "meta" >
                <span>👤 { m.author } </span>
                    <span>🕐 { m.createdAt } </span>
                        </div>
                        </div>
                        < button
className = "btn btn-ghost"
style = {{ padding: '8px 12px' }}
onClick = {() => handleDownload(m.id, m.title)}
disabled = { pending }
title = "Скачать"
    >
              ⬇️
</button>
{
    canDelete(m) && (
        <button
                className="btn btn-ghost"
    style = {{ padding: '8px 12px', color: 'var(--red)' }
}
onClick = {() => handleDelete(m)}
disabled = { pending }
title = "Удалить"
    >
                🗑️
</button>
            )}
</div>
        ))}
</div>
    </PageWrapper>
  );
}