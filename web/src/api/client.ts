import { mockApi, type Mailbox } from './mock';
import type { Role, CurrentUser, ExamMaterial } from '../types/api';

const USE_MOCK = false;
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const initData = (window as any).WebApp?.initData
        || 'user={"id":"1"}';

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'X-Max-Init-Data': initData,
            ...(options?.headers || {}),
        },
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `API error ${res.status}`);
    }
    return res.json();
}

export const api = {
    // ==== ЧТЕНИЕ ====
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

    async getMailboxes(): Promise<Mailbox[]> {
        if (USE_MOCK) return mockApi.getMailboxes();
        return request('/mail/mailboxes');
    },

    async getMaterials() {
        if (USE_MOCK) return mockApi.getMaterials();
        return request('/materials');
    },

    async getExams() {
        if (USE_MOCK) return mockApi.getExams();
        return request('/exams');
    },

    async getTasks() {
        if (USE_MOCK) return mockApi.getTasks();
        return request('/tasks');
    },

    async getSettings() {
        if (USE_MOCK) return mockApi.getSettings();
        return request('/settings');
    },

    // ==== НАПОМИНАЛКИ ====
    async createReminder(payload: {
        title: string;
        description: string;
        date: string;
        time: string;
        scope: 'group' | 'personal' | 'selected';
    }) {
        if (USE_MOCK) return mockApi.createReminder(payload);
        return request('/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async deleteReminder(id: string) {
        if (USE_MOCK) return mockApi.deleteReminder(id);
        return request(`/reminders/${id}`, { method: 'DELETE' });
    },

    async updateReminder(id: string, payload: Partial<{ title: string; description: string }>) {
        if (USE_MOCK) return mockApi.updateReminder(id, payload);
        return request(`/reminders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    /** Принудительно напомнить о напоминании всем участникам. */
    async remindReminder(id: string) {
        if (USE_MOCK) return mockApi.remindReminder(id);
        return request(`/reminders/${id}/remind`, { method: 'POST' });
    },

    // ==== ДОЛГИ ====
    async createDebt(payload: {
        studentName: string;
        subject: string;
        type: string;
        deadline: string;
    }) {
        if (USE_MOCK) return mockApi.createDebt(payload);
        return request('/debts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async updateDebt(id: string, payload: Partial<{
        studentName: string;
        subject: string;
        type: string;
        deadline: string;
    }>) {
        if (USE_MOCK) return mockApi.updateDebt(id, payload);
        return request(`/debts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async deleteDebt(id: string) {
        if (USE_MOCK) return mockApi.deleteDebt(id);
        return request(`/debts/${id}`, { method: 'DELETE' });
    },

    // ==== ЗАДАНИЯ ====
    async createTask(payload: {
        title: string;
        description: string;
        deadline: string;
        type: 'group' | 'personal';
    }) {
        if (USE_MOCK) return mockApi.createTask(payload);
        return request('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async updateTask(id: string, payload: Record<string, unknown>) {
        if (USE_MOCK) return mockApi.updateTask(id, payload);
        return request(`/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async deleteTask(id: string) {
        if (USE_MOCK) return mockApi.deleteTask(id);
        return request(`/tasks/${id}`, { method: 'DELETE' });
    },

    /** Принудительно напомнить о задании всем участникам. */
    async remindTask(id: string) {
        if (USE_MOCK) return mockApi.remindTask(id);
        return request(`/tasks/${id}/remind`, { method: 'POST' });
    },

    // ==== МАТЕРИАЛЫ ====
    async uploadMaterial(payload: { title: string; type: string; file?: File }) {
        if (USE_MOCK) return mockApi.uploadMaterial(payload);
        const formData = new FormData();
        formData.append('title', payload.title);
        formData.append('type', payload.type);
        if (payload.file) formData.append('file', payload.file);
        return request('/materials', { method: 'POST', body: formData });
    },

    async downloadMaterial(id: string) {
        if (USE_MOCK) return mockApi.downloadMaterial(id);
        return request(`/materials/${id}/download`);
    },

    async deleteMaterial(id: string) {
        if (USE_MOCK) return mockApi.deleteMaterial(id);
        return request(`/materials/${id}`, { method: 'DELETE' });
    },

    // ==== ЭКЗАМЕНЫ ====
    async addExamMaterial(payload: {
        examId: string;
        title: string;
        url?: string;
        file?: File;
    }): Promise<ExamMaterial> {
        if (USE_MOCK) return mockApi.addExamMaterial(payload);
        const formData = new FormData();
        formData.append('title', payload.title);
        if (payload.url) formData.append('url', payload.url);
        if (payload.file) formData.append('file', payload.file);
        return request(`/exams/${payload.examId}/materials`, {
            method: 'POST',
            body: formData,
        });
    },

    async deleteExamMaterial(examId: string, materialId: string) {
        if (USE_MOCK) return mockApi.deleteExamMaterial(examId, materialId);
        return request(`/exams/${examId}/materials/${materialId}`, {
            method: 'DELETE',
        });
    },

    // ==== ПОЧТА ====
    async forwardMail(id: string) {
        if (USE_MOCK) return mockApi.forwardMail(id);
        return request(`/mail/${id}/forward`, { method: 'POST' });
    },

    async refreshMail() {
        if (USE_MOCK) return mockApi.refreshMail();
        return request('/mail/refresh', { method: 'POST' });
    },

    async configureMailboxes(payload: {
        mailboxes: Array<{ id: string; connected: boolean; autoForward: boolean }>;
    }) {
        if (USE_MOCK) return mockApi.configureMailboxes(payload);
        return request('/mail/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async addMailbox(payload: { email: string; label: string; autoForward?: boolean }) {
        if (USE_MOCK) return mockApi.addMailbox(payload);
        return request('/mail/mailboxes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async removeMailbox(id: string) {
        if (USE_MOCK) return mockApi.removeMailbox(id);
        return request(`/mail/mailboxes/${id}`, { method: 'DELETE' });
    },

    // ==== РОЛИ ====
    async assignRole(payload: { studentId: string; roleId: string }) {
        if (USE_MOCK) return mockApi.assignRole(payload);
        return request('/roles/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    /** Удалить участника (только староста). */
    async removeGroupMember(studentId: string) {
        if (USE_MOCK) return mockApi.removeGroupMember(studentId);
        return request(`/group/members/${studentId}`, { method: 'DELETE' });
    },

    // ==== НАСТРОЙКИ ====
    async saveSettings(payload: Record<string, unknown>) {
        if (USE_MOCK) return mockApi.saveSettings(payload);
        return request('/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },
};

export type { Mailbox };