import type {
    Role,
    CurrentUser,
    Student,
    Reminder,
    Debt,
    MailItem,
    Material,
    Exam,
    ExamMaterial,
    Task,
} from '../types/api';
import { isoPlusDays } from '../utils/date';

// ============================================================
// ROLES
// ============================================================

const ROLES: Role[] = [
    {
        id: 'starosta',
        label: 'Староста',
        shortLabel: 'Староста',
        description: 'Полный доступ к управлению группой',
        level: 4,
        badgeClass: 'role-starosta',
        badgeIcon: '👑',
        badgeText: 'Высшая',
        menu: [
            '/', '/my-stats', '/reminders', '/debts', '/exams',
            '/tasks', '/materials', '/mail', '/roles', '/settings',
        ],
        permissions: [
            'reminder.create.group', 'reminder.create.personal', 'reminder.remind',
            'material.upload', 'material.delete.any', 'material.delete.own',
            'mail.configure', 'mail.forward',
            'debts.edit', 'debts.create.own', 'debts.view.all',
            'roles.assign', 'group.edit', 'settings.edit',
            'exam.addMaterial',
            'task.create.group', 'task.create.personal', 'task.edit', 'task.delete', 'task.remind',
        ],
    },
    {
        id: 'zam',
        label: 'Замстаросты',
        shortLabel: 'Зам',
        description: 'Полный доступ, кроме выдачи высших ролей и правки состава',
        level: 3,
        badgeClass: 'role-zam',
        badgeIcon: '🛡️',
        badgeText: 'Высокая',
        menu: [
            '/', '/my-stats', '/reminders', '/debts', '/exams',
            '/tasks', '/materials', '/mail', '/roles', '/settings',
        ],
        permissions: [
            'reminder.create.group', 'reminder.create.personal', 'reminder.remind',
            'material.upload', 'material.delete.any', 'material.delete.own',
            'mail.configure', 'mail.forward',
            'debts.edit', 'debts.create.own', 'debts.view.all',
            'roles.assign', 'settings.edit',
            'exam.addMaterial',
            'task.create.group', 'task.create.personal', 'task.edit', 'task.delete', 'task.remind',
        ],
    },
    {
        id: 'proforg',
        label: 'Профорг / Групорг',
        shortLabel: 'Профорг',
        description: 'Материалы, объявления и личные задачи',
        level: 2,
        badgeClass: 'role-proforg',
        badgeIcon: '📢',
        badgeText: 'Средняя',
        menu: ['/my-stats', '/reminders', '/debts', '/exams', '/tasks', '/materials', '/mail'],
        permissions: [
            'reminder.create.personal',
            'material.upload', 'material.delete.own',
            'mail.forward',
            'debts.create.own',
            'task.create.personal',
        ],
    },
    {
        id: 'student',
        label: 'Студент',
        shortLabel: 'Студент',
        description: 'Просмотр материалов и личные задачи',
        level: 1,
        badgeClass: 'role-student',
        badgeIcon: '👤',
        badgeText: 'Базовая',
        menu: ['/my-stats', '/reminders', '/debts', '/exams', '/tasks', '/materials'],
        permissions: [
            'reminder.create.personal',
            'material.upload', 'material.delete.own',
            'debts.create.own',
            'task.create.personal',
        ],
    },
];

const ME: CurrentUser = {
    id: '1',
    firstName: 'Иван',
    lastName: 'Петров',
    username: 'ivan_petrov',
    groupId: 'iu7-42b',
    groupName: 'ИУ7-42Б',
    roleId: 'starosta',
};

let STUDENTS: Student[] = [
    { id: '1', name: 'Иванов Д.', role: 'student', avgScore: 4.8, attendance: 98, debts: 0 },
    { id: '2', name: 'Петрова М.', role: 'student', avgScore: 4.5, attendance: 95, debts: 0 },
    { id: '3', name: 'Сидоров А.', role: 'proforg', avgScore: 3.1, attendance: 72, debts: 1 },
    { id: '4', name: 'Кузнецова М.', role: 'student', avgScore: 3.8, attendance: 85, debts: 1 },
    { id: '5', name: 'Иван Петров', role: 'starosta', avgScore: 4.2, attendance: 92, debts: 0 },
];

