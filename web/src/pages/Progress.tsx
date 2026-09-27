import { useEffect, useState } from 'react';
import PageWrapper from '../components/PageWrapper';
import { mockApi, Student } from '../api/mock';

export default function Progress() {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    mockApi.getStudents().then(setStudents);
  }, []);

  return (
    <PageWrapper
      title="Успеваемость"
      subtitle="Текущие оценки и посещаемость группы"
    >
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--green)' }}>4.2</div>
          <div className="kpi-label">Средний балл группы</div>
          <div className="progress" style={{ marginTop: 12 }}>
            <div className="progress-bar green" style={{ width: '84%' }} />
          </div>
        </div>
        <div className="card">
          <div className="kpi-value">92%</div>
          <div className="kpi-label">Посещаемость</div>
          <div className="progress" style={{ marginTop: 12 }}>
            <div className="progress-bar" style={{ width: '92%' }} />
          </div>
        </div>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--yellow)' }}>6</div>
          <div className="kpi-label">Студентов с низким баллом</div>
          <div className="progress" style={{ marginTop: 12 }}>
            <div className="progress-bar yellow" style={{ width: '25%' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>📊 Успеваемость по студентам</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Студент</th>
              <th>Средний балл</th>
              <th>Посещаемость</th>
              <th>Долги</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.avgScore}</td>
                <td>{s.attendance}%</td>
                <td>{s.debts}</td>
                <td>
                  <span className={`tag ${s.avgScore >= 4.5 ? 'tag-green' : s.avgScore >= 3.5 ? 'tag-yellow' : 'tag-red'}`}>
                    {s.avgScore >= 4.5 ? 'Отлично' : s.avgScore >= 3.5 ? 'Внимание' : 'Риск'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}