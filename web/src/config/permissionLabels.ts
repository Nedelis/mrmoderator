export const PERMISSION_LABELS: Record<string, string> = {
    'reminder.create.personal': 'Создание личных напоминалок',
    'reminder.create.group': 'Создание групповых напоминалок',
    'reminder.remind': 'Отправка напоминаний',
    'material.upload': 'Загрузка материалов',
    'material.delete.any': 'Удаление любых материалов',
    'material.delete.own': 'Удаление своих материалов',
    'mail.configure': 'Настройка почтовых ящиков',
    'mail.forward': 'Пересылка писем в группу',
    'debts.edit': 'Редактирование и удаление долгов',
    'debts.create.own': 'Добавление своих долгов',
    'debts.view.all': 'Просмотр долгов всей группы',
    'roles.assign': 'Назначение ролей',
    'group.edit': 'Управление составом группы',
    'exam.create': 'Создание экзаменов',
    'exam.edit': 'Редактирование экзаменов',
    'exam.delete': 'Удаление экзаменов',
    'exam.addMaterial': 'Добавление материалов к экзаменам',
    'task.create.group': 'Создание групповых заданий',
    'task.create.personal': 'Создание личных заданий',
    'task.edit': 'Редактирование групповых заданий',
    'task.delete': 'Удаление групповых заданий',
    'task.remind': 'Отправка напоминаний о заданиях',
};

export function permissionLabel(key: string): string {
    return PERMISSION_LABELS[key] ?? key;
}
