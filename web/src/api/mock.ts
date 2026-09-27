import type {
  Role,
  CurrentUser,
  Student,
  Reminder,
  Debt,
  MailItem,
  Material,
} from '../types/api';

// ============================================================
// РОЛИ — то, что вернёт GET /api/roles
// ============================================================

const ROLES_MOCK: Role[] = [
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
      '/', '/my-stats', '/reminders', '/progress', '/debts', '/exams',
      '/tasks', '/materials', '/mail', '/roles', '/settings',
    ],
    permissions: [
      'reminder.create.group',
      'reminder.create.personal',
      'material.upload',
      'material.ai',
      'mail.configure',
      'mail.forward',
      'debts.edit',
      'progress.view.all',
      'roles.assign',
      'roles.assign.starosta',
      'settings.edit',
    ],
  },
  {
    id: 'zam',
    label: 'Замстаросты',
    shortLabel: 'Зам',
    description: 'Помощник старосты, может создавать напоминалки',
    level: 3,
    badgeClass: 'role-zam',
    badgeIcon: '🛡️',
    badgeText: 'Высокая',
    menu: [
      '/', '/my-stats', '/reminders', '/progress', '/debts', '/exams',
      '/tasks', '/materials', '/mail',
    ],
    permissions: [
      'reminder.create.group',
      'reminder.create.personal',
      'material.upload',
      'material.ai',
      'mail.forward',
      'progress.view.all',
    ],
  },
  {
    id: 'proforg',
    label: 'Профорг / Групорг',
    shortLabel: 'Профорг',
    description: 'Может добавлять материалы и объявления',
    level: 2,
    badgeClass: 'role-proforg',
    badgeIcon: '📢',
    badgeText: 'Средняя',
    menu: ['/', '/my-stats', '/reminders', '/exams', '/tasks', '/materials', '/mail'],
    permissions: [
      'reminder.create.personal',
      'material.upload',
      'mail.forward',
    ],
  },
  {
    id: 'student',
    label: 'Студент',
    shortLabel: 'Студент',
    description: 'Просмотр материалов и своих напоминалок',
    level: 1,
    badgeClass: 'role-student',
    badgeIcon: '👤',
    badgeText: 'Базовая',
    menu: ['/my-stats', '/reminders', '/exams', '/tasks', '/materials'],
    permissions: ['reminder.create.personal'],
  },
];

// ============================================================
// ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ — то, что вернёт GET /api/me
// ============================================================

const ME_MOCK: CurrentUser = {
  id: '1',
  firstName: 'Иван',
  lastName: 'Петров',
  username: 'ivan_petrov',
  photoUrl: undefined,
  groupId: 'iu7-42b',
  groupName: 'ИУ7-42Б',
  roleId: 'starosta',
};

// ============================================================
// ОСТАЛЬНЫЕ МОКИ — как было
// ============================================================

export const mockApi = {
  getRoles: async (): Promise<Role[]> => ROLES_MOCK,

  getMe: async (): Promise<CurrentUser> => ME_MOCK,

  getGroupInfo: async () => ({
    name: 'ИУ7-42Б',
    course: 2,
    semester: 4,
    studentsCount: 24,
  }),

  getStudents: async (): Promise<Student[]> => [
    { id: '1', name: 'Иванов Д.', role: 'student', avgScore: 4.8, attendance: 98, debts: 0 },
    { id: '2', name: 'Петрова М.', role: 'student', avgScore: 4.5, attendance: 95, debts: 0 },
    { id: '3', name: 'Сидоров А.', role: 'proforg', avgScore: 3.1, attendance: 72, debts: 1 },
    { id: '4', name: 'Кузнецова М.', role: 'student', avgScore: 3.8, attendance: 85, debts: 1 },
    { id: '5', name: 'Иван Петров', role: 'starosta', avgScore: 4.2, attendance: 92, debts: 0 },
  ],

  getReminders: async (): Promise<Reminder[]> => [
    { id: '1', title: 'Сдать лабу по ТРПО', description: 'Загрузка отчёта в Moodle до 23:59', deadline: 'Сегодня, 23:59', type: 'group', priority: 'high' },
    { id: '2', title: 'Консультация перед экзаменом', description: 'Ауд. 412, преподаватель Смирнов А.В.', deadline: 'Завтра, 14:30', type: 'personal', priority: 'medium' },
    { id: '3', title: 'Пересдача по матанализу', description: 'Не забудьте зачётку и допуск', deadline: '15 мая, 10:00', type: 'personal', priority: 'high' },
  ],

  getDebts: async (): Promise<Debt[]> => [
    { id: '1', studentName: 'Сидоров А.', subject: 'Матанализ', type: 'Экзамен', deadline: '15 мая', status: 'overdue' },
    { id: '2', studentName: 'Кузнецова М.', subject: 'Физика', type: 'Зачёт', deadline: '20 мая', status: 'active' },
    { id: '3', studentName: 'Иванов Д.', subject: 'ТРПО', type: 'Лаба', deadline: '10 мая', status: 'closed' },
  ],

  getMail: async (): Promise<MailItem[]> => [
    { id: '1', from: 'Деканат ИУ7', subject: 'График ликвидации задолженностей', preview: 'Уважаемые студенты, публикуем график пересдач на май...', source: 'dean', autoForward: true },
    { id: '2', from: 'Кафедра ИУ7', subject: 'Перенос лекции по ТРПО', preview: 'Лекция 12 мая переносится в ауд. 501 в 15:40...', source: 'kafedra', autoForward: true },
    { id: '3', from: 'Смирнов А.В.', subject: 'Материалы к экзамену', preview: 'Выложил список вопросов и литературу в общий доступ...', source: 'prepod', autoForward: false },
  ],

  getMaterials: async (): Promise<Material[]> => [
    { id: '1', title: 'Лекция 10. Тестирование ПО', author: 'Смирнов А.В.', type: 'pdf', createdAt: '2 дня назад' },
    { id: '2', title: 'Запись семинара по физике', author: 'Петрова Е.С.', type: 'video', createdAt: '3 дня назад' },
    { id: '3', title: 'AI-конспект: Матанализ, лекция 9', author: 'AI', type: 'ai-summary', createdAt: 'Вчера' },
  ],
};