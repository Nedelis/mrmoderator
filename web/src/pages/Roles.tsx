import { useState, useEffect } from 'react';
import PageWrapper from '../components/PageWrapper';
import { useCurrentUser } from '../contexts/CurrentUserContext';
import { useRoles } from '../contexts/RolesContext';
import { api } from '../api/client';
import type { RoleId, Student } from '../types/api';
import { useToast } from '../components/Toast';

export default function Roles() {
  const { role: currentRole, can, canAssign, assignableRoles } = useCurrentUser();
  const { roles } = useRoles();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>('');

  useEffect(() => {
    api.getStudents().then(setStudents);
  }, []);

  // Если список доступных ролей обновился — подстрахуемся
  useEffect(() => {
    if (assignableRoles.length > 0 && !assignableRoles.find(r => r.id === selectedRoleId)) {
      setSelectedRoleId(assignableRoles[0].id);
    }
  }, [assignableRoles, selectedRoleId]);

  const canEditRoles = can('roles.assign');
  const selectedRole = roles.find(r => r.id === selectedRoleId) ?? null;
  const canAssignSelected = selectedRoleId ? canAssign(selectedRoleId) : false;

  const handleAssign = async () => {
        if (!selectedStudent) {
            showToast('Выберите студента', 'error');
            return;
        }
        if (!canAssignSelected) {
            showToast('Недостаточно прав', 'error');
            return;
        }
        try {
            await api.assignRole({ studentId: selectedStudent, roleId: selectedRoleId });
            showToast(`Роль «${selectedRole?.label}» назначена: ${selectedStudent}`, 'success');
            // Обновляем список
            api.getStudents().then(setStudents);
        } catch (err: any) {
            showToast(err.message || 'Ошибка', 'error');
        }
    };

  return (
    <PageWrapper
      title="Роли и доступ"
      subtitle="Управление правами участников группы"
      actions={
        canEditRoles ? (
          <button
            className="btn btn-primary"
            onClick={() => showToast('Функция появится в следующей версии', 'info')}
            >
            + Добавить участника
           </button>
        ) : null
      }
    >
      {/* Иерархия ролей — рендерим в порядке убывания level */}
      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3>🪜 Иерархия ролей</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...roles]
              .sort((a, b) => b.level - a.level)
              .map(r => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'var(--panel-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                    {r.label.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {r.description}
                    </div>
                  </div>
                  <span className={`role-badge ${r.badgeClass}`}>
                    {r.badgeIcon} {r.badgeText}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>⚙️ Назначить роль</h3>
          </div>

          {!canEditRoles ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              🔒 У вашей роли нет прав на назначение ролей
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <select
                className="role-select"
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
              >
                <option value="">Выберите студента...</option>
                {students.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>

              <select
                className="role-select"
                value={selectedRoleId}
                onChange={e => setSelectedRoleId(e.target.value)}
              >
                {assignableRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>

              {selectedRole && (
                <div
                  style={{
                    background: 'var(--panel-2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 14,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    Права роли «{selectedRole.label}»:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedRole.permissions.map(p => (
                      <span key={p} className="tag tag-blue">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ justifyContent: 'center' }}
                onClick={handleAssign}
                disabled={!canAssignSelected}
              >
                ✅ Назначить роль
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>👥 Участники группы</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Студент</th>
              <th>Роль</th>
              <th>Пунктов меню</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const cfg = roles.find(r => r.id === s.role);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    {cfg ? (
                      <span className={`role-badge ${cfg.badgeClass}`}>
                        {cfg.badgeIcon} {cfg.label}
                      </span>
                    ) : (
                      <span className="tag tag-gray">—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {cfg?.menu.length ?? 0}
                    </span>
                  </td>
                  <td>
                    <button
  className="btn btn-ghost"
  style={{ padding: '6px 12px', fontSize: 12 }}
  disabled={!canEditRoles}
  onClick={() => showToast(`Редактирование ${s.name} — в разработке`, 'info')}
>
  ✏️
</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}