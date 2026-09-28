export type RoleId = string;
export type MenuItemPath = string;
export type Permission = string;

export interface Role {
    id: RoleId;
    label: string;
    shortLabel: string;
    description: string;
    level: number;
    badgeClass: string;
    badgeIcon: string;
    badgeText: string;
    menu: MenuItemPath[];
    permissions: Permission[];
}

export interface CurrentUser {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photoUrl?: string;
    groupId: string;
    groupName: string;
    roleId: RoleId;
}

export interface Student {
    id: string;
    name: string;
    role: string;
    avgScore?: number | null;
    attendance?: number | null;
    debts?: number | null;
}

export interface Reminder {
    id: string;
    title: string;
    description: string;
    deadline: string;               // ISO datetime
    type: 'personal' | 'group';
    priority: 'low' | 'medium' | 'high';
    targetStudentIds?: string[];    // для напоминаний конкретным студентам
    /** id студентов, которые отметили напоминание выполненным (для себя) */
    completedBy: string[];
}

export interface Debt {
    id: string;
    studentName: string;
    subject: string;
    type: string;
    deadline: string;               // ISO date
    status: 'active' | 'overdue' | 'closed';
}

export interface MailItem {
    id: string;
    from: string;
    subject: string;
    preview: string;
    source: 'dean' | 'kafedra' | 'prepod';
    autoForward: boolean;
}

export interface Mailbox {
    id: string;
    email: string;
    label: string;
    connected: boolean;
    autoForward: boolean;
}

export interface Material {
    id: string;
    title: string;
    author: string;
    type: 'pdf' | 'video' | 'other';
    createdAt: string;
    maxUrl?: string;                // ссылка на сообщение в MAX
}

export interface ExamMaterial {
    id: string;
    examId: string;
    title: string;
    url?: string;
    addedBy: string;
    addedAt: string;
}

export interface Exam {
    id: string;
    subject: string;
    date: string;                   // ISO datetime
    time: string;
    room: string;
    teacher: string;
    icon: string;
    type: 'exam' | 'consultation';
    materials: ExamMaterial[];
}

export interface Task {
    id: string;
    title: string;
    description: string;
    deadline: string;               // ISO date
    type: 'group' | 'personal';
    status: 'active' | 'soon' | 'done' | 'overdue';
}