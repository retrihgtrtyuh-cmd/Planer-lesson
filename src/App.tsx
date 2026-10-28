import React, { useEffect, useMemo, useState } from 'react';
import {
  addDaysISO,
  calculateWeeklyStats,
  formatWeekRange,
  getMondayOfWeek,
  getTodayISO,
  getWeekDays,
} from './calendar';
import {
  createId,
  loadPlannerState,
  parseDatabaseBackupJSON,
  savePlannerState,
  serializeDatabaseBackup,
} from './store';
import { Lesson, Student, SubjectFilter } from './types';
import { Header } from './components/Header';
import { DashboardStrip } from './components/DashboardStrip';
import { WeekGrid } from './components/WeekGrid';
import { LessonModal } from './components/LessonModal';
import { StudentsModal } from './components/StudentsModal';
import { AutoTransferModal } from './components/AutoTransferModal';

export default function App() {
  const todayISO = useMemo(() => getTodayISO(), []);
  const [currentMondayISO, setCurrentMondayISO] = useState<string>(() =>
    getMondayOfWeek(todayISO)
  );

  const [students, setStudents] = useState<Student[]>(() => loadPlannerState().students);
  const [lessons, setLessons] = useState<Lesson[]>(() => loadPlannerState().lessons);

  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');
  const [exactDateFilter, setExactDateFilter] = useState<string>('');
  const [weekLayoutMode, setWeekLayoutMode] = useState<'board' | 'rows'>('board');
  const [activeBottomTab, setActiveBottomTab] = useState<
    'planner' | 'students' | 'stats' | 'settings'
  >('planner');

  // Modal states
  const [isLessonModalOpen, setIsLessonModalOpen] = useState<boolean>(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [defaultModalDate, setDefaultModalDate] = useState<string>(todayISO);

  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState<boolean>(false);
  const [isAutoTransferModalOpen, setIsAutoTransferModalOpen] = useState<boolean>(false);

  // Subtle inline status feedback banner (instead of window.alert)
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  useEffect(() => {
    savePlannerState(students, lessons);
  }, [students, lessons]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLessonModalOpen(false);
        setIsStudentsModalOpen(false);
        setIsAutoTransferModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    window.setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    for (const s of students) {
      map.set(s.id, s);
    }
    return map;
  }, [students]);

  const weekDays = useMemo(
    () => getWeekDays(currentMondayISO, todayISO),
    [currentMondayISO, todayISO]
  );

  const weekRangeLabel = useMemo(
    () => formatWeekRange(currentMondayISO),
    [currentMondayISO]
  );

  const weeklyStats = useMemo(
    () => calculateWeeklyStats(lessons, currentMondayISO, subjectFilter),
    [lessons, currentMondayISO, subjectFilter]
  );

  // Navigation handlers
  const handlePrevWeek = () => {
    setExactDateFilter('');
    setCurrentMondayISO((prev) => addDaysISO(prev, -7));
  };

  const handleNextWeek = () => {
    setExactDateFilter('');
    setCurrentMondayISO((prev) => addDaysISO(prev, 7));
  };

  const handleToday = () => {
    setExactDateFilter('');
    setCurrentMondayISO(getMondayOfWeek(todayISO));
    setActiveBottomTab('planner');
  };

  const handleExactDateChange = (dateStr: string) => {
    setExactDateFilter(dateStr);
    if (dateStr) {
      setCurrentMondayISO(getMondayOfWeek(dateStr));
    }
  };

  // Lesson CRUD
  const handleOpenAddLessonOnDate = (dateISO: string) => {
    setEditingLesson(null);
    setDefaultModalDate(dateISO);
    setIsLessonModalOpen(true);
  };

  const handleOpenSelectLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setDefaultModalDate(lesson.date);
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = (lessonData: Omit<Lesson, 'id'> & { id?: string }) => {
    if (lessonData.id) {
      setLessons((prev) =>
        prev.map((l) => (l.id === lessonData.id ? ({ ...lessonData, id: l.id } as Lesson) : l))
      );
      showNotice('Изменения урока сохранены.');
    } else {
      const created: Lesson = {
        ...lessonData,
        id: createId('les'),
      };
      setLessons((prev) => [...prev, created]);
      setCurrentMondayISO(getMondayOfWeek(created.date));
      showNotice('Новый урок добавлен в расписание.');
    }
  };

  const handleDeleteLesson = (lessonId: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    showNotice('Урок удален из расписания.');
  };

  const handleQuickTogglePaid = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, isPaid: !l.isPaid } : l))
    );
  };

  // Student CRUD
  const handleQuickCreateStudent = (studentData: Omit<Student, 'id'>): Student => {
    const created: Student = {
      ...studentData,
      id: createId('stu'),
    };
    setStudents((prev) => [...prev, created]);
    showNotice(`Ученик «${created.name}» добавлен в базу.`);
    return created;
  };

  const handleSaveStudent = (studentData: Omit<Student, 'id'> & { id?: string }) => {
    if (studentData.id) {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentData.id ? ({ ...studentData, id: s.id } as Student) : s
        )
      );
      showNotice(`Профиль ученика «${studentData.name}» обновлен.`);
    } else {
      const created: Student = {
        ...studentData,
        id: createId('stu'),
      };
      setStudents((prev) => [...prev, created]);
      showNotice(`Ученик «${created.name}» добавлен в справочник.`);
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    const target = studentsMap.get(studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setLessons((prev) => prev.filter((l) => l.studentId !== studentId));
    if (target) {
      showNotice(`Ученик «${target.name}» и его уроки удалены.`);
    }
  };

  // Auto-transfer handler
  const handleConfirmAutoTransfer = (newLessons: Lesson[], targetMondayISO: string) => {
    setLessons((prev) => [...prev, ...newLessons]);
    setCurrentMondayISO(targetMondayISO);
    setExactDateFilter('');
    showNotice(`Успешно перенесено уроков: ${newLessons.length}.`);
  };

  // Export & Import JSON backup
  const handleExportJSON = () => {
    const json = serializeDatabaseBackup(students, lessons);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutor-planner-backup-${todayISO}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice('Резервная копия базы (JSON) сохранена.');
  };

  const handleImportJSONFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = String(event.target?.result || '');
        const parsed = parseDatabaseBackupJSON(content);
        setStudents(parsed.students);
        setLessons(parsed.lessons);
        showNotice(
          `База успешно импортирована: учеников — ${parsed.students.length}, уроков — ${parsed.lessons.length}.`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка чтения JSON файла.';
        showNotice(message, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-shell">
      <Header
        weekRangeLabel={weekRangeLabel}
        weekDays={weekDays}
        onPrevWeek={handlePrevWeek}
        onToday={handleToday}
        onNextWeek={handleNextWeek}
        subjectFilter={subjectFilter}
        onSubjectFilterChange={setSubjectFilter}
        exactDateFilter={exactDateFilter}
        onExactDateFilterChange={handleExactDateChange}
        onOpenStudentsModal={() => setIsStudentsModalOpen(true)}
        onOpenAutoTransferModal={() => setIsAutoTransferModalOpen(true)}
        onOpenNewLessonModal={() => handleOpenAddLessonOnDate(exactDateFilter || todayISO)}
        onExportJSON={handleExportJSON}
        onImportJSONFile={handleImportJSONFile}
        studentsCount={students.length}
        weekLayoutMode={weekLayoutMode}
        onWeekLayoutModeChange={setWeekLayoutMode}
      />

      {notice && (
        <div className="container-wide">
          <div
            role="status"
            className={`notice-banner${notice.type === 'error' ? ' error' : ''}`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="notice-close-link"
            >
              Скрыть
            </button>
          </div>
        </div>
      )}

      <DashboardStrip
        stats={weeklyStats}
        subjectFilter={subjectFilter}
        exactDateFilter={exactDateFilter}
        onClearFilters={() => {
          setSubjectFilter('all');
          setExactDateFilter('');
        }}
      />

      <WeekGrid
        weekDays={weekDays}
        lessons={lessons}
        studentsMap={studentsMap}
        subjectFilter={subjectFilter}
        exactDateFilter={exactDateFilter}
        onAddLessonOnDate={handleOpenAddLessonOnDate}
        onSelectLesson={handleOpenSelectLesson}
        onQuickTogglePaid={handleQuickTogglePaid}
        weekLayoutMode={weekLayoutMode}
      />

      {/* Нижняя панель навигации как на рендере */}
      <nav aria-label="Нижняя навигация" className="bottom-tab-bar">
        <div className="container-wide bottom-tab-inner">
          <button
            type="button"
            className={`bottom-tab-item${activeBottomTab === 'planner' ? ' active' : ''}`}
            onClick={() => {
              setActiveBottomTab('planner');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="bottom-tab-svg"
            >
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
              <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Планер</span>
          </button>

          <button
            type="button"
            className={`bottom-tab-item${activeBottomTab === 'students' ? ' active' : ''}`}
            onClick={() => {
              setActiveBottomTab('students');
              setIsStudentsModalOpen(true);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="bottom-tab-svg"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Ученики</span>
          </button>

          <button
            type="button"
            className={`bottom-tab-item${activeBottomTab === 'stats' ? ' active' : ''}`}
            onClick={() => {
              setActiveBottomTab('stats');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="bottom-tab-svg"
            >
              <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" />
              <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" />
              <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" />
            </svg>
            <span>Статистика</span>
          </button>

          <button
            type="button"
            className={`bottom-tab-item${activeBottomTab === 'settings' ? ' active' : ''}`}
            onClick={() => {
              setActiveBottomTab('settings');
              setIsAutoTransferModalOpen(true);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="bottom-tab-svg"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Настройки</span>
          </button>
        </div>
      </nav>

      <LessonModal
        isOpen={isLessonModalOpen}
        initialLesson={editingLesson}
        defaultDate={defaultModalDate}
        students={students}
        allLessons={lessons}
        onClose={() => setIsLessonModalOpen(false)}
        onSaveLesson={handleSaveLesson}
        onDeleteLesson={handleDeleteLesson}
        onQuickCreateStudent={handleQuickCreateStudent}
      />

      <StudentsModal
        isOpen={isStudentsModalOpen}
        students={students}
        lessons={lessons}
        onClose={() => setIsStudentsModalOpen(false)}
        onSaveStudent={handleSaveStudent}
        onDeleteStudent={handleDeleteStudent}
        onEditLessonFromHistory={(lesson) => {
          setCurrentMondayISO(getMondayOfWeek(lesson.date));
          handleOpenSelectLesson(lesson);
        }}
      />

      <AutoTransferModal
        isOpen={isAutoTransferModalOpen}
        currentMondayISO={currentMondayISO}
        lessons={lessons}
        studentsMap={studentsMap}
        onClose={() => setIsAutoTransferModalOpen(false)}
        onConfirmTransfer={handleConfirmAutoTransfer}
      />
    </div>
  );
}
