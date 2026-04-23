export default function AboutPage() {
  return (
    <>
      <header className="top-header">
        <h1>Про проєкт «Пропащі»</h1>
      </header>
      <div className="page-content">
        <div className="form-card" style={{ maxWidth: '800px' }}>
          <h2>Мета проєкту</h2>
          <p className="subtitle" style={{ marginBottom: '24px' }}>
            Створити єдину базу даних та інструменти для збору, зберігання та швидкого пошуку інформації про військовослужбовців окупантів, які зникли безвісти, загинули або потрапили в полон.
          </p>
          <h3 style={{ marginBottom: '12px' }}>Основні функції та можливості:</h3>
          <ul style={{ listStylePosition: 'inside', lineHeight: '1.8', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            <li>Пошук за прізвищем, статусом, датою зникнення, підрозділом та регіоном.</li>
            <li>Автоматичне зіставлення схожих анкет для уникнення дублікатів.</li>
            <li>Зручний інтерфейс для подачі заявок як через сайт, так і через Telegram-бот.</li>
            <li>Захист даних: повний доступ лише для авторизованих користувачів. Гості бачать частково приховані дані.</li>
          </ul>
          <h3 style={{ marginBottom: '12px' }}>Технологічна база:</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Проєкт побудований на сучасному стеку технологій (Next.js, MongoDB) з акцентом на швидкість роботи, безпеку та адаптивність дизайну для мобільних пристроїв та комп'ютерів.
          </p>
        </div>
      </div>
    </>
  );
}