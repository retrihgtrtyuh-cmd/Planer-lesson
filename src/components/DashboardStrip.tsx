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

  return (
    <section
      aria-label="Сводка за выбранную неделю"
      className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 pt-4 pb-2"
    >
      <div className="bg-white border border-slate-200 rounded-xl px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Lesson counts */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <span className="text-xs text-slate-500 block">Всего уроков на неделе</span>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span
                className="text-lg font-bold text-slate-900 font-mono-tabular"
                data-testid="dashboard-total-lessons"
              >
                {stats.totalActiveLessons}
              </span>
              <span className="text-xs text-slate-600 font-mono-tabular">
                Англ: <strong className="text-blue-700">{stats.engLessons}</strong>
                <span aria-hidden="true" className="mx-1.5 text-slate-300">
                  ·
                </span>
                Рус: <strong className="text-emerald-700">{stats.rusLessons}</strong>
              </span>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-200" aria-hidden="true" />

          <div>
            <span className="text-xs text-slate-500 block">Статус проведения</span>
            <div className="text-xs text-slate-700 font-mono-tabular mt-1">
              Проведено: <strong className="text-slate-900">{stats.completedLessons}</strong> из{' '}
              {stats.totalActiveLessons}
              {stats.cancelledLessons > 0 && (
                <>
                  <span aria-hidden="true" className="mx-1.5 text-slate-300">
                    ·
                  </span>
                  <span className="text-slate-500">Отменено: {stats.cancelledLessons}</span>
                </>
              )}
            </div>
          </div>

          {hasActiveFilter && (
            <>
              <div className="hidden sm:block h-8 w-px bg-slate-200" aria-hidden="true" />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600">
                  Фильтр:{' '}
                  <strong className="text-slate-900">
                    {subjectFilter === 'eng'
                      ? 'Английский'
                      : subjectFilter === 'rus'
                      ? 'Русский'
                      : 'Все предметы'}
                    {exactDateFilter ? `, ${formatRussianDate(exactDateFilter)}` : ''}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-blue-700 hover:underline font-medium cursor-pointer whitespace-nowrap"
                >
                  Сбросить
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Financial metrics */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div>
            <span className="text-xs text-slate-500 block">Финансы за неделю</span>
            <div className="flex flex-wrap items-center gap-3 mt-0.5 text-sm font-mono-tabular">
              <span className="text-emerald-700 font-semibold" data-testid="dashboard-paid-amount">
                Оплачено: {formatCurrencyRUB(stats.paidAmount)}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                |
              </span>
              <span className="text-rose-600 font-semibold" data-testid="dashboard-unpaid-amount">
                Ожидает оплаты: {formatCurrencyRUB(stats.unpaidAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
