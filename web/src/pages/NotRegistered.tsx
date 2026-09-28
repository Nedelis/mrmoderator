import PageWrapper from '../components/PageWrapper';

export default function NotRegistered() {
    return (
        <PageWrapper
      title= "504 · Вы не в группе"
    subtitle = "Доступ к приложению ограничен"
        >
        <div
        style={
        {
            maxWidth: 560,
                margin: '40px auto',
                    textAlign: 'center',
                        padding: '40px 24px',
                            background: 'var(--panel)',
                                border: '1.5px solid var(--border)',
                                    borderRadius: 'var(--radius)',
        }
    }
      >
        <div style={ { fontSize: 64, marginBottom: 16 } }>🚪</div>

            < h2
    style = {{
        fontSize: 22,
            fontWeight: 700,
                marginBottom: 12,
          }
}
        >
    Вы ещё не вступили в группу
        </h2>

        < p
style = {{
    fontSize: 14,
        color: 'var(--muted)',
            lineHeight: 1.7,
                marginBottom: 24,
          }}
        >
    Это приложение работает только внутри учебной группы.
          Чтобы получить доступ, попросите у старосты ссылку - приглашение
          и откройте её в MAX.
        </p>

    < div
style = {{
    display: 'inline-block',
        padding: '10px 18px',
            borderRadius: 12,
                background: 'var(--panel-2)',
                    border: '1px solid var(--border)',
                        fontSize: 13,
                            color: 'var(--muted)',
          }}
        >
    Код ошибки: <b style={ { color: 'var(--text)' } }> 504 </b> · not_in_group
        </div>

        < div style = {{ marginTop: 28 }}>
            <button
            className="btn btn-primary"
onClick = {() => window.location.reload()}
          >
            🔄 Проверить снова
    </button>
    </div>
    </div>
    </PageWrapper>
  );
}