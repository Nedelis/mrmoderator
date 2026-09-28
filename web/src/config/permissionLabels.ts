// Русские лейблы для прав.
export const PERMISSION_LABELS: Record<string, string> = {
    'reminder.create.group': 'Создание групповых напоминалок',
    'reminder.create.personal': 'Создание личных напоминалок',
    'reminder.remind': 'Принудительные напоминания',
    'material.upload': 'Загрузка материалов',
    'material.delete.any': 'Удаление любых материалов',
    'material.delete.own': 'Удаление своих материалов',
    'mail.configure': 'Настройка почтовых ящиков',
    'mail.forward': 'Пересылка писем в группу',
    'debts.edit': 'Редактирование и удаление долгов',
    'debts.create.own': 'Добавление своих долгов',
    'progress.view.all': 'Просмотр успеваемости всей группы',
    'roles.assign': 'Назначение ролей',
    'group.edit': 'Управление составом группы',
    'settings.edit': 'Изменение настроек',
    'exam.addMaterial': 'Добавление материалов к экзаменам',
    'task.create.group': 'Создание заданий для группы',
    'task.create.personal': 'Создание личных заданий',
    'task.edit': 'Редактирование заданий группы',
    'task.delete': 'Удаление заданий группы',
    'task.remind': 'Принудительные напоминания о заданиях',
};

export function permissionLabel(key: string): string {
    return PERMISSION_LABELS[key] ?? key;
}