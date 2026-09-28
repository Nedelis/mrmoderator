import { mockApi, type Mailbox } from './mock';
import type { Role, CurrentUser, ExamMaterial, Exam } from '../types/api';

const USE_MOCK = true;
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/** Ошибка «юзер не в группе» — кидаем на страницу 504 */
export class NotRegisteredError extends Error {
    constructor() {
        super('not_in_group');
        this.name = 'NotRegisteredError';
    }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const initData = (window as any).WebApp?.initData || 'user={"id":"1"}';

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options?.headers || {}),
            'X-Max-Init-Data': initData,
        },
    });

    if (!res.ok) {
        // Пробуем прочитать тело ошибки как JSON и достать code
        let errBody: any = null;
        try {
            errBody = await res.clone().json();
        } catch {
            // не JSON — игнорируем
        }

        const code = errBody?.error?.code;
        if (code === 'not_in_group') {
            throw new NotRegisteredError();
        }

        const errText = await res.text().catch(() => '');
        throw new Error(errText || `API error ${res.status}`);
    }

    return res.json();
}

export const api = {
    // ===== ЧТЕНИЕ =====
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

    async getExams(): Promise<Exam[]> {
        if (USE_MOCK) return mockApi.getExams();
        return request('/exams');
    },

    async getTasks() {
        if (USE_MOCK) return mockApi.getTasks();
        return request('/tasks');
    },

    // ===== НАПОМИНАЛКИ =====
    async createReminder(payload: {
        title: string;
        description: string;
        date: string;
        time: string;
        scope: 'personal' | 'group' | 'selected';
        studentIds?: string[];
    }) {
        if (USE_MOCK) return mockApi.createReminder(payload);
        return request('/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async updateReminder(
        id: string,
        payload: Partial<{ title: string; description: string }>
    ) {
        if (USE_MOCK) return mockApi.updateReminder(id, payload);
        return request(`/reminders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async deleteReminder(id: string) {
        if (USE_MOCK) return mockApi.deleteReminder(id);
        return request(`/reminders/${id}`, { method: 'DELETE' });
    },

    async remindReminder(id: string) {
        if (USE_MOCK) return mockApi.remindReminder(id);
        return request(`/reminders/${id}/remind`, { method: 'POST' });
    },

    // ===== ДОЛГИ =====
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

    async updateDebt(
        id: string,
        payload: Partial<{
            studentName: string;
            subject: string;
            type: string;
            deadline: string;
        }>
    ) {
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

    // ===== ЗАДАНИЯ =====
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

    async remindTask(id: string) {
        if (USE_MOCK) return mockApi.remindTask(id);
        return request(`/tasks/${id}/remind`, { method: 'POST' });
    },

    // ===== МАТЕРИАЛЫ =====
    async uploadMaterial(payload: { title: string; type: string; url: string }) {
        if (USE_MOCK) return mockApi.uploadMaterial(payload);
        return request('/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async downloadMaterial(id: string) {
        if (USE_MOCK) return mockApi.downloadMaterial(id);
        return request(`/materials/${id}/download`);
    },

    async deleteMaterial(id: string) {
        if (USE_MOCK) return mockApi.deleteMaterial(id);
        return request(`/materials/${id}`, { method: 'DELETE' });
    },

    // ===== ЭКЗАМЕНЫ =====
    async createExam(payload: {
        subject: string;
        type: 'exam' | 'consultation';
        date: string;
        time: string;
        room?: string;
        teacher?: string;
        icon?: string;
    }) {
        if (USE_MOCK) return mockApi.createExam(payload);
        return request('/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async addExamMaterial(payload: {
        examId: string;
        title: string;
        url?: string;
    }): Promise<ExamMaterial> {
        if (USE_MOCK) return mockApi.addExamMaterial(payload);
        return request(`/exams/${payload.examId}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: payload.title,
                url: payload.url,
            }),
        });
    },

    async deleteExamMaterial(examId: string, materialId: string) {
        if (USE_MOCK) return mockApi.deleteExamMaterial(examId, materialId);
        return request(`/exams/${examId}/materials/${materialId}`, {
            method: 'DELETE',
        });
    },

    // ===== ПОЧТА =====
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

    async addMailbox(payload: {
        email: string;
        label: string;
        autoForward?: boolean;
    }) {
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

    // ===== РОЛИ =====
    async assignRole(payload: { studentId: string; roleId: string }) {
        if (USE_MOCK) return mockApi.assignRole(payload);
        return request('/roles/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async renameMember(studentId: string, newName: string) {
        if (USE_MOCK) return mockApi.renameMember(studentId, newName);
        return request(`/group/members/${studentId}/name`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
        });
    },

    async removeGroupMember(studentId: string) {
        if (USE_MOCK) return mockApi.removeGroupMember(studentId);
        return request(`/group/members/${studentId}`, { method: 'DELETE' });
    },
};

export type { Mailbox };