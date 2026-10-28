import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { Lesson, Student } from '../types';
import { addDaysISO, buildAutoTransferredLessons, formatRussianDate } from '../calendar';

interface AutoTransferModalProps {
  isOpen: boolean;
  currentMondayISO: string;
  lessons: Lesson[];
  studentsMap: Map<string, Student>;
  onClose: () => void;
  onConfirmTransfer: (newLessons: Lesson[], targetMondayISO: string) => void;
}

type TransferDirection = 'prev-to-current' | 'current-to-next';

export const AutoTransferModal: React.FC<AutoTransferModalProps> = ({
  isOpen,
  currentMondayISO,
  lessons,
  studentsMap,
  onClose,
  onConfirmTransfer,
}) => {
  const [direction, setDirection] = useState<TransferDirection>('prev-to-current');

  if (!isOpen) return null;

  const sourceMonday =
    direction === 'prev-to-current' ? addDaysISO(currentMondayISO, -7) : currentMondayISO;
  const targetMonday =
    direction === 'prev-to-current' ? currentMondayISO : addDaysISO(currentMondayISO, 7);

  const preview = buildAutoTransferredLessons(lessons, sourceMonday, targetMonday);
  const prevPreview = buildAutoTransferredLessons(
    lessons,
    addDaysISO(currentMondayISO, -7),
    currentMondayISO
  );
  const nextPreview = buildAutoTransferredLessons(
    lessons,
    currentMondayISO,
    addDaysISO(currentMondayISO, 7)
  );

  const handleConfirm = () => {
    if (preview.createdLessons.length === 0) {
      onClose();
      return;
    }
    onConfirmTransfer(preview.createdLessons, targetMonday);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="autotransfer-modal-title"
      className="modal-backdrop"
    >
      <div className="modal-window modal-md">
        {/* Header */}
        <div className="modal-header">
          <div className="toolbar-group">
            <RefreshCw className="icon-svg" />
            <h2 id="autotransfer-modal-title" className="modal-title">
              Автоперенос расписания
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно автопереноса"
            className="modal-close-btn"
          >
            <X className="icon-svg" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p className="student-notes">
            Копирует сетку уроков со сдвигом дат на <strong>+7 дней</strong>. Переносятся только
            ученик, время, предмет и стоимость. Поля классной работы, домашнего задания и оплаты
            очищаются, а отмененные уроки и дубликаты времени пропускаются.
          </p>

          {/* Direction selector */}
          <div>
            <span className="field-label">Выберите направление копирования:</span>
            <div className="day-lessons-list">
              <label
                className={`radio-card${direction === 'prev-to-current' ? ' active' : ''}`}
              >
                <input
                  type="radio"
                  name="transfer-direction"
                  checked={direction === 'prev-to-current'}
                  onChange={() => setDirection('prev-to-current')}
                />
                <div>
                  <div className="field-label">
                    С предыдущей недели на текущую открытую
                  </div>
                  <div className="student-meta font-mono-tabular">
                    {prevPreview.sourceWeekRange} → {prevPreview.targetWeekRange}
                  </div>
                </div>
              </label>

              <label
                className={`radio-card${direction === 'current-to-next' ? ' active' : ''}`}
              >
                <input
                  type="radio"
                  name="transfer-direction"
                  checked={direction === 'current-to-next'}
                  onChange={() => setDirection('current-to-next')}
                />
                <div>
                  <div className="field-label">
                    С текущей открытой недели на следующую
                  </div>
                  <div className="student-meta font-mono-tabular">
                    {nextPreview.sourceWeekRange} → {nextPreview.targetWeekRange}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Preview Box */}
          <div className="subpanel-box">
            <div className="modal-row-between">
              <span className="student-meta">
                К переносу ({preview.sourceWeekRange} <ArrowRight className="icon-sm" />{' '}
                {preview.targetWeekRange}):
              </span>
              <strong
                className="font-mono-tabular"
                data-testid="autotransfer-preview-count"
              >
                {preview.createdLessons.length} ур.
              </strong>
            </div>

            <div className="student-meta font-mono-tabular">
              Пропущено отмененных: {preview.skippedCancelled} · Пропущено дублей по времени:{' '}
              {preview.skippedDuplicates}
            </div>

            {preview.createdLessons.length > 0 ? (
              <div className="preview-scroll-list">
                {preview.createdLessons.map((item) => {
                  const stu = studentsMap.get(item.studentId);
                  return (
                    <div key={item.id} className="preview-item-row font-mono-tabular">
                      <span>
                        {formatRussianDate(item.date)} · {item.startTime}–{item.endTime}
                      </span>
                      <strong>
                        {stu?.name || 'Ученик'} ({item.subject.toUpperCase()})
                      </strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="student-notes">
                На выбранной исходной неделе нет доступных уроков для копирования (либо все слоты уже
                заняты).
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <div className="modal-actions-group">
            <button type="button" onClick={onClose} className="btn-secondary">
              Отмена
            </button>
            <button
              type="button"
              disabled={preview.createdLessons.length === 0}
              onClick={handleConfirm}
              className="btn-primary"
            >
              <CheckCircle2 className="icon-sm" />
              <span>Перенести уроки ({preview.createdLessons.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
