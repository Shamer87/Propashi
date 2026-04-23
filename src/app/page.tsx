import dbConnect from '@/lib/mongoose';
import Person from '@/models/Person';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
async function getStats() {
  try {
    await dbConnect();
    const [total, killed, missing, captured] = await Promise.all([
      Person.countDocuments({ isApproved: true }),
      Person.countDocuments({ status: 'KILLED', isApproved: true }),
      Person.countDocuments({ status: 'MISSING', isApproved: true }),
      Person.countDocuments({ status: 'CAPTURED', isApproved: true }),
    ]);
    return { total, killed, missing, captured };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { total: 0, killed: 0, missing: 0, captured: 0 };
  }
}
export default async function DashboardPage() {
  const stats = await getStats();
  return (
    <div className="page">
      <h1 className="page-title">Огляд</h1>
      <div className="stats-row">
        <div className="stat">
          <div className="stat-value">{stats.total.toLocaleString('uk-UA')}</div>
          <div className="stat-label">Всього записів</div>
        </div>
        <div className="stat">
          <div className="stat-value red">{stats.killed.toLocaleString('uk-UA')}</div>
          <div className="stat-label">Загиблі</div>
        </div>
        <div className="stat">
          <div className="stat-value yellow">{stats.missing.toLocaleString('uk-UA')}</div>
          <div className="stat-label">Зниклі безвісти</div>
        </div>
        <div className="stat">
          <div className="stat-value green">{stats.captured.toLocaleString('uk-UA')}</div>
          <div className="stat-label">Полонені</div>
        </div>
      </div>
      <div className="about-block">
        <p>
          Проєкт «Пропащі» — система збору та зберігання інформації про 
          військовослужбовців окупантів, які загинули, зникли безвісти або 
          потрапили в полон. Облік ведеться для протидії дезінформації.
        </p>
        <div className="actions">
          <Link href="/search" className="btn btn-primary">Перейти до пошуку</Link>
          <Link href="/submit" className="btn">Додати запис</Link>
        </div>
      </div>
    </div>
  );
}