import PageWrapper from '../components/PageWrapper';

const exams = [
  { id: 1, subject: 'Матанализ', date: '15 мая, 10:00', room: '412', teacher: 'Смирнов А.В.', icon: '🔢' },
  { id: 2, subject: 'Физика', date: '18 мая, 14:00', room: '301', teacher: 'Петрова Е.С.', icon: '⚛️' },
  { id: 3, subject: 'ТРПО (зачёт)', date: '22 мая, 12:00', room: '505', teacher: 'Иванов П.П.', icon: '💻' },
];

const consultations = [
  { id: 1, subject: 'Матанализ', date: '14 мая, 15:00', room: '412', teacher: 'Смирнов А.В.' },
  { id: 2, subject: 'Физика', date: '17 мая, 13:00', room: '301', teacher: 'Петрова Е.С.' },
];

export default function Exams() {
  return (
    <PageWrapper title="Экзамены" subtitle="Расписание сессии и консультаций">
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>📅 Ближайшие экзамены</h3>
          </div>
          {exams.map(e => (
            <div key={e.id} className="reminder-item">
              <div className="reminder-icon red">{e.icon}</div>
              <div className="reminder-content">
                <div className="title">{e.subject}</div>
                <div className="desc">Ауд. {e.room} · {e.teacher}</div>
                <div className="meta">
                  <span>🕐 {e.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>💬 Консультации</h3>
          </div>
          {consultations.map(c => (
            <div key={c.id} className="reminder-item">
              <div className="reminder-icon yellow">💬</div>
              <div className="reminder-content">
                <div className="title">{c.subject}</div>
                <div className="desc">Ауд. {c.room} · {c.teacher}</div>
                <div className="meta">
                  <span>🕐 {c.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}