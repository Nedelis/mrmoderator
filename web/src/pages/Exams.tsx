import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../utils/validation';
import type { Exam } from '../types/api';

export default function Exams() {
    const { can } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [exams, setExams] = useState<Exam[]>([]);
    const [modalExam, setModalExam] = useState<Exam | null>(null);

    const [form, setForm] = useState<{ title: string; url: string; file: File | null }>({
        title: '',
        url: '',
        file: null,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const canAdd = can('exam.addMaterial');

    const load = () => api.getExams().then(setExams);

    useEffect(() => {
        load();
    }, []);

    const examsList = exams.filter(e => e.type === 'exam');
    const consultationsList = exams.filter(e => e.type === 'consultation');

    const openAddMaterial = (exam: Exam) => {
        if (!canAdd) {
            showToast('У вашей роли нет прав на добавление материалов', 'error');
            return;
        }
        setModalExam(exam);
        setForm({ title: '', url: '', file: null });
        setErrors({});
    };

    const closeModal = () => {
        setModalExam(null);
        setForm({ title: '', url: '', file: null });
        setErrors({});
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && file.size > 50 * 1024 * 1024) {
            showToast('Файл больше 50 МБ', 'error');
            return;
        }
        setForm(prev => ({
            ...prev,
            file,
            // Если файл выбран, а названия нет — подставляем имя файла
            title: prev.title || file?.name || '',
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!modalExam) return;

        const errs = validateObject(form, {
            title: [rules.required('Введите название'), rules.minLen(3), rules.maxLen(120)],
        });

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        await run(
            () =>
                api.addExamMaterial({
                    examId: modalExam.id,
                    title: form.title.trim(),
                    url: form.url.trim() || undefined,
                    file: form.file ?? undefined,
                }),
            {
                successMessage: 'Материал добавлен к экзамену',
                onSuccess: () => {
                    closeModal();
                    load();
                },
            }
        );
    };

    const handleDeleteMaterial = async (examId: string, materialId: string, title: string) => {
        if (!canAdd) {
            showToast('Нет прав', 'error');
            return;
        }
        if (!confirm(`Удалить материал «${title}»?`)) return;
        await run(() => api.deleteExamMaterial(examId, materialId), {
            successMessage: 'Материал удалён',
            onSuccess: load,
        });
    };

    const renderExam = (e: Exam) => (
        <div key= { e.id } className = "card" style = {{ marginBottom: 16 }
}>
    <div style={ { display: 'flex', gap: 12, alignItems: 'flex-start' } }>
        <div className="reminder-icon red" > { e.icon } </div>
            < div className = "reminder-content" style = {{ flex: 1 }}>
                <div className="title" > { e.subject } </div>
                    < div className = "desc" > Ауд. { e.room } · { e.teacher } </div>
                        < div className = "meta" >
                            <span>🕐 { e.date } </span>
                                </div>

{
    e.materials.length > 0 && (
        <div style={ { marginTop: 12 } }>
            <div style={ { fontSize: 12, color: 'var(--muted)', marginBottom: 6 } }>
                Материалы:
    </div>
        < div style = {{ display: 'flex', flexDirection: 'column', gap: 6 }
}>
{
    e.materials.map(m => (
        <div
                    key= { m.id }
                    style = {{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'var(--panel-2)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13,
    }}
    >
    <span>📎</span>
        < span style = {{ flex: 1 }}> { m.title } </span>
            < span style = {{ fontSize: 11, color: 'var(--muted)' }}>
            { m.addedBy }
                </span>
{
    canAdd && (
        <button
                        className="icon-btn"
    onClick = {() => handleDeleteMaterial(e.id, m.id, m.title)
}
disabled = { pending }
title = "Удалить"
    >
                        🗑️
</button>
                    )}
</div>
                ))}
</div>
    </div>
          )}
</div>
{
    canAdd && (
        <button
            className="btn btn-ghost"
    style = {{ padding: '6px 12px', fontSize: 12 }
}
onClick = {() => openAddMaterial(e)}
disabled = { pending }
    >
            ➕ Материал
    </button>
        )}
</div>
    </div>
  );

return (
    <PageWrapper title= "Экзамены" subtitle = "Расписание сессии и консультаций" >
        <div className="grid grid-2" >
            <div className="card" >
                <div className="card-header" >
                    <h3>📅 Ближайшие экзамены </h3>
                        </div>
{ examsList.map(renderExam) }
</div>

    < div className = "card" >
        <div className="card-header" >
            <h3>💬 Консультации </h3>
                </div>
{ consultationsList.map(renderExam) }
</div>
    </div>

    < Modal
open = {!!modalExam}
onClose = { closeModal }
title = {`Добавить материал · ${modalExam?.subject ?? ''}`}
      >
    <form
          onSubmit={ handleSubmit }
style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
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

    < input
className = "role-select"
style = {{ width: '100%' }}
placeholder = "Ссылка (необязательно)"
value = { form.url }
onChange = { e => setForm({ ...form, url: e.target.value })}
          />

    < div >
    <label style={ { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 } }>
        Или загрузите файл(необязательно)
            </label>
            < input
type = "file"
className = "role-select"
style = {{ width: '100%' }}
onChange = { handleFileChange }
    />
{
    form.file && (
        <div style={ { fontSize: 11, color: 'var(--green)', marginTop: 4 } }>
                📎 { form.file.name } ({(form.file.size / 1024).toFixed(1)} КБ)
</div>
            )}
</div>

    < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className = "btn btn-ghost" onClick = { closeModal } >
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