let REMINDERS: Reminder[] = [
    { id: '1', title: 'Сдать лабу по ТРПО', description: 'Загрузка отчёта в Moodle', deadline: `${isoPlusDays(0)}T23:59`, type: 'group', priority: 'high' },
    { id: '2', title: 'Консультация перед экзаменом', description: 'Ауд. 412, преподаватель Смирнов А.В.', deadline: `${isoPlusDays(1)}T14:30`, type: 'personal', priority: 'medium' },
    { id: '3', title: 'Пересдача по матанализу', description: 'Не забудьте зачётку и допуск', deadline: `${isoPlusDays(5)}T10:00`, type: 'personal', priority: 'high' },
];

let DEBTS: Debt[] = [
    { id: '1', studentName: 'Сидоров А.', subject: 'Матанализ', type: 'Экзамен', deadline: isoPlusDays(-3), status: 'overdue' },
    { id: '2', studentName: 'Кузнецова М.', subject: 'Физика', type: 'Зачёт', deadline: isoPlusDays(5), status: 'active' },
    { id: '3', studentName: 'Иванов Д.', subject: 'ТРПО', type: 'Лаба', deadline: isoPlusDays(-15), status: 'closed' },
];

let MAIL: MailItem[] = [
    { id: '1', from: 'Деканат ИУ7', subject: 'График ликвидации задолженностей', preview: 'Уважаемые студенты, публикуем график пересдач на май...', source: 'dean', autoForward: true },
    { id: '2', from: 'Кафедра ИУ7', subject: 'Перенос лекции по ТРПО', preview: 'Лекция 12 мая переносится в ауд. 501 в 15:40...', source: 'kafedra', autoForward: true },
    { id: '3', from: 'Смирнов А.В.', subject: 'Материалы к экзамену', preview: 'Выложил список вопросов и литературу в общий доступ...', source: 'prepod', autoForward: false },
];

export interface Mailbox {
    id: string;
    email: string;
    label: string;
    connected: boolean;
    /** Автоматически пересылать новые письма из этого ящика в группу */
    autoForward: boolean;
}

let MAILBOXES: Mailbox[] = [
    { id: 'dean', email: 'dean@iu7.ru', label: 'Деканат', connected: true, autoForward: true },
    { id: 'kafedra', email: 'kaf@iu7.ru', label: 'Кафедра ИУ7', connected: true, autoForward: false },
    { id: 'profkom', email: 'prof@bmstu.ru', label: 'Профком', connected: false, autoForward: false },
];

let MATERIALS: Material[] = [
    { id: '1', title: 'Лекция 10. Тестирование ПО', author: 'Смирнов А.В.', type: 'pdf', createdAt: '2 дня назад' },
    { id: '2', title: 'Запись семинара по физике', author: 'Петрова Е.С.', type: 'video', createdAt: '3 дня назад' },
];

let EXAMS: Exam[] = [
    {
        id: 'e1', subject: 'Матанализ', date: `${isoPlusDays(7)}T10:00`, time: '10:00',
        room: '412', teacher: 'Смирнов А.В.', icon: '🔢', type: 'exam',
        materials: [
            { id: 'em1', examId: 'e1', title: 'Список вопросов', addedBy: 'Смирнов А.В.', addedAt: '5 мая' },
            { id: 'em2', examId: 'e1', title: 'Конспект лекций', addedBy: 'Иван Петров', addedAt: '6 мая' },
        ],
    },
    { id: 'e2', subject: 'Физика', date: `${isoPlusDays(10)}T14:00`, time: '14:00', room: '301', teacher: 'Петрова Е.С.', icon: '⚛️', type: 'exam', materials: [] },
    {
        id: 'e3', subject: 'ТРПО (зачёт)', date: `${isoPlusDays(14)}T12:00`, time: '12:00',
        room: '505', teacher: 'Иванов П.П.', icon: '💻', type: 'exam',
        materials: [
            { id: 'em3', examId: 'e3', title: 'Методичка по лабам', addedBy: 'Иванов П.П.', addedAt: '3 мая' },
        ],
    },
    { id: 'c1', subject: 'Матанализ', date: `${isoPlusDays(6)}T15:00`, time: '15:00', room: '412', teacher: 'Смирнов А.В.', icon: '💬', type: 'consultation', materials: [] },
    { id: 'c2', subject: 'Физика', date: `${isoPlusDays(9)}T13:00`, time: '13:00', room: '301', teacher: 'Петрова Е.С.', icon: '💬', type: 'consultation', materials: [] },
];

