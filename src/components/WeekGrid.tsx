import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Clock,
  CreditCard,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Lesson, Student, SubjectFilter, WeekDayInfo } from '../types';
import { sortLessonsChronologically } from '../calendar';

interface WeekGridProps {
  weekDays: WeekDayInfo[];
  lessons: Lesson[];
  studentsMap: Map<string, Student>;
  subjectFilter: SubjectFilter;
  exactDateFilter: string;
  onAddLessonOnDate: (dateISO: string) => void;
  onSelectLesson: (lesson: Lesson) => void;
  onQuickTogglePaid: (lessonId: string, e: React.MouseEvent) => void;
}

const STATUS_LABELS: Record<Lesson['status'], string> = {
  planned: 'Запланирован',
  completed: 'Проведен',
  cancelled: 'Отменен',
  rescheduled: 'Перенесен',
};

export const WeekGrid: React.FC<WeekGridProps> = ({
  weekDays,
  lessons,
  studentsMap,
  subjectFilter,
  exactDateFilter,
  onAddLessonOnDate,
  onSelectLesson,
  onQuickTogglePaid,
}) => {
  const visibleDays = exactDateFilter
    ? weekDays.filter((d) => d.date === exactDateFilter)
    : weekDays;

  return (
    <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-3">
      <div
        className={`grid gap-3 ${
          visibleDays.length === 1
            ? 'grid-cols-1 max-w-2xl mx-auto'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-7'
        }`}
      >
        {visibleDays.map((day) => {
          const dayLessons = sortLessonsChronologically(
            lessons.filter((l) => {
              if (l.date !== day.date) return false;
              if (subjectFilter !== 'all' && l.subject !== subjectFilter) return false;
              return true;
            })
          );

          return (
            <div
              key={day.date}
              data-testid={`day-column-${day.date}`}
              className={`flex flex-col rounded-xl border min-h-[340px] transition-colors ${
                day.isToday
                  ? 'bg-blue-50/35 border-blue-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Day Column Header */}
              <div
                className={`px-3 py-2.5 border-b flex items-center justify-between ${
                  day.isToday
                    ? 'border-blue-200 bg-blue-50/70 rounded-t-xl'
                    : 'border-slate-100'
                }`}
              >
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-sm font-bold ${
                      day.isToday ? 'text-blue-900' : 'text-slate-900'
                    }`}
                  >
                    {day.dayNameShort}
                  </span>
                  <span
                    className={`text-xs font-mono-tabular ${
                      day.isToday ? 'text-blue-700 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {day.dayNumber} {day.monthShort}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {day.isToday && (
                    <span className="text-[11px] font-semibold text-blue-700">
                      Сегодня
                    </span>
                  )}
                  <span className="text-xs font-mono-tabular text-slate-400">
                    {dayLessons.filter((l) => l.status !== 'cancelled').length} ур.
                  </span>
                </div>
              </div>

              {/* Add Lesson Button inside day */}
              <div className="p-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => onAddLessonOnDate(day.date)}
                  aria-label={`Добавить урок на ${day.dayNumber} ${day.monthShort}`}
                  className="w-full py-1.5 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить урок</span>
                </button>
              </div>

              {/* Lessons List */}
              <div className="p-2 flex-1 flex flex-col gap-2">
                {dayLessons.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 px-2 text-center">
                    <p className="text-xs text-slate-400">Нет занятий</p>
                  </div>
                ) : (
                  dayLessons.map((lesson) => {
                    const student = studentsMap.get(lesson.studentId);
                    const studentName = student ? student.name : 'Ученик не указан';
                    const isCancelled = lesson.status === 'cancelled';
                    const isCompleted = lesson.status === 'completed';
                    const hasClasswork = Boolean(lesson.classwork && lesson.classwork.trim());
                    const hasHomework = Boolean(lesson.homework && lesson.homework.trim());

                    return (
                      <div
                        key={lesson.id}
                        data-testid={`lesson-card-${lesson.id}`}
                        className={`group rounded-lg border p-2.5 transition-all flex flex-col gap-1.5 ${
                          isCancelled
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        {/* Top row: Clickable main trigger */}
                        <button
                          type="button"
                          onClick={() => onSelectLesson(lesson)}
                          className="text-left w-full focus:outline-none cursor-pointer"
                        >
                          {/* Time & Subject line */}
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-mono-tabular font-semibold flex items-center gap-1 ${
                                isCancelled ? 'line-through text-slate-400' : 'text-slate-700'
                              }`}
                            >
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              {lesson.startTime} – {lesson.endTime}
                            </span>

                            <span
                              className={`text-[11px] font-mono-tabular font-bold tracking-tight ${
                                lesson.subject === 'eng'
                                  ? 'text-blue-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {lesson.subject === 'eng' ? 'ENG' : 'RUS'}
                            </span>
                          </div>

                          {/* Student Name */}
                          <div
                            className={`mt-1 text-sm font-semibold leading-snug ${
                              isCancelled
                                ? 'line-through text-slate-500'
                                : 'text-slate-900 group-hover:text-blue-700'
                            }`}
                          >
                            {studentName}
                          </div>

                          {/* Topic preview if exists */}
                          {hasClasswork && (
                            <p
                              className={`mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed ${
                                isCancelled ? 'line-through' : ''
                              }`}
                            >
                              {lesson.classwork}
                            </p>
                          )}
                        </button>

                        {/* Footer row: Status, CW/HW indicators & Payment indicator */}
                        <div className="pt-1.5 mt-0.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                          {/* Left indicators: CW / HW / Status */}
                          <div className="flex items-center gap-2 text-slate-500">
                            {hasClasswork && (
                              <span
                                title={`Классная работа: ${lesson.classwork}`}
                                className="inline-flex items-center gap-0.5 text-slate-600"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                                <span className="sr-only">Есть классная работа</span>
                              </span>
                            )}
                            {hasHomework && (
                              <span
                                title={`Домашнее задание: ${lesson.homework}${
                                  lesson.hwChecked ? ' (Проверено)' : ''
                                }`}
                                className={`inline-flex items-center gap-0.5 ${
                                  lesson.hwChecked ? 'text-emerald-700 font-medium' : 'text-slate-600'
                                }`}
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>ДЗ</span>
                              </span>
                            )}
                            {isCompleted && !hasClasswork && !hasHomework && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Проведен</span>
                              </span>
                            )}
                            {lesson.status !== 'planned' && lesson.status !== 'completed' && (
                              <span className="text-slate-500">
                                {STATUS_LABELS[lesson.status]}
                              </span>
                            )}
                          </div>

                          {/* Right: Payment status button */}
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={(e) => onQuickTogglePaid(lesson.id, e)}
                              title={
                                lesson.isPaid
                                  ? `Оплачено (${lesson.price} ₽). Нажмите, чтобы изменить`
                                  : `Не оплачено (${lesson.price} ₽). Нажмите, чтобы отметить оплату`
                              }
                              aria-label={
                                lesson.isPaid
                                  ? `Оплачено ${lesson.price} ₽`
                                  : `Не оплачено ${lesson.price} ₽`
                              }
                              className={`inline-flex items-center gap-1 font-mono-tabular font-medium cursor-pointer transition-colors ${
                                lesson.isPaid
                                  ? 'text-emerald-700 hover:text-emerald-800'
                                  : 'text-rose-600 hover:text-rose-700'
                              }`}
                            >
                              {lesson.isPaid ? (
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              )}
                              <span>{lesson.price} ₽</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};
