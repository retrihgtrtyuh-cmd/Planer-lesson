import React from 'react';
import { SubjectFilter, WeeklyDashboardStats } from '../types';
import { formatRussianDate } from '../calendar';

interface DashboardStripProps {
  stats: WeeklyDashboardStats;
  subjectFilter: SubjectFilter;
  exactDateFilter: string;
  onClearFilters: () => void;
}

export function formatCurrencyRUB(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₽`;
}

export const DashboardStrip: React.FC<DashboardStripProps> = ({
  stats,
  subjectFilter,
  exactDateFilter,
  onClearFilters,
}) => {
  const hasActiveFilter = subjectFilter !== 'all' || Boolean(exactDateFilter);
  const plannedLessons = Math.max(0, stats.totalActiveLessons - stats.completedLessons);

  return (
    <section
      aria-label="Сводка за выбранную неделю"
      className="container-wide dashboard-section"
    >
      <div className="kpi-cards-grid">
        {/* Card 1: Всего уроков на неделю */}
        <div className="kpi-stat-card">
          <div className="kpi-icon-circle kpi-icon-slate" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" className="kpi-svg">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </div>
          <div className="kpi-card-content">
            <span className="kpi-card-label">
              Всего уроков
              <br />
              на неделю
            </span>
            <div className="kpi-card-value-row font-mono-tabular">
              <span
                className="kpi-big-number kpi-color-dark"
                data-testid="dashboard-total-lessons"
              >
                {stats.totalActiveLessons}
              </span>
              <span className="kpi-inline-sub">
                ENG: <strong>{stats.engLessons}</strong> · RUS: <strong>{stats.rusLessons}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Проведено */}
        <div className="kpi-stat-card">
          <div className="kpi-icon-circle kpi-icon-green" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="kpi-svg"
            >
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="kpi-card-content">
            <span className="kpi-card-label">Проведено</span>
            <div className="kpi-card-value-row font-mono-tabular">
              <span className="kpi-big-number kpi-color-green">{stats.completedLessons}</span>
            </div>
            <div
              className="kpi-micro-note text-paid font-mono-tabular"
              data-testid="dashboard-paid-amount"
            >
              Оплачено: {formatCurrencyRUB(stats.paidAmount)}
            </div>
          </div>
        </div>

        {/* Card 3: Запланировано */}
        <div className="kpi-stat-card">
          <div className="kpi-icon-circle kpi-icon-blue" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              className="kpi-svg"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15.5 14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="kpi-card-content">
            <span className="kpi-card-label">Запланировано</span>
            <div className="kpi-card-value-row font-mono-tabular">
              <span className="kpi-big-number kpi-color-blue">{plannedLessons}</span>
            </div>
            {hasActiveFilter && (
              <div className="kpi-micro-note">
                <span>
                  Фильтр:{' '}
                  <strong>
                    {subjectFilter === 'eng'
                      ? 'ENG'
                      : subjectFilter === 'rus'
                      ? 'RUS'
                      : 'Все'}
                    {exactDateFilter ? `, ${formatRussianDate(exactDateFilter, false)}` : ''}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="kpi-reset-btn"
                >
                  Сбросить
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Не оплачено */}
        <div className="kpi-stat-card">
          <div className="kpi-icon-circle kpi-icon-red" aria-hidden="true">
            <span className="kpi-exclamation">!</span>
          </div>
          <div className="kpi-card-content">
            <span className="kpi-card-label kpi-label-red">Не оплачено</span>
            <div className="kpi-card-value-row font-mono-tabular">
              <span
                className="kpi-big-number kpi-color-red"
                data-testid="dashboard-unpaid-amount"
              >
                {formatCurrencyRUB(stats.unpaidAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
