import { useEffect, useState } from 'react';
import PageWrapper from '../components/PageWrapper';
import { mockApi, Debt } from '../api/mock';

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);

  useEffect(() => {
    mockApi.getDebts().then(setDebts);
  }, []);

  return (
    <PageWrapper
      title="Долги"
      subtitle="Академические задолженности группы"
      actions={<button className="btn btn-primary">+ Добавить долг</button>}
    >
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--red)' }}>2</div>
          <div className="kpi-label">Активных долга</div>
        </div>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--green)' }}>12</div>
          <div className="kpi-label">Закрыто за семестр</div>
        </div>
        <div className="card">
          <div className="kpi-value" style={{ color: 'var(--yellow)' }}>3</div>
          <div className="kpi-label">На подходе</div>
        </div>
        <div className="card">
          <div className="kpi-value">14</div>
          <div className="kpi-label">Всего задолженностей</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>📋 Список задолженностей</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Студент</th>
              <th>Предмет</th>
              <th>Тип</th>
              <th>Дедлайн</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {debts.map(d => (
              <tr key={d.id}>
                <td>{d.studentName}</td>
                <td>{d.subject}</td>
                <td>{d.type}</td>
                <td>{d.deadline}</td>
                <td>
                  <span className={`tag ${d.status === 'overdue' ? 'tag-red' : d.status === 'active' ? 'tag-yellow' : 'tag-green'}`}>
                    {d.status === 'overdue' ? 'Просрочен' : d.status === 'active' ? 'На подходе' : 'Закрыт'}
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