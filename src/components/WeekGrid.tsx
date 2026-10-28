import React from 'react';
import {
  BookOpen,
  Check,
  CheckSquare,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Lesson, Student, SubjectFilter, WeekDayInfo } from '../types';
import { parseISODate, sortLessonsChronologically } from '../calendar';

interface WeekGridProps {
  weekDays: WeekDayInfo[];
  lessons: Lesson[];
  studentsMap: Map<string, Student>;
  subjectFilter: SubjectFilter;
  exactDateFilter: string;
  onAddLessonOnDate: (dateISO: string) => void;
  onSelectLesson: (lesson: Lesson) => void;
  onQuickTogglePaid: (lessonId: string, e: React.MouseEvent) => void;
  weekLayoutMode?: 'board' | 'rows';
}

function getWeekdaySlotIndex(dateISO: string): number {
  const d = parseISODate(dateISO);
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getDurationLabel(startTime: string, endTime: string): string {
  const [sh, sm] = (startTime || '15:00').split(':').map(Number);
  const [eh, em] = (endTime || '16:00').split(':').map(Number);
  const diff = Math.max(0, eh * 60 + (em || 0) - (sh * 60 + (sm || 0))) || 60;
  if (diff === 60) return '1 ч';
  if (diff === 90) return '1.5 ч';
  if (diff === 120) return '2 ч';
  return `${diff} мин`;
}

function formatLessonsPlural(count: number): string {
  const n = Math.abs(Number(count) || 0) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${count} уроков`;
  if (n1 > 1 && n1 < 5) return `${count} урока`;
  if (n1 === 1) return `${count} урок`;
  return `${count} уроков`;
}

export const WeekGrid: React.FC<WeekGridProps> = ({
  weekDays,
  lessons,
  studentsMap,
  subjectFilter,
  exactDateFilter,
  onAddLessonOnDate,
  onSelectLesson,
  onQuickTogglePaid,
  weekLayoutMode = 'board',
}) => {
  const visibleDays = exactDateFilter
    ? weekDays.filter((d) => d.date === exactDateFilter)
    : weekDays;

  const gridClassName =
    visibleDays.length === 1
      ? 'week-grid single-day'
      : weekLayoutMode === 'rows'
      ? 'week-grid layout-rows'
      : 'week-grid layout-board';

  return (
    <main id="schedule" className="container-wide schedule-main">
      <div className={gridClassName}>
        {visibleDays.map((day) => {
          const slotIndex = getWeekdaySlotIndex(day.date);
          const dayLessons = sortLessonsChronologically(
            lessons.filter((l) => {
              if (l.date !== day.date) return false;
              if (subjectFilter !== 'all' && l.subject !== subjectFilter) return false;
              return true;
            })
          );

          const activeLessonsCount = dayLessons.filter((l) => l.status !== 'cancelled').length;
          const lessonsCountLabel = formatLessonsPlural(activeLessonsCount);

          return (
            <div
              key={day.date}
              data-testid={`day-column-${day.date}`}
              className={`day-column day-slot-${slotIndex}${day.isToday ? ' is-today' : ''}`}
            >
              {/* Pastel Day Header with Left Accent Bar */}
              <div className={`day-header day-theme-${slotIndex}`}>
                <div className="day-header-left">
                  <span className="day-name">{day.dayNameFull}</span>
                  <span className="day-meta font-mono-tabular">
                    {day.dayNumber} {day.monthShort} &nbsp;•&nbsp; {lessonsCountLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onAddLessonOnDate(day.date)}
                  aria-label={`Добавить урок на ${day.dayNumber} ${day.monthShort}`}
                  className="day-add-btn-inline"
                >
                  + Добавить
                </button>
              </div>

              {/* Lessons List */}
              <div className="day-lessons-list">
                {dayLessons.length === 0 ? (
                  <div className="empty-day">
                    <svg
                      className="empty-cal-svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="17" rx="3" />
                      <line x1="16" y1="2.5" x2="16" y2="6" strokeLinecap="round" />
                      <line x1="8" y1="2.5" x2="8" y2="6" strokeLinecap="round" />
                      <line x1="3" y1="9.5" x2="21" y2="9.5" />
                    </svg>
                    <div className="empty-day-texts">
                      <strong className="empty-day-title">Свободный день</strong>
                      <span className="empty-day-sub">Уроков не запланировано</span>
                    </div>
                  </div>
                ) : (
                  dayLessons.map((lesson) => {
                    const student = studentsMap.get(lesson.studentId);
                    const studentName = student ? student.name : 'Ученик не указан';
                    const isCancelled = lesson.status === 'cancelled';
                    const isCompleted = lesson.status === 'completed';
                    const hasClasswork = Boolean(lesson.classwork && lesson.classwork.trim());
                    const hasHomework = Boolean(lesson.homework && lesson.homework.trim());
                    const durationLabel = getDurationLabel(lesson.startTime, lesson.endTime);

                    let cardStateClass = 'is-planned-card';
                    if (isCancelled) {
                      cardStateClass = 'is-cancelled';
                    } else if (lesson.isPaid) {
                      cardStateClass = 'is-paid-card';
                    } else if (isCompleted) {
                      cardStateClass = 'is-unpaid-past-card';
                    }

                    return (
                      <div
                        key={lesson.id}
                        data-testid={`lesson-card-${lesson.id}`}
                        className={`lesson-card ${cardStateClass}`}
                      >
                        <span className="lesson-left-strip" aria-hidden="true" />
                        <div className="lesson-card-body">
                          {/* Main Clickable Area */}
                          <button
                            type="button"
                            onClick={() => onSelectLesson(lesson)}
                            className="lesson-card-main"
                          >
                            <div className="lesson-top-row">
                              <span className="lesson-time font-mono-tabular">
                                <Clock className="icon-sm" />
                                <span>
                                  {lesson.startTime} – {lesson.endTime} ({durationLabel})
                                </span>
                              </span>

                              <span
                                className={`subject-code font-mono-tabular ${
                                  lesson.subject === 'rus' ? 'rus' : 'eng'
                                }`}
                              >
                                {lesson.subject === 'rus' ? 'RUS' : 'ENG'}
                              </span>
                            </div>

                            <div className="lesson-student-row">
                              <span className="student-color-dot kpi-icon-green" />
                              <span className="lesson-student">{studentName}</span>
                            </div>

                            {hasClasswork && (
                              <p className="lesson-topic">{lesson.classwork}</p>
                            )}

                            {hasHomework && (
                              <div className="lesson-note-callout">
                                <span className="callout-pin" aria-hidden="true">
                                  <svg
                                    className="pin-svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M16 3a1 1 0 0 1 .7.29l4 4a1 1 0 0 1-.26 1.62l-3.2 1.28-2.66 2.66 1.13 4.52a1 1 0 0 1-1.68.95L10.3 14.6l-4.6 4.6a1 1 0 0 1-1.4-1.4l4.6-4.6-3.71-3.73a1 1 0 0 1 .95-1.68l4.52 1.13 2.66-2.66 1.28-3.2A1 1 0 0 1 16 3z" />
                                  </svg>
                                </span>
                                <span className="callout-text">Д/з: {lesson.homework}</span>
                              </div>
                            )}
                          </button>

                          {/* Footer Row */}
                          <div className="lesson-footer">
                            <div className="lesson-indicators">
                              <span
                                className={`indicator-item${hasClasswork ? ' active' : ''}`}
                                title={
                                  hasClasswork
                                    ? `Классная работа: ${lesson.classwork}`
                                    : 'Классная работа'
                                }
                              >
                                <BookOpen className="icon-sm" />
                              </span>
                              <span
                                className={`indicator-item${lesson.hwChecked ? ' checked' : ''}`}
                                title={
                                  hasHomework
                                    ? `Домашнее задание: ${lesson.homework}${
                                        lesson.hwChecked ? ' (Проверено)' : ''
                                      }`
                                    : 'Домашнее задание'
                                }
                              >
                                <CheckSquare className="icon-sm" />
                              </span>
                              <span
                                className={`indicator-item${!isCancelled ? ' active' : ''}`}
                                title="Автоповтор расписания"
                              >
                                <RefreshCw className="icon-sm" />
                              </span>
                            </div>

                            {!isCancelled ? (
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
                                className={`payment-toggle-btn ${lesson.isPaid ? 'paid' : 'unpaid'}`}
                              >
                                {lesson.isPaid ? (
                                  <Check className="icon-sm" />
                                ) : (
                                  <AlertCircle className="icon-sm" />
                                )}
                                <span>{lesson.isPaid ? 'Оплачено' : 'Не оплачено'}</span>
                              </button>
                            ) : (
                              <span className="cancelled-badge">Отменен</span>
                            )}
                          </div>
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