let TASKS: Task[] = [
    { id: 't1', title: 'Лаба №3 по ТРПО', description: 'Реализовать REST API на FastAPI', deadline: isoPlusDays(3), type: 'group', status: 'active' },
    { id: 't2', title: 'ДЗ по матанализу', description: 'Интегралы, задачи 1-15', deadline: isoPlusDays(7), type: 'personal', status: 'soon' },
    { id: 't3', title: 'Отчёт по физике', description: 'Лаба №2, оформление по ГОСТ', deadline: isoPlusDays(-5), type: 'group', status: 'done' },
    { id: 't4', title: 'Реферат по истории', description: 'Тема: «Развитие ЭВМ в СССР»', deadline: isoPlusDays(-2), type: 'personal', status: 'overdue' },
];

let SETTINGS: Record<string, unknown> = {
    pushNotifications: true,
    dailySummary: true,
    debtNotifications: true,
    newMaterials: false,
    twoFactor: true,
    auditLog: true,
};

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

export const mockApi = {
    getRoles: async (): Promise<Role[]> => ROLES,
    getMe: async (): Promise<CurrentUser> => ME,
    getStudents: async (): Promise<Student[]> => [...STUDENTS],
    getReminders: async (): Promise<Reminder[]> => [...REMINDERS],
    getDebts: async (): Promise<Debt[]> => [...DEBTS],
    getMail: async (): Promise<MailItem[]> => [...MAIL],
    getMailboxes: async (): Promise<Mailbox[]> => [...MAILBOXES],
    getMaterials: async (): Promise<Material[]> => [...MATERIALS],
    getExams: async (): Promise<Exam[]> => JSON.parse(JSON.stringify(EXAMS)),
    getTasks: async (): Promise<Task[]> => [...TASKS],
    getSettings: async (): Promise<Record<string, unknown>> => ({ ...SETTINGS }),

    getGroupInfo: async () => ({
        name: 'ИУ7-42Б',
        course: 2,
        semester: 4,
        studentsCount: STUDENTS.length,
    }),

    // ===== НАПОМИНАЛКИ =====
    async createReminder(payload: {
        title: string;
        description: string;
        date: string;
        time: string;
        scope: 'group' | 'personal' | 'selected';
    }): Promise<Reminder> {
        await delay();
        const deadline = payload.date
            ? `${payload.date}T${payload.time || '00:00'}`
            : `${isoPlusDays(0)}T23:59`;
        const reminder: Reminder = {
            id: `rem-${Date.now()}`,
            title: payload.title,
            description: payload.description,
            deadline,
            type: payload.scope === 'personal' ? 'personal' : 'group',
            priority: 'medium',
        };
        REMINDERS = [reminder, ...REMINDERS];
        return reminder;
    },

    async deleteReminder(id: string) {
        await delay();
        REMINDERS = REMINDERS.filter(r => r.id !== id);
        return { ok: true, id };
    },

    async updateReminder(id: string, payload: Partial<Reminder>) {
        await delay();
        REMINDERS = REMINDERS.map(r => (r.id === id ? { ...r, ...payload } : r));
        return { ok: true, id, ...payload };
    },

    async remindReminder(id: string) {
        await delay(700);
        const target = REMINDERS.find(r => r.id === id);
        return {
            ok: true,
            id,
            title: target?.title ?? '',
            sentTo: STUDENTS.length,
            sentAt: new Date().toISOString(),
        };
    },

    // ===== ДОЛГИ =====
    async createDebt(payload: {
        studentName: string;
        subject: string;
        type: string;
        deadline: string;
    }): Promise<Debt> {
        await delay();
        const debt: Debt = {
            id: `debt-${Date.now()}`,
            ...payload,
            status: 'active',
        };
        DEBTS = [debt, ...DEBTS];
        return debt;
    },

    async updateDebt(id: string, payload: Partial<Debt>) {
        await delay();
        DEBTS = DEBTS.map(d => (d.id === id ? { ...d, ...payload } : d));
        return { ok: true, id, ...payload };
    },

    async deleteDebt(id: string) {
        await delay();
        DEBTS = DEBTS.filter(d => d.id !== id);
        return { ok: true, id };
    },

    // ===== ЗАДАНИЯ =====
    async createTask(payload: {
        title: string;
        description: string;
        deadline: string;
        type: 'group' | 'personal';
    }): Promise<Task> {
        await delay();
        const task: Task = {
            id: `task-${Date.now()}`,
            ...payload,
            status: 'active',
        };
        TASKS = [task, ...TASKS];
        return task;
    },

    async updateTask(id: string, payload: Partial<Task>) {
        await delay();
        TASKS = TASKS.map(t => (t.id === id ? { ...t, ...payload } : t));
        return { ok: true, id, ...payload };
    },

    async deleteTask(id: string) {
        await delay();
        TASKS = TASKS.filter(t => t.id !== id);
        return { ok: true, id };
    },

    async remindTask(id: string) {
        await delay(700);
        const target = TASKS.find(t => t.id === id);
        return {
            ok: true,
            id,
            title: target?.title ?? '',
            sentTo: STUDENTS.length,
            sentAt: new Date().toISOString(),
        };
    },

    // ===== МАТЕРИАЛЫ =====
    async uploadMaterial(payload: { title: string; type: string }): Promise<Material> {
        await delay();
        const material: Material = {
            id: `mat-${Date.now()}`,
            title: payload.title,
            author: `${ME.firstName} ${ME.lastName}`,
            type: (payload.type === 'video' ? 'video' : 'pdf') as Material['type'],
            createdAt: 'Только что',
        };
        MATERIALS = [material, ...MATERIALS];
        return material;
    },

    async deleteMaterial(id: string) {
        await delay();
        MATERIALS = MATERIALS.filter(m => m.id !== id);
        return { ok: true, id };
    },

    async downloadMaterial(id: string) {
        await delay();
        return { ok: true, id };
    },

    // ===== ЭКЗАМЕНЫ =====
    async addExamMaterial(payload: {
        examId: string;
        title: string;
        url?: string;
        file?: File;
    }): Promise<ExamMaterial> {
        await delay();
        const material: ExamMaterial = {
            id: `em-${Date.now()}`,
            examId: payload.examId,
            title: payload.title,
            url: payload.url,
            addedBy: `${ME.firstName} ${ME.lastName}`,
            addedAt: 'Только что',
        };
        EXAMS = EXAMS.map(e =>
            e.id === payload.examId ? { ...e, materials: [...e.materials, material] } : e
        );
        return material;
    },

    async deleteExamMaterial(examId: string, materialId: string) {
        await delay();
        EXAMS = EXAMS.map(e =>
            e.id === examId
                ? { ...e, materials: e.materials.filter(m => m.id !== materialId) }
                : e
        );
        return { ok: true, examId, materialId };
    },

    // ===== ПОЧТА =====
    async forwardMail(id: string) {
        await delay();
        return { ok: true, id, forwardedTo: 'Группа ИУ7-42Б' };
    },

    async refreshMail() {
        await delay();
        return { ok: true, newMessages: Math.floor(Math.random() * 5) };
    },

    /**
     * Настройка ящиков: для каждого — подключён ли и авто-пересылка ли в группу.
     */
    async configureMailboxes(payload: {
        mailboxes: Array<{ id: string; connected: boolean; autoForward: boolean }>;
    }) {
        await delay();
        MAILBOXES = MAILBOXES.map(m => {
            const upd = payload.mailboxes.find(u => u.id === m.id);
            if (!upd) return m;
            return { ...m, connected: upd.connected, autoForward: upd.autoForward };
        });
        return { ok: true };
    },

    async addMailbox(payload: {
        email: string;
        label: string;
        autoForward?: boolean;
    }): Promise<Mailbox> {
        await delay();
        const mailbox: Mailbox = {
            id: `mb-${Date.now()}`,
            email: payload.email,
            label: payload.label,
            connected: true,
            autoForward: payload.autoForward ?? false,
        };
        MAILBOXES = [...MAILBOXES, mailbox];
        return mailbox;
    },

    async removeMailbox(id: string) {
        await delay();
        MAILBOXES = MAILBOXES.filter(m => m.id !== id);
        return { ok: true, id };
    },

    // ===== РОЛИ =====
    async assignRole(payload: { studentId: string; roleId: string }) {
        await delay();
        STUDENTS = STUDENTS.map(s =>
            s.name === payload.studentId ? { ...s, role: payload.roleId } : s
        );
        return { ok: true, ...payload, assignedAt: new Date().toISOString() };
    },

    async removeGroupMember(studentId: string) {
        await delay();
        STUDENTS = STUDENTS.filter(s => s.name !== studentId);
        return { ok: true, removed: studentId };
    },

    /** Переименовать участника (только староста). */
    async renameMember(studentId: string, newName: string) {
        if (USE_MOCK) return mockApi.renameMember(studentId, newName);
        return request(`/group/members/${encodeURIComponent(studentId)}/name`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
        });
    },

    // ===== НАСТРОЙКИ =====
    async saveSettings(payload: Record<string, unknown>) {
        await delay();
        SETTINGS = { ...SETTINGS, ...payload };
        return { ok: true, ...SETTINGS };
    },
};