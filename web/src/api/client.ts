import { mockApi } from './mock';
import type {
    Role,
    CurrentUser,
    ExamMaterial,
    Exam,
    Reminder,
    Debt,
    Task,
    MailItem,
    Mailbox,
    Material,
    Student,
} from '../types/api';

const USE_API_MOCK = import.meta.env.VITE_USE_API_MOCK === 'true';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export class NotRegisteredError extends Error {
    constructor() {
        super('not_in_group');
        this.name = 'NotRegisteredError';
    }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const initData = (window as any).WebApp?.initData;

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options?.headers || {}),
            'X-Max-Init-Data': initData,
        },
    });

    if (!res.ok) {
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
        if (USE_API_MOCK) return mockApi.getRoles();
        const data = await request<{ roles: Role[] }>('/roles');
        return data.roles;
    },

    async getMe(): Promise<CurrentUser> {
        if (USE_API_MOCK) return mockApi.getMe();
        const data = await request<{ user: CurrentUser }>('/me');
        return data.user;
    },

    async getGroup(): Promise<{ name: string; course: number; semester: number; studentsCount: number }> {
        if (USE_API_MOCK) return mockApi.getGroupInfo();
        return request('/group');
    },

    async getStudents(): Promise<Student[]> {
        if (USE_API_MOCK) return mockApi.getStudents();
        return request<Student[]>('/students');
    },

    async getReminders(): Promise<Reminder[]> {
        if (USE_API_MOCK) return mockApi.getReminders();
        return request<Reminder[]>('/reminders');
    },

    async getDebts(): Promise<Debt[]> {
        if (USE_API_MOCK) return mockApi.getDebts();
        return request<Debt[]>('/debts');
    },

    async getMail(): Promise<MailItem[]> {
        if (USE_API_MOCK) return mockApi.getMail();
        return request<MailItem[]>('/mail');
    },

    async getMailboxes(): Promise<Mailbox[]> {
        if (USE_API_MOCK) return mockApi.getMailboxes();
        return request<Mailbox[]>('/mail/mailboxes');
    },

    async getMaterials(): Promise<Material[]> {
        if (USE_API_MOCK) return mockApi.getMaterials();
        return request<Material[]>('/materials');
    },

    async getExams(): Promise<Exam[]> {
        if (USE_API_MOCK) return mockApi.getExams();
        return request<Exam[]>('/exams');
    },

    async getTasks(): Promise<Task[]> {
        if (USE_API_MOCK) return mockApi.getTasks();
        return request<Task[]>('/tasks');
    },

    // ===== НАПОМИНАЛКИ =====
    async createReminder(payload: {
        title: string;
        description: string;
        date: string;
        time: string;
        scope: 'personal' | 'group' | 'selected';
        studentIds?: string[];
    }): Promise<Reminder> {
        if (USE_API_MOCK) return mockApi.createReminder(payload);
        return request<Reminder>('/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async updateReminder(
        id: string,
        payload: Partial<{ title: string; description: string }>
    ): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.updateReminder(id, payload);
        return request<{ ok: boolean }>(`/reminders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async deleteReminder(id: string): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.deleteReminder(id);
        return request<{ ok: boolean }>(`/reminders/${id}`, { method: 'DELETE' });
    },

    async remindReminder(id: string): Promise<{
        ok: boolean;
        id: string;
        title: string;
        sentTo: number;
        sentAt: string;
    }> {
        if (USE_API_MOCK) return mockApi.remindReminder(id);
        return request(`/reminders/${id}/remind`, { method: 'POST' });
    },

    async markReminderCompleted(
        id: string,
        completed: boolean
    ): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.toggleReminderCompleted(id, completed);
        return request<{ ok: boolean }>(`/reminders/${id}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed }),
        });
    },

    // ===== ДОЛГИ =====
    async createDebt(payload: {
        studentName: string;
        subject: string;
        type: string;
        deadline: string;
    }): Promise<Debt> {
        if (USE_API_MOCK) return mockApi.createDebt(payload);
        return request<Debt>('/debts', {
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
    ): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.updateDebt(id, payload);
        return request<{ ok: boolean }>(`/debts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async deleteDebt(id: string): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.deleteDebt(id);
        return request<{ ok: boolean }>(`/debts/${id}`, { method: 'DELETE' });
    },

    // ===== ЗАДАНИЯ =====
    async createTask(payload: {
        title: string;
        description: string;
        deadline: string;
        type: 'group' | 'personal';
    }): Promise<Task> {
        if (USE_API_MOCK) return mockApi.createTask(payload);
        return request<Task>('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async updateTask(
        id: string,
        payload: Record<string, unknown>
    ): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.updateTask(id, payload);
        return request<{ ok: boolean }>(`/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async deleteTask(id: string): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.deleteTask(id);
        return request<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' });
    },

    async remindTask(id: string): Promise<{
        ok: boolean;
        id: string;
        title: string;
        sentTo: number;
        sentAt: string;
    }> {
        if (USE_API_MOCK) return mockApi.remindTask(id);
        return request(`/tasks/${id}/remind`, { method: 'POST' });
    },

    // ===== МАТЕРИАЛЫ =====
    async uploadMaterial(payload: {
        title: string;
        type: string;
        url: string;
    }): Promise<Material> {
        if (USE_API_MOCK) return mockApi.uploadMaterial(payload);
        return request<Material>('/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async downloadMaterial(id: string): Promise<{ ok: boolean; maxUrl?: string }> {
        if (USE_API_MOCK) return mockApi.downloadMaterial(id);
        return request<{ ok: boolean; maxUrl?: string }>(`/materials/${id}/download`);
    },

    async deleteMaterial(id: string): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.deleteMaterial(id);
        return request<{ ok: boolean }>(`/materials/${id}`, { method: 'DELETE' });
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
    }): Promise<Exam> {
        if (USE_API_MOCK) return mockApi.createExam(payload);
        return request<Exam>('/exams', {
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
        if (USE_API_MOCK) return mockApi.addExamMaterial(payload);
        return request<ExamMaterial>(`/exams/${payload.examId}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: payload.title,
                url: payload.url,
            }),
        });
    },

    async deleteExamMaterial(
        examId: string,
        materialId: string
    ): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.deleteExamMaterial(examId, materialId);
        return request<{ ok: boolean }>(`/exams/${examId}/materials/${materialId}`, {
            method: 'DELETE',
        });
    },

    // ===== ПОЧТА =====
    async forwardMail(id: string): Promise<{
        ok: boolean;
        id: string;
        forwardedTo: string;
    }> {
        if (USE_API_MOCK) return mockApi.forwardMail(id);
        return request(`/mail/${id}/forward`, { method: 'POST' });
    },

    async refreshMail(): Promise<{ ok: boolean; newMessages: number }> {
        if (USE_API_MOCK) return mockApi.refreshMail();
        return request<{ ok: boolean; newMessages: number }>('/mail/refresh', {
            method: 'POST',
        });
    },

    async configureMailboxes(payload: {
        mailboxes: Array<{ id: string; connected: boolean; autoForward: boolean }>;
    }): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.configureMailboxes(payload);
        return request<{ ok: boolean }>('/mail/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async addMailbox(payload: {
        email: string;
        label: string;
        autoForward?: boolean;
    }): Promise<Mailbox> {
        if (USE_API_MOCK) return mockApi.addMailbox(payload);
        return request<Mailbox>('/mail/mailboxes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async removeMailbox(id: string): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.removeMailbox(id);
        return request<{ ok: boolean }>(`/mail/mailboxes/${id}`, {
            method: 'DELETE',
        });
    },

    // ===== РОЛИ =====
    async assignRole(payload: {
        studentId: string;
        roleId: string;
    }): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.assignRole(payload);
        return request<{ ok: boolean }>('/roles/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async renameMember(
        studentId: string,
        newName: string
    ): Promise<{ ok: boolean; oldName: string; newName: string }> {
        if (USE_API_MOCK) return mockApi.renameMember(studentId, newName);
        return request(`/group/members/${studentId}/name`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
        });
    },

    async removeGroupMember(studentId: string): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.removeGroupMember(studentId);
        return request<{ ok: boolean }>(`/group/members/${studentId}`, {
            method: 'DELETE',
        });
    },

    async leaveGroup(): Promise<{ ok: boolean }> {
        if (USE_API_MOCK) return mockApi.leaveGroup();
        return request<{ ok: boolean }>('/group/leave', { method: 'POST' });
    },
};