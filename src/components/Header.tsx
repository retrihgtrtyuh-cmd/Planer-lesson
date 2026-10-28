import React, { useRef, useState } from 'react';
import { SubjectFilter, WeekDayInfo } from '../types';
import { formatRussianDate } from '../calendar';

interface HeaderProps {
  weekRangeLabel: string;
  weekDays?: WeekDayInfo[];
  onPrevWeek: () => void;
  onToday: () => void;
  onNextWeek: () => void;
  subjectFilter: SubjectFilter;
  onSubjectFilterChange: (filter: SubjectFilter) => void;
  exactDateFilter: string;
  onExactDateFilterChange: (date: string) => void;
  onOpenStudentsModal: () => void;
  onOpenAutoTransferModal: () => void;
  onOpenNewLessonModal: () => void;
  onExportJSON: () => void;
  onImportJSONFile: (file: File) => void;
  studentsCount: number;
  weekLayoutMode?: 'board' | 'rows';
  onWeekLayoutModeChange?: (mode: 'board' | 'rows') => void;
}

export const Header: React.FC<HeaderProps> = ({
  weekRangeLabel,
  weekDays = [],
  onPrevWeek,
  onToday,
  onNextWeek,
  subjectFilter,
  onSubjectFilterChange,
  exactDateFilter,
  onExactDateFilterChange,
  onOpenStudentsModal,
  onOpenAutoTransferModal,
  onOpenNewLessonModal,
  onExportJSON,
  onImportJSONFile,
  studentsCount,
  weekLayoutMode = 'board',
  onWeekLayoutModeChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSONFile(file);
      e.target.value = '';
    }
  };

  const hasTodayInWeek = weekDays.some((d) => d.isToday);

  return (
    <>
      <div className="header-wrapper">
        <header className="container-wide top-bar">
          <div className="brand-lockup">
            <div className="brand-icon-badge" aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none" className="brand-logo-svg">
                <rect x="4" y="6" width="28" height="25" rx="5" fill="#E8EEF7" />
                <path
                  d="M4 11C4 8.23858 6.23858 6 9 6H27C29.7614 6 32 8.23858 32 11V12H4V11Z"
                  fill="#94A8C4"
                />
                <rect x="10" y="3" width="3" height="6" rx="1.5" fill="#CBD5E1" />
                <rect x="23" y="3" width="3" height="6" rx="1.5" fill="#CBD5E1" />
                <path d="M18 15L10 19L18 23L26 19L18 15Z" fill="#233858" />
                <path
                  d="M13 21.2V25.2C13 26.5 15.2 27.8 18 27.8C20.8 27.8 23 26.5 23 25.2V21.2L18 23.7L13 21.2Z"
                  fill="#233858"
                />
                <path
                  d="M25.2 19.5V24.8"
                  stroke="#233858"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="brand-titles">
              <a
                href="#schedule"
                onClick={(e) => {
                  e.preventDefault();
                  onToday();
                }}
                className="brand-link"
              >
                Планер репетитора
              </a>
              <div className="brand-sub-nav" aria-label="Быстрые разделы">
                <button
                  type="button"
                  onClick={onToday}
                  className="brand-sub-link"
                >
                  Уроки
                </button>
                <span className="brand-sub-dot" aria-hidden="true">
                  •
                </span>
                <button
                  type="button"
                  onClick={onOpenStudentsModal}
                  className="brand-sub-link"
                >
                  Ученики
                </button>
                <span className="brand-sub-dot" aria-hidden="true">
                  •
                </span>
                <button
                  type="button"
                  onClick={onOpenAutoTransferModal}
                  className="brand-sub-link"
                >
                  Результаты
                </button>
              </div>
            </div>
          </div>

          <div className="header-right-actions">
            <button
              type="button"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              className="header-icon-btn"
              aria-label="Фильтры и поиск по дате или предмету"
              title="Фильтры и поиск"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="header-action-svg"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              className="header-icon-btn"
              aria-label="Дополнительные настройки и импорт/экспорт"
              title="Настройки, вид расписания и резервная копия"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="header-action-svg">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>
        </header>
      </div>

      <div className="planner-controls-sheet">
        <div className="container-wide">
          {/* Week Navigation Bar */}
          <div className="week-nav-bar">
            <button
              type="button"
              onClick={onPrevWeek}
              aria-label="Предыдущая неделя"
              className="week-arrow-btn"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="week-arrow-svg"
              >
                <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="week-range-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="week-cal-svg"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div className="week-range-label font-mono-tabular" data-testid="week-range-label">
                {weekRangeLabel}
              </div>
              <button
                type="button"
                onClick={onToday}
                className="week-today-chip"
                title="Вернуться на текущую неделю"
              >
                Сегодня
              </button>
            </div>

            <button
              type="button"
              onClick={onNextWeek}
              aria-label="Следующая неделя"
              className="week-arrow-btn"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="week-arrow-svg"
              >
                <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* 7 Week Day Pills Strip */}
          {weekDays.length > 0 && (
            <section aria-label="Дни недели" className="week-day-strip-section">
              <div className="week-day-tabs">
                {weekDays.map((day, idx) => {
                  const isSelected = exactDateFilter === day.date;
                  const isVisualActive =
                    isSelected ||
                    (!exactDateFilter && (day.isToday || (!hasTodayInWeek && idx === 0)));

                  const btnClass = [
                    'day-tab-btn',
                    'day-pill',
                    day.isToday ? 'is-today' : '',
                    isSelected ? 'is-selected' : '',
                    isVisualActive ? 'is-active-pill' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <button
                      key={day.date}
                      type="button"
                      className={btnClass}
                      onClick={() =>
                        onExactDateFilterChange(exactDateFilter === day.date ? '' : day.date)
                      }
                    >
                      <span className="day-tab-name">{day.dayNameShort}</span>
                      <span className="day-tab-sub font-mono-tabular">
                        {day.dayNumber} {day.monthShort}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Action Pills Bar */}
          <div className="action-pills-bar">
            <div className="action-pills-left">
              <button
                type="button"
                onClick={onOpenStudentsModal}
                className="pill-btn pill-btn-students"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="pill-icon-svg"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
                </svg>
                <span>Все ученики ({studentsCount})</span>
              </button>

              <button
                type="button"
                onClick={onOpenAutoTransferModal}
                data-testid="autosync-status-indicator"
                className="pill-badge-autosync"
                title="Автоперенос и автозаполнение расписания до конца месяца"
              >
                <span className="autosync-dot" aria-hidden="true" />
                <span>Автозаполнение до конца месяца</span>
              </button>
            </div>

            <div className="action-pills-right">
              <button
                type="button"
                onClick={onExportJSON}
                className="pill-btn pill-btn-export"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="pill-icon-svg"
                  aria-hidden="true"
                >
                  <path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Экспорт (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="pill-btn pill-btn-import"
                title="Импортировать базу из JSON"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="pill-icon-svg"
                  aria-hidden="true"
                >
                  <path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Импорт</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="modal-backdrop hidden"
                aria-label="Импорт базы (JSON)"
              />

              <button
                type="button"
                onClick={onOpenNewLessonModal}
                className="pill-btn pill-btn-add"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="pill-icon-svg"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                </svg>
                <span>Добавить урок</span>
              </button>
            </div>
          </div>

          {/* Collapsible Filter & Settings Drawer */}
          <div className={`toolbar-drawer${isDrawerOpen ? ' is-open' : ''}`}>
            <div className="toolbar-group">
              {onWeekLayoutModeChange && (
                <div role="group" aria-label="Расположение дней недели" className="segmented-group">
                  <button
                    type="button"
                    onClick={() => onWeekLayoutModeChange('board')}
                    className={`segmented-btn${weekLayoutMode === 'board' ? ' active' : ''}`}
                  >
                    Дневник (Пн–Ср | Чт–Сб)
                  </button>
                  <button
                    type="button"
                    onClick={() => onWeekLayoutModeChange('rows')}
                    className={`segmented-btn${weekLayoutMode === 'rows' ? ' active' : ''}`}
                  >
                    Список по дням
                  </button>
                </div>
              )}

              <div role="group" aria-label="Фильтр по предметам" className="segmented-group">
                <button
                  type="button"
                  onClick={() => onSubjectFilterChange('all')}
                  className={`segmented-btn${subjectFilter === 'all' ? ' active' : ''}`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => onSubjectFilterChange('eng')}
                  className={`segmented-btn${subjectFilter === 'eng' ? ' active-eng' : ''}`}
                >
                  🇬🇧 Английский
                </button>
                <button
                  type="button"
                  onClick={() => onSubjectFilterChange('rus')}
                  className={`segmented-btn${subjectFilter === 'rus' ? ' active-rus' : ''}`}
                >
                  🇷🇺 Русский
                </button>
              </div>

              <div className="date-filter-box">
                <label htmlFor="exact-date-filter">Дата:</label>
                <input
                  id="exact-date-filter"
                  type="date"
                  value={exactDateFilter}
                  onChange={(e) => onExactDateFilterChange(e.target.value)}
                  aria-label="Фильтр по дате"
                  className="date-filter-input font-mono-tabular"
                />
                {exactDateFilter && (
                  <button
                    type="button"
                    onClick={() => onExactDateFilterChange('')}
                    title={`Сбросить фильтр даты (${formatRussianDate(exactDateFilter, false)})`}
                    aria-label="Сбросить фильтр даты"
                    className="btn-link-muted"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
