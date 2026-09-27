import PageWrapper from '../components/PageWrapper';

const tasks = [
  { id: 1, title: 'Лаба №3 по ТРПО', desc: 'Реализовать REST API на FastAPI', deadline: '12 мая', type: 'group', status: 'active' },
  { id: 2, title: 'ДЗ по матанализу', desc: 'Интегралы, задачи 1-15', deadline: '14 мая', type: 'personal', status: 'soon' },
  { id: 3, title: 'Отчёт по физике', desc: 'Лаба №2, оформление по ГОСТ', deadline: '5 мая', type: 'group', status: 'done' },
  { id: 4, title: 'Реферат по истории', desc: 'Тема: «Развитие ЭВМ в СССР»', deadline: '8 мая', type: 'personal', status: 'overdue' },
];

export default function Tasks() {
  return (
    <PageWrapper
      title="Задания"
      subtitle="Домашние и лабораторные работы"
      actions={<button className="btn btn-primary">+ Добавить задание</button>}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['Все', 'Активные', 'Проверенные', 'Просроченные'].map(f => (
          <span key={f} className={`tag ${f === 'Все' ? 'tag-blue' : 'tag-gray'}`} style={{ cursor: 'pointer' }}>
            {f}
          </span>
        ))}
      </div>

      <div className="grid grid-2">
        {tasks.map(t => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div className={`reminder-icon ${t.status === 'active' ? 'blue' : t.status === 'done' ? 'green' : t.status === 'overdue' ? 'red' : 'yellow'}`}>
                {t.status === 'active' ? '📝' : t.status === 'done' ? '✅' : t.status === 'overdue' ? '⚠️' : '⏳'}
              </div>
              <div className="reminder-content">
                <div className="title">{t.title}</div>
                <div className="desc">{t.desc}</div>
                <div className="meta">
                  <span>🕐 Дедлайн: {t.deadline}</span>
                  <span>{t.type === 'group' ? '👥 Вся группа' : '👤 Персонально'}</span>
                </div>
              </div>
              <span className={`tag ${t.status === 'active' ? 'tag-blue' : t.status === 'done' ? 'tag-green' : t.status === 'overdue' ? 'tag-red' : 'tag-yellow'}`}>
                {t.status === 'active' ? 'Активно' : t.status === 'done' ? 'Проверено' : t.status === 'overdue' ? 'Просрочено' : 'Скоро'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}