import React, { useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { SubjectFilter } from '../types';
import { formatRussianDate } from '../calendar';

interface HeaderProps {
  weekRangeLabel: string;
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
}

export const Header: React.FC<HeaderProps> = ({
  weekRangeLabel,
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
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSONFile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white border-b border-slate-200">
      {/* Top Bar Contract: 3 zones (Brand, Nav Links, 1 Primary CTA) */}
      <header className="max-w-[1440px] mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5 border-b border-slate-100">
        <a
          href="#schedule"
          onClick={(e) => {
            e.preventDefault();
            onToday();
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Планер репетитора
        </a>

        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={onOpenStudentsModal}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>База учеников ({studentsCount})</span>
          </button>
          <button
            type="button"
            onClick={onOpenAutoTransferModal}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Автоперенос расписания</span>
          </button>
          <button
            type="button"
            onClick={onExportJSON}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Экспорт базы (JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Импорт базы (JSON)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Импорт базы (JSON)"
          />
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenNewLessonModal}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить урок</span>
          </button>
        </div>
      </header>

      {/* Workspace Control Toolbar: Week Navigator, Subject Filter, Date Filter & Mobile Quick Actions */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Week Navigator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={onPrevWeek}
              aria-label="Предыдущая неделя"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Пред. неделя</span>
            </button>
            <button
              type="button"
              onClick={onToday}
              className="px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={onNextWeek}
              aria-label="Следующая неделя"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>След. неделя</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div
            className="text-sm sm:text-base font-semibold text-slate-900 font-mono-tabular px-2"
            data-testid="week-range-label"
          >
            {weekRangeLabel}
          </div>
        </div>

        {/* Right: Subject Filter + Date Filter + Mobile Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subject Segmented Filter */}
          <div
            role="group"
            aria-label="Фильтр по предметам"
            className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80"
          >
            <button
              type="button"
              onClick={() => onSubjectFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subjectFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => onSubjectFilterChange('eng')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subjectFilter === 'eng'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇬🇧 Английский
            </button>
            <button
              type="button"
              onClick={() => onSubjectFilterChange('rus')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subjectFilter === 'rus'
                  ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇷🇺 Русский
            </button>
          </div>

          {/* Exact Date Filter */}
          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <label htmlFor="exact-date-filter" className="text-xs text-slate-600 whitespace-nowrap">
              Дата:
            </label>
            <input
              id="exact-date-filter"
              type="date"
              value={exactDateFilter}
              onChange={(e) => onExactDateFilterChange(e.target.value)}
              aria-label="Фильтр по дате"
              className="text-xs font-mono-tabular text-slate-900 bg-transparent border-0 focus:outline-none cursor-pointer py-0.5"
            />
            {exactDateFilter && (
              <button
                type="button"
                onClick={() => onExactDateFilterChange('')}
                title={`Сбросить фильтр даты (${formatRussianDate(exactDateFilter, false)})`}
                aria-label="Сбросить фильтр даты"
                className="p-0.5 text-slate-500 hover:text-slate-900 rounded-sm cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile-visible utility buttons (hidden on md+ where top nav shows them) */}
          <div className="flex md:hidden flex-wrap items-center gap-1.5 w-full pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenStudentsModal}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>База учеников ({studentsCount})</span>
            </button>
            <button
              type="button"
              onClick={onOpenAutoTransferModal}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Автоперенос</span>
            </button>
            <button
              type="button"
              onClick={onExportJSON}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Импорт</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
