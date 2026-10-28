import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  History,
  Plus,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { Lesson, Student, Subject } from '../types';
import { formatRussianDate, sortLessonsChronologically } from '../calendar';
import { formatCurrencyRUB } from './DashboardStrip';

interface StudentsModalProps {
  isOpen: boolean;
  students: Student[];
  lessons: Lesson[];
  onClose: () => void;
  onSaveStudent: (student: Omit<Student, 'id'> & { id?: string }) => void;
  onDeleteStudent: (studentId: string) => void;
  onEditLessonFromHistory: (lesson: Lesson) => void;
}

const STATUS_NAMES: Record<Lesson['status'], string> = {
  planned: 'Запланирован',
  completed: 'Проведен',
  cancelled: 'Отменен',
  rescheduled: 'Перенесен',
};

export const StudentsModal: React.FC<StudentsModalProps> = ({
  isOpen,
  students,
  lessons,
  onClose,
  onSaveStudent,
  onDeleteStudent,
  onEditLessonFromHistory,
}) => {
  const [selectedHistoryStudentId, setSelectedHistoryStudentId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Student form fields
  const [name, setName] = useState<string>('');
  const [defaultSubject, setDefaultSubject] = useState<Subject>('eng');
  const [defaultPrice, setDefaultPrice] = useState<number>(2200);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const openAddForm = () => {
    setEditingStudent(null);
    setName('');
    setDefaultSubject('eng');
    setDefaultPrice(2200);
    setNotes('');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const openEditForm = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setDefaultSubject(student.defaultSubject);
    setDefaultPrice(student.defaultPrice);
    setNotes(student.notes);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Пожалуйста, укажите имя ученика.');
      return;
    }
    onSaveStudent({
      id: editingStudent?.id,
      name: name.trim(),
      defaultSubject,
      defaultPrice: Number(defaultPrice) || 0,
      notes: notes.trim(),
    });
    setIsFormOpen(false);
    setEditingStudent(null);
  };

  const historyStudent = students.find((s) => s.id === selectedHistoryStudentId) || null;
  const studentLessons = historyStudent
    ? sortLessonsChronologically(lessons.filter((l) => l.studentId === historyStudent.id)).reverse()
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="students-modal-title"
      className="modal-backdrop"
    >
      <div className="modal-window modal-xl">
        {/* Header */}
        <div className="modal-header">
          <div className="toolbar-group">
            {historyStudent && (
              <button
                type="button"
                onClick={() => setSelectedHistoryStudentId(null)}
                className="btn-secondary"
                aria-label="Назад к списку учеников"
              >
                <ArrowLeft className="icon-sm" />
                <span>Назад</span>
              </button>
            )}
            <div>
              <h2 id="students-modal-title" className="modal-title">
                {historyStudent
                  ? `История занятий: ${historyStudent.name}`
                  : 'База учеников и История'}
              </h2>
              <p className="modal-subtitle">
                {historyStudent
                  ? `Базовый предмет: ${
                      historyStudent.defaultSubject === 'eng' ? 'Английский (ENG)' : 'Русский (RUS)'
                    } · Ставка: ${historyStudent.defaultPrice} ₽`
                  : `Всего учеников в справочнике: ${students.length}`}
              </p>
            </div>
          </div>

          <div className="toolbar-group">
            {!historyStudent && !isFormOpen && (
              <button type="button" onClick={openAddForm} className="btn-primary">
                <Plus className="icon-sm" />
                <span>Добавить ученика</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть базу учеников"
              className="modal-close-btn"
            >
              <X className="icon-svg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* VIEW 1: Student Chronological Lesson History */}
          {historyStudent ? (
            <>
              {historyStudent.notes && (
                <div className="subpanel-box">
                  <span>
                    <strong>Профиль и цели ученика:</strong> {historyStudent.notes}
                  </span>
                </div>
              )}

              {/* Summary metrics for this student */}
              <div className="stats-grid-4">
                <div className="stat-mini-box">
                  <span className="metric-label">Всего записей</span>
                  <span className="metric-big-num font-mono-tabular">
                    {studentLessons.length}
                  </span>
                </div>
                <div className="stat-mini-box">
                  <span className="metric-label">Проведено уроков</span>
                  <span className="metric-big-num font-mono-tabular">
                    {studentLessons.filter((l) => l.status === 'completed').length}
                  </span>
                </div>
                <div className="stat-mini-box">
                  <span className="metric-label">Оплачено всего</span>
                  <span className="metric-big-num text-paid font-mono-tabular">
                    {formatCurrencyRUB(
                      studentLessons
                        .filter((l) => l.status !== 'cancelled' && l.isPaid)
                        .reduce((acc, l) => acc + (Number(l.price) || 0), 0)
                    )}
                  </span>
                </div>
                <div className="stat-mini-box">
                  <span className="metric-label">Ожидает оплаты</span>
                  <span className="metric-big-num text-unpaid font-mono-tabular">
                    {formatCurrencyRUB(
                      studentLessons
                        .filter((l) => l.status !== 'cancelled' && !l.isPaid)
                        .reduce((acc, l) => acc + (Number(l.price) || 0), 0)
                    )}
                  </span>
                </div>
              </div>

              {studentLessons.length === 0 ? (
                <div className="subpanel-box">
                  <p className="student-notes">
                    У этого ученика пока нет запланированных или проведенных уроков.
                  </p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Время</th>
                        <th>Предмет</th>
                        <th>Статус</th>
                        <th>Классная работа (CW)</th>
                        <th>Домашнее задание (HW)</th>
                        <th>Оплата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentLessons.map((lesson) => (
                        <tr
                          key={lesson.id}
                          onClick={() => {
                            onClose();
                            onEditLessonFromHistory(lesson);
                          }}
                        >
                          <td className="font-mono-tabular">
                            <strong>{formatRussianDate(lesson.date)}</strong>
                          </td>
                          <td className="font-mono-tabular">
                            {lesson.startTime} – {lesson.endTime}
                          </td>
                          <td className="font-mono-tabular">
                            <span
                              className={`subject-code ${
                                lesson.subject === 'eng' ? 'eng' : 'rus'
                              }`}
                            >
                              {lesson.subject === 'eng' ? 'ENG' : 'RUS'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                lesson.status === 'completed'
                                  ? 'text-paid'
                                  : lesson.status === 'cancelled'
                                  ? 'cancelled-badge'
                                  : ''
                              }
                            >
                              {STATUS_NAMES[lesson.status]}
                            </span>
                          </td>
                          <td>{lesson.classwork || '—'}</td>
                          <td>
                            {lesson.homework ? (
                              <div>
                                <span>{lesson.homework}</span>
                                {lesson.hwChecked && (
                                  <div className="text-paid">✓ Проверено</div>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="font-mono-tabular">
                            {lesson.status === 'cancelled' ? (
                              <span className="cancelled-badge">Отменен</span>
                            ) : (
                              <div>
                                <span className={lesson.isPaid ? 'text-paid' : 'text-unpaid'}>
                                  {lesson.price} ₽ · {lesson.isPaid ? 'Оплачено' : 'Не оплачено'}
                                </span>
                                {lesson.paymentNote && (
                                  <div className="student-meta">{lesson.paymentNote}</div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            /* VIEW 2: Directory of Students + Add/Edit Form */
            <>
              {isFormOpen && (
                <form onSubmit={handleStudentSubmit} className="subpanel-box">
                  <div className="modal-row-between">
                    <h3 className="student-name">
                      {editingStudent ? 'Редактировать профиль ученика' : 'Новый ученик'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="btn-link-muted"
                    >
                      Скрыть форму
                    </button>
                  </div>

                  {errorMsg && <div className="error-alert-box">{errorMsg}</div>}

                  <div className="form-row-3">
                    <div>
                      <label htmlFor="student-form-name" className="field-label">
                        Имя и фамилия *
                      </label>
                      <input
                        id="student-form-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например, Дмитрий Смирнов"
                        className="field-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="student-form-subject" className="field-label">
                        Предмет по умолчанию
                      </label>
                      <select
                        id="student-form-subject"
                        value={defaultSubject}
                        onChange={(e) => setDefaultSubject(e.target.value as Subject)}
                        className="field-select"
                      >
                        <option value="eng">🇬🇧 Английский язык (ENG)</option>
                        <option value="rus">🇷🇺 Русский язык (RUS)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="student-form-price" className="field-label">
                        Базовая стоимость урока (₽)
                      </label>
                      <input
                        id="student-form-price"
                        type="number"
                        min={0}
                        step={100}
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(Number(e.target.value))}
                        className="field-input font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="student-form-notes" className="field-label">
                      Заметка об ученике (уровень, цели, учебник)
                    </label>
                    <textarea
                      id="student-form-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Уровень знаний, экзамен, используемые пособия, пожелания..."
                      className="field-textarea"
                    />
                  </div>

                  <div className="modal-actions-group">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="btn-secondary"
                    >
                      Отмена
                    </button>
                    <button type="submit" className="btn-primary">
                      <UserCheck className="icon-sm" />
                      <span>{editingStudent ? 'Сохранить изменения' : 'Создать ученика'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Students Cards */}
              <div className="students-grid">
                {students.map((stu) => {
                  const stuLessons = lessons.filter(
                    (l) => l.studentId === stu.id && l.status !== 'cancelled'
                  );
                  const unpaidCount = stuLessons.filter((l) => !l.isPaid).length;

                  return (
                    <div
                      key={stu.id}
                      data-testid={`student-row-${stu.id}`}
                      className="student-card"
                    >
                      <div>
                        <div className="student-card-header">
                          <div>
                            <h3 className="student-name">{stu.name}</h3>
                            <div className="student-meta font-mono-tabular">
                              <span
                                className={
                                  stu.defaultSubject === 'eng' ? 'text-eng' : 'text-rus'
                                }
                              >
                                {stu.defaultSubject === 'eng'
                                  ? '🇬🇧 Английский (ENG)'
                                  : '🇷🇺 Русский (RUS)'}
                              </span>{' '}
                              · Базовая ставка: {stu.defaultPrice} ₽
                            </div>
                          </div>

                          <div className="toolbar-group">
                            <button
                              type="button"
                              onClick={() => openEditForm(stu)}
                              aria-label={`Редактировать ${stu.name}`}
                              className="icon-btn-muted"
                            >
                              <Edit3 className="icon-svg" />
                            </button>
                            {confirmDeleteId === stu.id ? (
                              <div className="delete-confirm-inline">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteStudent(stu.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="text-unpaid"
                                >
                                  Удалить
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="btn-link-muted"
                                >
                                  Отмена
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(stu.id)}
                                aria-label={`Удалить ${stu.name}`}
                                className="icon-btn-danger"
                              >
                                <Trash2 className="icon-svg" />
                              </button>
                            )}
                          </div>
                        </div>

                        {stu.notes && <p className="student-notes">{stu.notes}</p>}
                      </div>

                      <div className="student-card-footer">
                        <div className="student-meta font-mono-tabular">
                          Уроков: <strong>{stuLessons.length}</strong>
                          {unpaidCount > 0 && (
                            <>
                              {' '}
                              · <span className="text-unpaid">Не оплачено: {unpaidCount}</span>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedHistoryStudentId(stu.id)}
                          className="btn-secondary"
                        >
                          <History className="icon-sm" />
                          <span>История занятий</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
