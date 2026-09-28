import { useState, useEffect, FormEvent } from 'react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { useRoles } from '../contexts/RolesContext';
import { api } from '../api/client';
import { permissionLabel } from '../config/permissionLabels';
import { rules, validateObject } from '../utils/validation';
import type { RoleId, Student } from '../types/api';

export default function Roles() {
    const { can, canAssign, assignableRoles, user } = useCurrentUser();
    const { roles } = useRoles();
    const { showToast } = useToast();
    const { pending, run } = useAsyncAction();

    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState<RoleId>('');

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
    const canRename = can('group.edit');
    const canRemove = can('group.edit');

    const myFullName = user ? `${user.firstName} ${user.lastName}` : '';

    /**
     * Проверка «это я». Сравниваем и по id, и по имени:
     * — на бэке id студента совпадает с id текущего юзера (одна и та же запись в БД),
     * — в моках id могут не совпадать, но имя точное.
     */
    const isSelf = (s: Student) =>
        (!!user?.id && s.id === user.id) ||
        (!!myFullName && s.name === myFullName);

    const selectedRole = roles.find(r => r.id === selectedRoleId) ?? null;

    // Селект «Назначить роль» — без себя
    const selectableStudents = students.filter(s => !isSelf(s));

    const canAssignSelected =
        !!selectedRoleId &&
        !!selectedStudentId &&
        selectableStudents.some(s => s.id === selectedStudentId) &&
        canAssign(selectedRoleId);

    const handleAssign = async () => {
        const target = students.find(s => s.id === selectedStudentId);

        if (!target) {
            showToast('Выберите студента', 'error');
            return;
        }
        if (isSelf(target)) {
            showToast('Нельзя менять роль самому себе', 'error');
            return;
        }
        if (!canAssignSelected) {
            showToast('Недостаточно прав', 'error');
            return;
        }

        await run(
            () => api.assignRole({ studentId: target.id, roleId: selectedRoleId }),
            {
                successMessage: `Роль «${selectedRole?.label}» назначена: ${target.name}`,
                onSuccess: load,
            }
        );
    };

    const handleRemove = async (s: Student) => {
        if (!canRemove) {
            showToast('Только староста может удалять участников', 'error');
            return;
        }
        if (isSelf(s)) {
            showToast('Нельзя удалить себя из группы', 'error');
            return;
        }
        if (!confirm(`Удалить «${s.name}» из группы?`)) return;

        await run(() => api.removeGroupMember(s.id), {
            successMessage: `Участник «${s.name}» удалён`,
            onSuccess: load,
        });
    };

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
            () => api.renameMember(renamingStudent.id, newName.trim()),
            {
                successMessage: `Имя изменено на «${newName.trim()}»`,
                errorMessage: 'Ошибка переименования',
                onSuccess: () => {
                    setRenamingStudent(null);
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
value = { selectedStudentId }
onChange = { e => setSelectedStudentId(e.target.value) }
    >
    <option value="" > Выберите студента...</option>
{
    selectableStudents.map(s => (
        <option key= { s.id } value = { s.id } >
        { s.name }
        </option>
    ))
}
</select>

    < select
className = "role-select"
value = { selectedRoleId }
onChange = { e => setSelectedRoleId(e.target.value) }
disabled = {!selectedStudentId}
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
        const cfg = roles.find(r => r.id === s.role || r.label === s.role);
        const self = isSelf(s);
        const selfStarosta = self && s.role === 'starosta';

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
{/* Себя: обычные роли — без действий */ }
{
    self && !selfStarosta && (
        <span style={ { fontSize: 12, color: 'var(--muted)' } }>
                        —
    </span>
                    )
}

{/* Себя-староста: только переименование */ }
{
    selfStarosta && (
        <button
                        className="btn btn-ghost"
    style = {{ padding: '6px 12px', fontSize: 12 }
}
disabled = { pending }
onClick = {() => openRename(s)}
title = "Изменить отображаемое имя"
    >
                        ✏️ Изменить имя
    </button>
                    )}

{/* Другие участники */ }
{
    !self && (
        <div style={ { display: 'flex', gap: 6, flexWrap: 'wrap' } }>
        { canRename && (
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
    canRemove && (
        <button
                            className="btn btn-ghost"
    style = {{
        padding: '6px 12px',
            fontSize: 12,
                color: 'var(--red)',
                            }
}
disabled = { pending }
onClick = {() => handleRemove(s)}
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
<div style={ { fontSize: 11, color: 'var(--muted)', marginTop: 6 } }>
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