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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        weekRangeLabel={weekRangeLabel}
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
      />

      {notice && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-3 w-full">
          <div
            role="status"
            className={`px-4 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
              notice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs underline ml-4 cursor-pointer"
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

      <div className="flex-1">
        <WeekGrid
          weekDays={weekDays}
          lessons={lessons}
          studentsMap={studentsMap}
          subjectFilter={subjectFilter}
          exactDateFilter={exactDateFilter}
          onAddLessonOnDate={handleOpenAddLessonOnDate}
          onSelectLesson={handleOpenSelectLesson}
          onQuickTogglePaid={handleQuickTogglePaid}
        />
      </div>

      <footer className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 border-t border-slate-200/80 mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>Планер репетитора · Английский (ENG) и Русский (RUS) языки</span>
        <span>Все данные автоматически сохраняются локально в браузере (localStorage)</span>
      </footer>

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
