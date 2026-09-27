import { mockApi } from './mock';
import type { Role, CurrentUser } from '../types/api';

const USE_MOCK = true;
const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// Фейковая задержка + 10% шанс ошибки
function fakeDelay<T>(data: T, ms = 600): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error('Сервер временно недоступен'));
      } else {
        resolve(data);
      }
    }, ms);
  });
}

export const api = {
  // ==== ЧТЕНИЕ (как было) ====
  async getRoles(): Promise<Role[]> {
    if (USE_MOCK) return mockApi.getRoles();
    const data = await request<{ roles: Role[] }>('/roles');
    return data.roles;
  },

  async getMe(): Promise<CurrentUser> {
    if (USE_MOCK) return mockApi.getMe();
    const data = await request<{ user: CurrentUser }>('/me');
    return data.user;
  },

  async getGroup() {
    if (USE_MOCK) return mockApi.getGroupInfo();
    return request('/group');
  },

  async getStudents() {
    if (USE_MOCK) return mockApi.getStudents();
    return request('/students');
  },

  async getReminders() {
    if (USE_MOCK) return mockApi.getReminders();
    return request('/reminders');
  },

  async getDebts() {
    if (USE_MOCK) return mockApi.getDebts();
    return request('/debts');
  },

  async getMail() {
    if (USE_MOCK) return mockApi.getMail();
    return request('/mail');
  },

  async getMaterials() {
    if (USE_MOCK) return mockApi.getMaterials();
    return request('/materials');
  },

  // ==== МУТАЦИИ (новые, с заглушкой) ====

  /**
   * Создать напоминалку
   * payload: { title, description, date, time, scope }
   */
  async createReminder(payload: {
    title: string;
    description: string;
    date: string;
    time: string;
    scope: 'group' | 'personal' | 'selected';
  }) {
    if (USE_MOCK) {
      return fakeDelay({
        id: `rem-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
      });
    }
    return request('/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Удалить напоминалку
   */
  async deleteReminder(id: string) {
    if (USE_MOCK) return fakeDelay({ ok: true, id });
    return request(`/reminders/${id}`, { method: 'DELETE' });
  },

  /**
   * Переслать письмо в группу
   */
  async forwardMail(id: string) {
    if (USE_MOCK) {
      return fakeDelay({ ok: true, id, forwardedTo: 'Группа ИУ7-42Б' });
    }
    return request(`/mail/${id}/forward`, { method: 'POST' });
  },

  /**
   * Обновить почту (синхронизация)
   */
  async refreshMail() {
    if (USE_MOCK) {
      return fakeDelay({ ok: true, newMessages: Math.floor(Math.random() * 5) });
    }
    return request('/mail/refresh', { method: 'POST' });
  },

  /**
   * Настроить почтовые ящики
   */
  async configureMailboxes(payload: { sources: string[] }) {
    if (USE_MOCK) return fakeDelay({ ok: true, ...payload });
    return request('/mail/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Назначить роль студенту
   */
  async assignRole(payload: { studentId: string; roleId: string }) {
    if (USE_MOCK) {
      return fakeDelay({ ok: true, ...payload, assignedAt: new Date().toISOString() });
    }
    return request('/roles/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Загрузить материал
   */
  async uploadMaterial(payload: { title: string; type: string; file?: File }) {
    if (USE_MOCK) {
      return fakeDelay({
        id: `mat-${Date.now()}`,
        ...payload,
        createdAt: 'Только что',
      });
    }
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('type', payload.type);
    if (payload.file) formData.append('file', payload.file);
    return request('/materials', { method: 'POST', body: formData });
  },

  /**
   * Запустить AI-обработку
   */
  async runAiProcessing(payload: { materialId: string }) {
    if (USE_MOCK) {
      return fakeDelay({
        ok: true,
        materialId: payload.materialId,
        summary: 'AI-конспект успешно сгенерирован (демо)',
        tokens: Math.floor(Math.random() * 5000),
      }, 1500);
    }
    return request(`/materials/${payload.materialId}/ai`, { method: 'POST' });
  },

  /**
   * Скачать материал
   */
  async downloadMaterial(id: string) {
    if (USE_MOCK) return fakeDelay({ ok: true, id });
    return request(`/materials/${id}/download`);
  },

  /**
   * Добавить задание
   */
  async createTask(payload: { title: string; description: string; deadline: string }) {
    if (USE_MOCK) return fakeDelay({ id: `task-${Date.now()}`, ...payload });
    return request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Сохранить настройки
   */
  async saveSettings(payload: Record<string, unknown>) {
    if (USE_MOCK) return fakeDelay({ ok: true, ...payload });
    return request('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Добавить долг
   */
  async createDebt(payload: { studentName: string; subject: string; type: string; deadline: string }) {
    if (USE_MOCK) return fakeDelay({ id: `debt-${Date.now()}`, ...payload });
    return request('/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};