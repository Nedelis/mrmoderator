import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../utils/validation';
import type { Material } from '../types/api';

const MAX_URL_PATTERN = /^https?:\/\/(www\.)?max\.ru\/c\/.+/;

export default function Materials() {
    const { can, user } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [materials, setMaterials] = useState<Material[]>([]);
    const [filter, setFilter] = useState('Все');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ title: '', type: 'pdf', url: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const openUpload = () => {
        if (!canUpload) {
            showToast('У вашей роли нет прав на загрузку материалов', 'error');
            return;
        }
        setForm({ title: '', type: 'pdf', url: '' });
        setErrors({});
        setModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const errs = validateObject(form, {
            title: [rules.required('Введите название'), rules.minLen(3), rules.maxLen(120)],
            url: [
                rules.required('Вставьте ссылку на сообщение в MAX'),
                (v: string) =>
                    MAX_URL_PATTERN.test(v.trim())
                        ? null
                        : 'Ссылка должна быть вида https://max.ru/c/...',
            ],
        });

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        await run(
            () =>
                api.uploadMaterial({
                    title: form.title.trim(),
                    type: form.type,
                    url: form.url.trim(),
                }),
            {
                successMessage: 'Материал добавлен',
                errorMessage: 'Ошибка добавления',
                onSuccess: () => {
                    setModalOpen(false);
                    load();
                },
            }
        );
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

    const handleOpenInMax = (m: Material) => {
        if (!m.maxUrl) {
            showToast('Ссылка недоступна', 'error');
            return;
        }
        // В проде: window.WebApp.openLink(m.maxUrl) или openMaxLink
        window.open(m.maxUrl, '_blank');
    };

    return (
        <PageWrapper
      title= "Материалы"
    subtitle = "Ссылки на сообщения с материалами в MAX"
    actions = {
        canUpload?(
          <button className = "btn btn-primary" onClick = { openUpload } disabled = { pending } >
            ➕ Добавить материал
          </ button >
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
            <div className="card" style = {{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
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
    <div className={ `reminder-icon ${m.type === 'pdf' ? 'red' : m.type === 'video' ? 'blue' : 'green'}` }>
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
onClick = {() => handleOpenInMax(m)}
disabled = { pending }
title = "Открыть в MAX"
    >
              ↗️
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

    < Modal open = { modalOpen } onClose = {() => setModalOpen(false)} title = "Добавить материал" >
        <form onSubmit={ handleSubmit } style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
            <input
              className={ `role-select ${errors.title ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Название материала"
value = { form.title }
onChange = { e => setForm({ ...form, title: e.target.value })}
            />
{ errors.title && <div className="field-error-msg" > { errors.title } </div> }
</div>

    < select
className = "role-select"
value = { form.type }
onChange = { e => setForm({ ...form, type: e.target.value })}
          >
    <option value="pdf" > PDF / документ </option>
        < option value = "video" > Видео </option>
            < option value = "other" > Другое </option>
                </select>

                < div >
                <input
              className={ `role-select ${errors.url ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "https://max.ru/c/..."
value = { form.url }
onChange = { e => setForm({ ...form, url: e.target.value })}
            />
{ errors.url && <div className="field-error-msg" > { errors.url } </div> }
<div style={ { fontSize: 11, color: 'var(--muted)', marginTop: 6 } }>
    Скопируйте ссылку на сообщение с материалом в чате MAX.
              Бот сам перешлёт его в группу.
            </div>
    </div>

    < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className = "btn btn-ghost" onClick = {() => setModalOpen(false)}>
            Отмена
            </button>
            < button type = "submit" className = "btn btn-primary" disabled = { pending } >
            { pending? '⏳ Сохраняем...': '✅ Добавить' }
                </button>
                </div>
                </form>
                </Modal>
                </PageWrapper>
  );
}