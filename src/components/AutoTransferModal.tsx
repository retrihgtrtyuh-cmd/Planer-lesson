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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-slate-700" />
            <h2 id="autotransfer-modal-title" className="text-lg font-bold text-slate-900">
              Автоперенос расписания
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно автопереноса"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Копирует сетку уроков со сдвигом дат на <strong>+7 дней</strong>. Переносятся только
            ученик, время, предмет и стоимость. Поля классной работы, домашнего задания и оплаты
            очищаются, а отмененные уроки и дубликаты времени пропускаются.
          </p>

          {/* Direction selector */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700">
              Выберите направление копирования:
            </span>
            <div className="grid grid-cols-1 gap-2">
              <label
                className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
                  direction === 'prev-to-current'
                    ? 'bg-slate-50 border-slate-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="transfer-direction"
                  checked={direction === 'prev-to-current'}
                  onChange={() => setDirection('prev-to-current')}
                  className="text-slate-900 focus:ring-slate-900"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900">
                    С предыдущей недели на текущую открытую
                  </div>
                  <div className="text-slate-500 font-mono-tabular mt-0.5">
                    { buildAutoTransferredLessons(lessons, addDaysISO(currentMondayISO, -7), currentMondayISO).sourceWeekRange } → { buildAutoTransferredLessons(lessons, addDaysISO(currentMondayISO, -7), currentMondayISO).targetWeekRange }
                  </div>
                </div>
              </label>

              <label
                className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
                  direction === 'current-to-next'
                    ? 'bg-slate-50 border-slate-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="transfer-direction"
                  checked={direction === 'current-to-next'}
                  onChange={() => setDirection('current-to-next')}
                  className="text-slate-900 focus:ring-slate-900"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900">
                    С текущей открытой недели на следующую
                  </div>
                  <div className="text-slate-500 font-mono-tabular mt-0.5">
                    { buildAutoTransferredLessons(lessons, currentMondayISO, addDaysISO(currentMondayISO, 7)).sourceWeekRange } → { buildAutoTransferredLessons(lessons, currentMondayISO, addDaysISO(currentMondayISO, 7)).targetWeekRange }
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Preview Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                К переносу ({preview.sourceWeekRange} <ArrowRight className="inline w-3 h-3" />{' '}
                {preview.targetWeekRange}):
              </span>
              <span
                className="font-mono-tabular font-bold text-slate-900"
                data-testid="autotransfer-preview-count"
              >
                {preview.createdLessons.length} ур.
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 font-mono-tabular">
              <span>Пропущено отмененных: {preview.skippedCancelled}</span>
              <span>·</span>
              <span>Пропущено дублей по времени: {preview.skippedDuplicates}</span>
            </div>

            {preview.createdLessons.length > 0 ? (
              <div className="max-h-40 overflow-y-auto pt-2 border-t border-slate-200/80 space-y-1.5">
                {preview.createdLessons.map((item) => {
                  const stu = studentsMap.get(item.studentId);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs font-mono-tabular text-slate-700"
                    >
                      <span>
                        {formatRussianDate(item.date)} · {item.startTime}–{item.endTime}
                      </span>
                      <span className="font-sans font-medium text-slate-900">
                        {stu?.name || 'Ученик'} ({item.subject.toUpperCase()})
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-amber-800 pt-1">
                На выбранной исходной неделе нет доступных уроков для копирования (либо все слоты уже
                заняты).
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={preview.createdLessons.length === 0}
              onClick={handleConfirm}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Перенести уроки ({preview.createdLessons.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
