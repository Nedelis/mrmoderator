import { useState, useEffect, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { useRoles } from '../contexts/RolesContext';
import { api } from '../api/client';
import { permissionLabel } from '../config/permissionLabels';
import { rules, validateObject } from '../lib/validation';
import type { RoleId, Student } from '../types/api';

export default function Roles() {
    const { can, canAssign, assignableRoles, user } = useCurrentUser();
    const { roles } = useRoles();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState<RoleId>('');
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Состояние модалки переименования
    const [renamingStudent, setRenamingStudent] = useState<Student | null>(null);
    const [newName, setNewName] = useState('');
    const [nameError, setNameError] = useState('');

    const load = () => api.getStudents().then(setStudents);

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (
            assignableRoles.length > 0 &&
            !assignableRoles.find(r => r.id === selectedRoleId)
        ) {
            setSelectedRoleId(assignableRoles[0].id);
        }
    }, [assignableRoles, selectedRoleId]);

    const canEditRoles = can('roles.assign');
    const canRemoveMember = can('group.edit');
    const canRename = can('group.edit'); // только староста

    const myFullName = user ? `${user.firstName} ${user.lastName}` : '';
    const isSelf = (name: string) => name === myFullName;

    const selectedRole = roles.find(r => r.id === selectedRoleId) ?? null;
    const canAssignSelected =
        !!selectedRoleId && !isSelf(selectedStudent) && canAssign(selectedRoleId);

    // Список студентов для селекта — без себя
    const selectableStudents = students.filter(s => !isSelf(s.name));

    const handleAssign = async () => {
        if (!selectedStudent) {
            showToast('Выберите студента', 'error');
            return;
        }
        if (isSelf(selectedStudent)) {
            showToast('Нельзя менять роль самому себе', 'error');
            return;
        }
        if (!canAssignSelected) {
            showToast('Недостаточно прав', 'error');
            return;
        }
        await run(
            () => api.assignRole({ studentId: selectedStudent, roleId: selectedRoleId }),
            {
                successMessage: `Роль «${selectedRole?.label}» назначена: ${selectedStudent}`,
                onSuccess: load,
            }
        );
    };

    const openEditRole = (s: Student) => {
        if (!canEditRoles) {
            showToast('Нет прав на изменение роли', 'error');
            return;
        }
        if (isSelf(s.name)) {
            showToast('Нельзя менять роль самому себе', 'error');
            return;
        }
        setEditingStudent(s);
        setSelectedStudent(s.name);
        setSelectedRoleId(s.role || 'student');
    };

    const handleSaveRole = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingStudent || !selectedRoleId) return;

        if (isSelf(editingStudent.name)) {
            showToast('Нельзя менять роль самому себе', 'error');
            return;
        }
        if (!canAssign(selectedRoleId)) {
            showToast('Недостаточно прав на эту роль', 'error');
            return;
        }

        await run(
            () => api.assignRole({ studentId: editingStudent.name, roleId: selectedRoleId }),
            {
                successMessage: `Роль обновлена: ${editingStudent.name}`,
                onSuccess: () => {
                    setEditingStudent(null);
                    load();
                },
            }
        );
    };

    const handleRemoveMember = async (s: Student) => {
        if (!canRemoveMember) {
            showToast('Только староста может удалять участников', 'error');
            return;
        }
        if (isSelf(s.name)) {
            showToast('Нельзя удалить себя из группы', 'error');
            return;
        }
        if (!confirm(`Удалить «${s.name}» из группы?`)) return;

        await run(() => api.removeGroupMember(s.name), {
            successMessage: `Участник «${s.name}» удалён`,
            errorMessage: 'Ошибка удаления',
            onSuccess: load,
        });
    };

    // Открыть модалку переименования
    const openRename = (s: Student) => {
        if (!canRename) {
            showToast('Только староста может переименовывать участников', 'error');
            return;
        }
        setRenamingStudent(s);
        setNewName(s.name);
        setNameError('');
    };

    const handleRename = async (e: FormEvent) => {
        e.preventDefault();
        if (!renamingStudent) return;

        const errs = validateObject(
            { name: newName },
            {
                name: [
                    rules.required('Введите имя'),
                    rules.minLen(2, 'Минимум 2 символа'),
                    rules.maxLen(60),
                ],
            }
        );

        if (errs.name) {
            setNameError(errs.name);
            return;
        }

        if (newName.trim() === renamingStudent.name) {
            setRenamingStudent(null);
            return;
        }

        await run(
            () => api.renameMember(renamingStudent.name, newName.trim()),
            {
                successMessage: `Имя изменено на «${newName.trim()}»`,
                errorMessage: 'Ошибка переименования',
                onSuccess: () => {
                    setRenamingStudent(null);
                    setNewName('');
                    setNameError('');
                    load();
                },
            }
        );
    };

    return (
        <PageWrapper
      title= "Роли и доступ"
    subtitle = "Управление правами участников группы"
        >
        <div className="grid grid-2" style = {{ marginBottom: 20 }
}>
    <div className="card" >
        <div className="card-header" >
            <h3>🪜 Иерархия ролей </h3>
                </div>
                < div style = {{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {
                    [...roles].sort((a, b) => b.level - a.level).map(r => (
                        <div
                key= { r.id }
                style = {{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: 'var(--panel-2)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                    }}
                    >
                    <div
                  className="user-avatar"
style = {{ width: 34, height: 34, fontSize: 13 }}
                >
{ r.label.charAt(0) }
    </div>
    < div style = {{ flex: 1 }}>
        <div style={ { fontSize: 13, fontWeight: 600 } }> { r.label } </div>
            < div style = {{ fontSize: 11, color: 'var(--muted)' }}>
            { r.description }
                </div>
                </div>
                < span className = {`role-badge ${r.badgeClass}`}>
                { r.badgeIcon } { r.badgeText }
</span>
    </div>
            ))}
</div>
    </div>

    < div className = "card" >
        <div className="card-header" >
            <h3>⚙️ Назначить роль </h3>
                </div>

{
    !canEditRoles ? (
        <div
              style= {{
        padding: 20,
            textAlign: 'center',
                color: 'var(--muted)',
                    fontSize: 13,
              }
}
            >
              🔒 У вашей роли нет прав на назначение ролей
    </div>
          ) : (
    <div style= {{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <select
                className="role-select"
value = { selectedStudent }
onChange = { e => setSelectedStudent(e.target.value) }
    >
    <option value="" > Выберите студента...</option>
{
    selectableStudents.map(s => (
        <option key= { s.id } value = { s.name } >
        { s.name }
        </option>
    ))
}
</select>

    < select
className = "role-select"
value = { selectedRoleId }
onChange = { e => setSelectedRoleId(e.target.value) }
disabled = {!selectedStudent}
              >
{
    assignableRoles.map(r => (
        <option key= { r.id } value = { r.id } >
        { r.label }
        </option>
    ))
}
    </select>

{
    selectedRole && (
        <div
                  style={
        {
            background: 'var(--panel-2)',
                borderRadius: 'var(--radius-sm)',
                    padding: 14,
                        border: '1px solid var(--border)',
                  }
    }
                >
        <div
                    style={
        {
            fontSize: 12,
                color: 'var(--muted)',
                    marginBottom: 8,
                    }
    }
                  >
        Права роли «{ selectedRole.label }»:
    </div>
        < div style = {{ display: 'flex', flexWrap: 'wrap', gap: 6 }
}>
{
    selectedRole.permissions.map(p => (
        <span key= { p } className = "tag tag-blue" >
        { permissionLabel(p) }
        </span>
    ))
}
    </div>
    </div>
              )}

<button
                className="btn btn-primary"
style = {{ justifyContent: 'center' }}
onClick = { handleAssign }
disabled = {!canAssignSelected || pending}
              >
{ pending? '⏳ Назначаем...': '✅ Назначить роль' }
    </button>
    </div>
          )}
</div>
    </div>

    < div className = "card" >
        <div className="card-header" >
            <h3>👥 Участники группы </h3>
{
    canRemoveMember && (
        <span className="tag tag-yellow" >
              👑 Вы можете управлять участниками
        </span>
          )
}
</div>
    < table className = "table" >
        <thead>
        <tr>
        <th>Студент </th>
        < th > Роль </th>
        < th > Действия </th>
        </tr>
        </thead>
        <tbody>
{
    students.map(s => {
        const cfg = roles.find(r => r.id === s.role);
        const self = isSelf(s.name);
        return (
            <tr key= { s.id } >
            <td>
            { s.name }
        {
            self && (
                <span
                        className="tag tag-blue"
            style = {{ marginLeft: 8, fontSize: 10 }
        }
                      >
            вы
            </span>
                    )
}
</td>
    <td>
{
    cfg ? (
        <span className= {`role-badge ${cfg.badgeClass}`}>
        { cfg.badgeIcon } { cfg.label }
</span>
                    ) : (
    <span className= "tag tag-gray" >—</span>
                    )}
</td>
    <td>
{
    self ? (
        <span
                        style= {{
        fontSize: 12,
            color: 'var(--muted)',
                        }
}
                      >
                        —
</span>
                    ) : (
    <div style= {{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
                          className="btn btn-ghost"
style = {{ padding: '6px 12px', fontSize: 12 }}
disabled = {!canEditRoles || pending}
onClick = {() => openEditRole(s)}
                        >
                          ✏️ Роль
    </button>
{
    canRename && (
        <button
                            className="btn btn-ghost"
    style = {{ padding: '6px 12px', fontSize: 12 }
}
disabled = { pending }
onClick = {() => openRename(s)}
title = "Изменить отображаемое имя"
    >
                            ✏️ Имя
    </button>
                        )}
{
    canRemoveMember && (
        <button
                            className="btn btn-ghost"
    style = {{
        padding: '6px 12px',
            fontSize: 12,
                color: 'var(--red)',
                            }
}
disabled = { pending }
onClick = {() => handleRemoveMember(s)}
                          >
                            🗑️ Удалить
    </button>
                        )}
</div>
                    )}
</td>
    </tr>
              );
            })}
</tbody>
    </table>
    </div>

{/* Модалка редактирования роли */ }
<Modal
        open={ !!editingStudent }
onClose = {() => setEditingStudent(null)}
title = {`Изменить роль · ${editingStudent?.name ?? ''}`}
      >
    <form
          onSubmit={ handleSaveRole }
style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
    <div>
    <label style={ { fontSize: 12, color: 'var(--muted)' } }>
        Новая роль
            </label>
            < select
className = "role-select"
style = {{ width: '100%', marginTop: 4 }}
value = { selectedRoleId }
onChange = { e => setSelectedRoleId(e.target.value) }
    >
{
    assignableRoles.map(r => (
        <option key= { r.id } value = { r.id } >
        { r.label }
        </option>
    ))
}
    </select>
    < div
style = {{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}
            >
    Роль «Староста» нельзя назначить через интерфейс
        </div>
        </div>

{
    selectedRole && (
        <div
              style={
        {
            background: 'var(--panel-2)',
                borderRadius: 'var(--radius-sm)',
                    padding: 14,
                        border: '1px solid var(--border)',
              }
    }
            >
        <div
                style={
        {
            fontSize: 12,
                color: 'var(--muted)',
                    marginBottom: 8,
                }
    }
              >
        Права:
    </div>
        < div style = {{ display: 'flex', flexWrap: 'wrap', gap: 6 }
}>
{
    selectedRole.permissions.map(p => (
        <span key= { p } className = "tag tag-blue" >
        { permissionLabel(p) }
        </span>
    ))
}
    </div>
    </div>
          )}

<div style={ { display: 'flex', gap: 10, justifyContent: 'flex-end' } }>
    <button
              type="button"
className = "btn btn-ghost"
onClick = {() => setEditingStudent(null)}
            >
    Отмена
    </button>
    < button type = "submit" className = "btn btn-primary" disabled = { pending } >
    { pending? '⏳ Сохраняем...': '✅ Сохранить' }
        </button>
        </div>
        </form>
        </Modal>

{/* Модалка переименования */ }
<Modal
        open={ !!renamingStudent }
onClose = {() => setRenamingStudent(null)}
title = {`Изменить имя · ${renamingStudent?.name ?? ''}`}
      >
    <form
          onSubmit={ handleRename }
style = {{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
    <div>
    <label style={ { fontSize: 12, color: 'var(--muted)' } }>
        Отображаемое имя
            </label>
            < input
className = {`role-select ${nameError ? 'field-error' : ''}`}
style = {{ width: '100%', marginTop: 4 }}
placeholder = "Например: Иванов Д."
value = { newName }
onChange = { e => setNewName(e.target.value) }
autoFocus
    />
{ nameError && <div className="field-error-msg" > { nameError } </div>}
<div
              style={ { fontSize: 11, color: 'var(--muted)', marginTop: 6 } }
            >
    Имя используется только для отображения в этом приложении.
              Профиль в MAX останется прежним.
            </div>
    </div>

    < div style = {{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
              type="button"
className = "btn btn-ghost"
onClick = {() => setRenamingStudent(null)}
            >
    Отмена
    </button>
    < button type = "submit" className = "btn btn-primary" disabled = { pending } >
    { pending? '⏳ Сохраняем...': '✅ Сохранить' }
        </button>
        </div>
        </form>
        </Modal>
        </PageWrapper>
  );
}