import { useEffect, useState, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { api } from '../api/client';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { rules, validateObject } from '../utils/validation';
import { formatDateTime, formatDate } from '../utils/date';
import type { Exam } from '../types/api';

interface ExamForm {
    subject: string;
    type: 'exam' | 'consultation';
    date: string;
    time: string;
    room: string;
    teacher: string;
    icon: string;
}

const emptyForm: ExamForm = {
    subject: '',
    type: 'exam',
    date: '',
    time: '',
    room: '',
    teacher: '',
    icon: '📚',
};

export default function Exams() {
    const { can } = useCurrentUser();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [exams, setExams] = useState<Exam[]>([]);
    const [examModalOpen, setExamModalOpen] = useState(false);
    const [materialExam, setMaterialExam] = useState<Exam | null>(null);

    const [examForm, setExamForm] = useState<ExamForm>(emptyForm);
    const [examErrors, setExamErrors] = useState<Record<string, string>>({});

    const [materialForm, setMaterialForm] = useState({ title: '', url: '' });
    const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({});

    const canCreateExam = can('exam.create');
    const canAddMaterial = can('exam.addMaterial');

    const load = () => api.getExams().then(setExams);

    useEffect(() => {
        load();
    }, []);

    const examsList = exams.filter(e => e.type === 'exam');
    const consultationsList = exams.filter(e => e.type === 'consultation');

    // ===== Создание экзамена =====
    const openCreateExam = () => {
        if (!canCreateExam) {
            showToast('У вашей роли нет прав на создание экзаменов', 'error');
            return;
        }
        setExamForm(emptyForm);
        setExamErrors({});
        setExamModalOpen(true);
    };

    const handleCreateExam = async (e: FormEvent) => {
        e.preventDefault();

        const errs = validateObject(examForm, {
            subject: [rules.required('Введите название'), rules.minLen(2), rules.maxLen(120)],
            date: [rules.date({ minYearOffset: 0, maxYearOffset: 1 })],
            time: [rules.time()],
        });

        if (Object.keys(errs).length > 0) {
            setExamErrors(errs);
            return;
        }

        await run(
            () => api.createExam(examForm),
            {
                successMessage: 'Экзамен добавлен',
                errorMessage: 'Ошибка сохранения',
                onSuccess: () => {
                    setExamModalOpen(false);
                    setExamForm(emptyForm);
                    load();
                },
            }
        );
    };

    // ===== Материалы к экзамену =====
    const openAddMaterial = (exam: Exam) => {
        if (!canAddMaterial) {
            showToast('У вашей роли нет прав на добавление материалов', 'error');
            return;
        }
        setMaterialExam(exam);
        setMaterialForm({ title: '', url: '' });
        setMaterialErrors({});
    };

    const handleAddMaterial = async (e: FormEvent) => {
        e.preventDefault();
        if (!materialExam) return;

        const errs = validateObject(materialForm, {
            title: [rules.required('Введите название'), rules.minLen(3), rules.maxLen(120)],
        });

        if (Object.keys(errs).length > 0) {
            setMaterialErrors(errs);
            return;
        }

        await run(
            () =>
                api.addExamMaterial({
                    examId: materialExam.id,
                    title: materialForm.title.trim(),
                    url: materialForm.url.trim() || undefined,
                }),
            {
                successMessage: 'Материал добавлен',
                onSuccess: () => {
                    setMaterialExam(null);
                    load();
                },
            }
        );
    };

    const handleDeleteMaterial = async (examId: string, materialId: string, title: string) => {
        if (!canAddMaterial) return;
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
                    < div className = "desc" >
                    { e.room ? `Ауд. ${e.room}` : '' }
{ e.room && e.teacher ? ' · ' : '' }
{ e.teacher }
</div>
    < div className = "meta" >
        <span>🕐 { formatDateTime(e.date) } </span>
            </div>

{
    e.materials.length > 0 && (
        <div style={ { marginTop: 12 } }>
            <div style={ { fontSize: 12, color: 'var(--muted)', marginBottom: 6 } }> Материалы: </div>
                < div style = {{ display: 'flex', flexDirection: 'column', gap: 6 }
}>
{
    e.materials.map(m => (
        <div
                    key= { m.id }
                    style = {{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', background: 'var(--panel-2)',
        borderRadius: 'var(--radius-sm)', fontSize: 13,
    }}
    >
    <span>📎</span>
        < span style = {{ flex: 1 }}> { m.title } </span>
            < span style = {{ fontSize: 11, color: 'var(--muted)' }}> { m.addedBy } </span>
{
    canAddMaterial && (
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
    canAddMaterial && (
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
    <PageWrapper
      title= "Экзамены"
subtitle = "Расписание сессии и консультаций"
actions = {
    canCreateExam?(
          <button className = "btn btn-primary" onClick = { openCreateExam } disabled = { pending } >
            ➕ Добавить экзамен
          </ button >
        ) : null
      }
    >
    <div className="grid grid-2" >
        <div className="card" >
            <div className="card-header" >
                <h3>📅 Ближайшие экзамены </h3>
                    </div>
{
    examsList.length === 0 && (
        <div style={ { textAlign: 'center', color: 'var(--muted)', padding: 24, fontSize: 13 } }>
            Экзаменов пока нет
                </div>
          )
}
{ examsList.map(renderExam) }
</div>

    < div className = "card" >
        <div className="card-header" >
            <h3>💬 Консультации </h3>
                </div>
{
    consultationsList.length === 0 && (
        <div style={ { textAlign: 'center', color: 'var(--muted)', padding: 24, fontSize: 13 } }>
            Консультаций пока нет
                </div>
          )
}
{ consultationsList.map(renderExam) }
</div>
    </div>

{/* Модалка создания экзамена */ }
<Modal
        open={ examModalOpen }
onClose = {() => setExamModalOpen(false)}
title = "Новый экзамен"
    >
    <form onSubmit={ handleCreateExam } style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
        <input
              className={ `role-select ${examErrors.subject ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Название предмета"
value = { examForm.subject }
onChange = { e => setExamForm({ ...examForm, subject: e.target.value })}
            />
{ examErrors.subject && <div className="field-error-msg" > { examErrors.subject } </div> }
</div>

    < select
className = "role-select"
value = { examForm.type }
onChange = { e => setExamForm({ ...examForm, type: e.target.value as any })}
          >
    <option value="exam" > Экзамен </option>
        < option value = "consultation" > Консультация </option>
            </select>

            < div style = {{ display: 'flex', gap: 10 }}>
                <div style={ { flex: 1 } }>
                    <input
                className={ `role-select ${examErrors.date ? 'field-error' : ''}` }
style = {{ width: '100%' }}
type = "date"
value = { examForm.date }
onChange = { e => setExamForm({ ...examForm, date: e.target.value })}
              />
{ examErrors.date && <div className="field-error-msg" > { examErrors.date } </div> }
</div>
    < div style = {{ flex: 1 }}>
        <input
                className={ `role-select ${examErrors.time ? 'field-error' : ''}` }
style = {{ width: '100%' }}
type = "time"
value = { examForm.time }
onChange = { e => setExamForm({ ...examForm, time: e.target.value })}
              />
{ examErrors.time && <div className="field-error-msg" > { examErrors.time } </div> }
</div>
    </div>

    < input
className = "role-select"
style = {{ width: '100%' }}
placeholder = "Аудитория (например: 412)"
value = { examForm.room }
onChange = { e => setExamForm({ ...examForm, room: e.target.value })}
          />

    < input
className = "role-select"
style = {{ width: '100%' }}
placeholder = "Преподаватель (например: Смирнов А.В.)"
value = { examForm.teacher }
onChange = { e => setExamForm({ ...examForm, teacher: e.target.value })}
          />

    < input
className = "role-select"
style = {{ width: '100%' }}
placeholder = "Иконка (эмодзи, например 📚)"
value = { examForm.icon }
onChange = { e => setExamForm({ ...examForm, icon: e.target.value })}
          />

    < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className = "btn btn-ghost" onClick = {() => setExamModalOpen(false)}>
            Отмена
            </button>
            < button type = "submit" className = "btn btn-primary" disabled = { pending } >
            { pending? '⏳ Сохраняем...': '✅ Добавить' }
                </button>
                </div>
                </form>
                </Modal>

{/* Модалка материала */ }
<Modal
        open={ !!materialExam }
onClose = {() => setMaterialExam(null)}
title = {`Добавить материал · ${materialExam?.subject ?? ''}`}
      >
    <form onSubmit={ handleAddMaterial } style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
        <input
              className={ `role-select ${materialErrors.title ? 'field-error' : ''}` }
style = {{ width: '100%' }}
placeholder = "Название материала"
value = { materialForm.title }
onChange = { e => setMaterialForm({ ...materialForm, title: e.target.value })}
            />
{ materialErrors.title && <div className="field-error-msg" > { materialErrors.title } </div> }
</div>

    < input
className = "role-select"
style = {{ width: '100%' }}
placeholder = "Ссылка (необязательно)"
value = { materialForm.url }
onChange = { e => setMaterialForm({ ...materialForm, url: e.target.value })}
          />

    < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className = "btn btn-ghost" onClick = {() => setMaterialExam(null)}>
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