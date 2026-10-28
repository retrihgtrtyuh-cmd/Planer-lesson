(function (root) {
  'use strict';

  var STORAGE_KEYS = {
    STUDENTS: 'tutor_planner_students_v2',
    LESSONS: 'tutor_planner_lessons_v2',
    INITIALIZED: 'tutor_planner_initialized_v2',
    LAST_MONTH_ROLLOVER: 'tutor_planner_last_month_rollover',
  };

  var STUDENT_COLORS = [
    '#3b82f6', // Синий
    '#8b5cf6', // Фиолетовый
    '#ec4899', // Розовый
    '#f59e0b', // Янтарный
    '#10b981', // Изумрудный
    '#06b6d4', // Бирюзовый
    '#6366f1', // Индиго
    '#f97316', // Оранжевый
  ];

  // Safe in-memory fallback if Android WebView (htmltoapk) has DomStorage disabled
  var memoryStorage = {};

  function safeGetItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Fallback to in-memory storage on file:// security restrictions
    }
    return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
  }

  function safeSetItem(key, value) {
    memoryStorage[key] = String(value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
      }
    } catch (e) {
      // Ignore quota/security errors in restricted WebViews
    }
  }

  function createId(prefix) {
    var p = prefix || 'id';
    return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toISODateLocal(date) {
    return (
      date.getFullYear() +
      '-' +
      pad2(date.getMonth() + 1) +
      '-' +
      pad2(date.getDate())
    );
  }

  function parseISODateLocal(dateStr) {
    var parts = String(dateStr || '').split('-').map(Number);
    return new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0, 0);
  }

  function getMondayLocal(dateStr) {
    var d = dateStr ? parseISODateLocal(dateStr) : new Date();
    d.setHours(12, 0, 0, 0);
    var day = d.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return toISODateLocal(d);
  }

  function addDaysLocal(dateStr, days) {
    var d = parseISODateLocal(dateStr);
    d.setDate(d.getDate() + days);
    return toISODateLocal(d);
  }

  function createInitialDemoData(todayISO) {
    var nowISO = todayISO || toISODateLocal(new Date());
    var currentMonday = getMondayLocal(nowISO);
    var prevMonday = addDaysLocal(currentMonday, -7);

    var students = [
      {
        id: 'stu_1',
        name: 'Алина Соколова',
        defaultSubject: 'eng',
        defaultPrice: 1800,
        color: '#3b82f6',
        notes: 'Уровень B2 (Upper-Intermediate). Подготовка к IELTS Academic, цель 7.5. Учебник: Mindset for IELTS 2.',
        teacherNote: 'Контролировать тайминг на Writing Task 2 (не более 40 минут). Отрабатывать связки контраста.',
        teacherNoteActive: true,
      },
      {
        id: 'stu_2',
        name: 'Максим Морозов',
        defaultSubject: 'rus',
        defaultPrice: 1600,
        color: '#10b981',
        notes: '11 класс, подготовка к ЕГЭ по русскому языку. Особый упор на задания 8, 16–21 и структуру сочинения.',
        teacherNote: 'Каждый урок начинать с 5-минутной разминки по ударениям (задание 4 ЕГЭ) и паронимам.',
        teacherNoteActive: true,
      },
      {
        id: 'stu_3',
        name: 'София Лебедева',
        defaultSubject: 'eng',
        defaultPrice: 1500,
        color: '#8b5cf6',
        notes: 'Уровень B1, 9 класс. Разговорный практикум, расширение словарного запаса (Outcomes Intermediate).',
        teacherNote: 'Проверить долг по устному пересказу топика Travel & Accommodation.',
        teacherNoteActive: true,
      },
      {
        id: 'stu_4',
        name: 'Артем Ковалев',
        defaultSubject: 'rus',
        defaultPrice: 1400,
        color: '#f59e0b',
        notes: '8 класс. Повышение успеваемости, причастные и деепричастные обороты, правописание Н и НН.',
        teacherNote: '',
        teacherNoteActive: false,
      },
    ];

    var lessons = [
      {
        id: 'les_prev_1',
        studentId: 'stu_1',
        date: addDaysLocal(prevMonday, 0),
        startTime: '15:00',
        endTime: '16:00',
        subject: 'eng',
        status: 'completed',
        price: 1800,
        classwork: 'Unit 4: Academic Writing Task 1 (Line graphs & bar charts). Разбор структуры описания трендов.',
        homework: 'Написать отчет по графику стр. 48 (150+ слов), выучить 15 глаголов движения трендов.',
        hwChecked: true,
        isPaid: true,
        paymentNote: 'Перевод на карту',
        teacherNote: 'Контролировать тайминг на Writing Task 2 (не более 40 минут).',
        teacherNoteActive: true,
      },
      {
        id: 'les_prev_2',
        studentId: 'stu_2',
        date: addDaysLocal(prevMonday, 1),
        startTime: '17:00',
        endTime: '18:00',
        subject: 'rus',
        status: 'completed',
        price: 1600,
        classwork: 'Задание 27 ЕГЭ: формулировка авторской позиции и связка примеров-иллюстраций.',
        homework: 'Написать вступление и комментарий по тексту К. Паустовского (вариант 12), прорешать задания 9–15.',
        hwChecked: true,
        isPaid: true,
        paymentNote: 'Абонемент (3 из 4)',
        teacherNote: 'Каждый урок начинать с 5-минутной разминки по ударениям (задание 4 ЕГЭ) и паронимам.',
        teacherNoteActive: true,
      },
      {
        id: 'les_prev_3',
        studentId: 'stu_3',
        date: addDaysLocal(prevMonday, 2),
        startTime: '16:00',
        endTime: '17:00',
        subject: 'eng',
        status: 'completed',
        price: 1500,
        classwork: 'Present Perfect vs Past Simple в живых диалогах. Аудирование Unit 3.',
        homework: 'Workbook p. 24 ex. 1-4, записать голосовое сообщение на 2 минуты о поездке.',
        hwChecked: true,
        isPaid: true,
        paymentNote: 'Оплачено после урока',
        teacherNote: 'Проверить долг по устному пересказу топика Travel & Accommodation.',
        teacherNoteActive: true,
      },
      {
        id: 'les_prev_4',
        studentId: 'stu_4',
        date: addDaysLocal(prevMonday, 3),
        startTime: '16:30',
        endTime: '17:30',
        subject: 'rus',
        status: 'completed',
        price: 1400,
        classwork: 'Обособление определений, выраженных причастным оборотом.',
        homework: 'Упр. 142 (выписать 10 предложений, выделить графически причастные обороты).',
        hwChecked: false,
        isPaid: true,
        paymentNote: 'СБП',
        teacherNote: '',
        teacherNoteActive: false,
      },
      {
        id: 'les_curr_1',
        studentId: 'stu_1',
        date: addDaysLocal(currentMonday, 0),
        startTime: '15:00',
        endTime: '16:00',
        subject: 'eng',
        status: 'completed',
        price: 1800,
        classwork: 'Проверка отчета Writing Task 1. Переход к Speaking Part 2 (Technology & Education).',
        homework: 'Эссе Writing Task 2 на тему дистанционного образования (250 слов) + карточка говорения.',
        hwChecked: true,
        isPaid: true,
        paymentNote: 'СБП Т-Банк',
        teacherNote: 'Контролировать тайминг на Writing Task 2 (не более 40 минут). Отрабатывать связки контраста.',
        teacherNoteActive: true,
      },
      {
        id: 'les_curr_2',
        studentId: 'stu_3',
        date: addDaysLocal(currentMonday, 0),
        startTime: '17:00',
        endTime: '18:00',
        subject: 'eng',
        status: 'completed',
        price: 1500,
        classwork: 'Разбор ошибок из Workbook. Тема Travel & Accommodation, ролевая игра в аэропорту.',
        homework: 'Выучить фразовые глаголы (check in, set off, take off, get back), стр. 31 упр. 5.',
        hwChecked: true,
        isPaid: false,
        paymentNote: 'Оплата в конце недели',
        teacherNote: 'Проверить долг по устному пересказу топика Travel & Accommodation.',
        teacherNoteActive: true,
      },
      {
        id: 'les_curr_3',
        studentId: 'stu_2',
        date: addDaysLocal(currentMonday, 1),
        startTime: '17:00',
        endTime: '18:00',
        subject: 'rus',
        status: 'completed',
        price: 1600,
        classwork: 'Разбор сочинения по Паустовскому. Синтаксические нормы (задание 8 ЕГЭ) — ошибки с деепричастным оборотом.',
        homework: 'Прорешать 25 прототипов задания 8 в рабочей тетради, исправить речевые ошибки в абзаце 3.',
        hwChecked: true,
        isPaid: true,
        paymentNote: 'Абонемент (4 из 4)',
        teacherNote: 'Каждый урок начинать с 5-минутной разминки по ударениям (задание 4 ЕГЭ) и паронимам.',
        teacherNoteActive: true,
      },
      {
        id: 'les_curr_4',
        studentId: 'stu_4',
        date: addDaysLocal(currentMonday, 2),
        startTime: '16:00',
        endTime: '17:00',
        subject: 'rus',
        status: 'planned',
        price: 1400,
        classwork: 'Правописание Н и НН в полных и кратких страдательных причастиях.',
        homework: '',
        hwChecked: false,
        isPaid: false,
        paymentNote: '',
        teacherNote: '',
        teacherNoteActive: false,
      },
      {
        id: 'les_curr_5',
        studentId: 'stu_1',
        date: addDaysLocal(currentMonday, 3),
        startTime: '15:00',
        endTime: '16:00',
        subject: 'eng',
        status: 'planned',
        price: 1800,
        classwork: 'IELTS Reading: True / False / Not Given стратегии быстрого сканирования текста.',
        homework: 'Cambridge IELTS 18 Test 2 Reading Passage 1 & 2 с таймером (40 мин).',
        hwChecked: false,
        isPaid: true,
        paymentNote: 'Предоплата',
        teacherNote: 'Контролировать тайминг на Writing Task 2 (не более 40 минут). Отрабатывать связки контраста.',
        teacherNoteActive: true,
      },
      {
        id: 'les_curr_6',
        studentId: 'stu_2',
        date: addDaysLocal(currentMonday, 4),
        startTime: '16:30',
        endTime: '17:30',
        subject: 'rus',
        status: 'planned',
        price: 1600,
        classwork: 'Пунктуация в сложноподчиненном и бессоюзном предложении (задания 19–21 ЕГЭ).',
        homework: '',
        hwChecked: false,
        isPaid: false,
        paymentNote: 'Новый абонемент со следующей недели',
        teacherNote: 'Каждый урок начинать с 5-минутной разминки по ударениям (задание 4 ЕГЭ) и паронимам.',
        teacherNoteActive: true,
      },
      {
        id: 'les_curr_7',
        studentId: 'stu_3',
        date: addDaysLocal(currentMonday, 4),
        startTime: '18:30',
        endTime: '19:30',
        subject: 'eng',
        status: 'cancelled',
        price: 1500,
        classwork: 'Отмена по просьбе родителей (школьная олимпиада).',
        homework: '',
        hwChecked: false,
        isPaid: false,
        paymentNote: 'Перенос не требуется',
        teacherNote: 'Проверить долг по устному пересказу топика Travel & Accommodation.',
        teacherNoteActive: true,
      },
      {
        id: 'les_curr_8',
        studentId: 'stu_4',
        date: addDaysLocal(currentMonday, 5),
        startTime: '11:00',
        endTime: '12:00',
        subject: 'rus',
        status: 'planned',
        price: 1400,
        classwork: 'Контрольный диктант с грамматическим заданием по теме «Причастие и деепричасте».',
        homework: '',
        hwChecked: false,
        isPaid: true,
        paymentNote: 'Оплачено заранее',
        teacherNote: '',
        teacherNoteActive: false,
      },
    ];

    return { students: students, lessons: lessons };
  }

  function normalizeStateEntities(students, lessons, now) {
    var Calendar = root.TutorPlanner && root.TutorPlanner.Calendar;
    var stuPriceMap = {};
    var normalizedStudents = (students || []).map(function (s, idx) {
      var rawPrice = s && s.defaultPrice != null ? Number(s.defaultPrice) : NaN;
      var defaultPrice = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 1500;
      var color =
        s && typeof s.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s.color.trim())
          ? s.color.trim()
          : STUDENT_COLORS[idx % STUDENT_COLORS.length];
      stuPriceMap[s.id] = defaultPrice;
      return Object.assign({}, s, {
        defaultPrice: defaultPrice,
        color: color,
      });
    });

    var normalizedLessons = (lessons || []).map(function (l) {
      var rawPrice = l && l.price != null ? Number(l.price) : NaN;
      var fallbackPrice =
        stuPriceMap[l.studentId] != null ? stuPriceMap[l.studentId] : 1500;
      var price = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : fallbackPrice;
      return Object.assign({}, l, {
        price: price,
      });
    });

    if (Calendar && typeof Calendar.autoCompletePastLessons === 'function') {
      var autoRes = Calendar.autoCompletePastLessons(normalizedLessons, now);
      normalizedLessons = autoRes.lessons;
    }

    return {
      students: normalizedStudents,
      lessons: normalizedLessons,
    };
  }

  function savePlannerState(students, lessons) {
    safeSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students || []));
    safeSetItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons || []));
    safeSetItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  function loadPlannerState() {
    try {
      var rawStudents = safeGetItem(STORAGE_KEYS.STUDENTS);
      var rawLessons = safeGetItem(STORAGE_KEYS.LESSONS);
      var initialized = safeGetItem(STORAGE_KEYS.INITIALIZED);

      if (!initialized && !rawStudents && !rawLessons) {
        var demo = createInitialDemoData();
        var normDemo = normalizeStateEntities(demo.students, demo.lessons);
        savePlannerState(normDemo.students, normDemo.lessons);
        return normDemo;
      }

      var students = rawStudents ? JSON.parse(rawStudents) : [];
      var lessons = rawLessons ? JSON.parse(rawLessons) : [];

      if (students.length === 0 && lessons.length === 0 && !initialized) {
        var fallbackDemo = createInitialDemoData();
        var normFallback = normalizeStateEntities(
          fallbackDemo.students,
          fallbackDemo.lessons
        );
        savePlannerState(normFallback.students, normFallback.lessons);
        return normFallback;
      }

      var normalized = normalizeStateEntities(students, lessons);
      savePlannerState(normalized.students, normalized.lessons);
      return normalized;
    } catch (e) {
      var emergencyDemo = createInitialDemoData();
      return normalizeStateEntities(emergencyDemo.students, emergencyDemo.lessons);
    }
  }

  function serializeDatabaseBackup(students, lessons) {
    return JSON.stringify(
      {
        version: 3,
        exportedAt: new Date().toISOString(),
        students: students,
        lessons: lessons,
      },
      null,
      2
    );
  }

  function parseDatabaseBackupJSON(jsonString) {
    var parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.students) || !Array.isArray(parsed.lessons)) {
      throw new Error('Некорректный формат файла: отсутствуют массивы students или lessons.');
    }

    var stuPriceMap = {};
    var validStudents = parsed.students.map(function (s, idx) {
      if (!s || typeof s.name !== 'string' || !s.name.trim()) {
        throw new Error('Ошибка в данных ученика #' + (idx + 1) + ': отсутствует имя.');
      }
      var id = String(s.id || createId('stu'));
      var tNote = typeof s.teacherNote === 'string' ? s.teacherNote : '';
      var rawPrice = s.defaultPrice != null ? Number(s.defaultPrice) : NaN;
      var defaultPrice = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 1500;
      var color =
        typeof s.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s.color.trim())
          ? s.color.trim()
          : STUDENT_COLORS[idx % STUDENT_COLORS.length];
      stuPriceMap[id] = defaultPrice;
      return {
        id: id,
        name: s.name.trim(),
        defaultSubject: s.defaultSubject === 'rus' ? 'rus' : 'eng',
        defaultPrice: defaultPrice,
        color: color,
        notes: typeof s.notes === 'string' ? s.notes : '',
        teacherNote: tNote,
        teacherNoteActive:
          typeof s.teacherNoteActive === 'boolean' ? s.teacherNoteActive : Boolean(tNote),
      };
    });

    var validLessons = parsed.lessons.map(function (l, idx) {
      if (!l || typeof l.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(l.date)) {
        throw new Error('Ошибка в данных урока #' + (idx + 1) + ': некорректная дата.');
      }
      var status =
        l.status === 'completed' || l.status === 'cancelled' || l.status === 'rescheduled'
          ? l.status
          : 'planned';
      var tNote = typeof l.teacherNote === 'string' ? l.teacherNote : '';
      var sid = String(l.studentId || '');
      var rawPrice = l.price != null ? Number(l.price) : NaN;
      var fallbackPrice = stuPriceMap[sid] != null ? stuPriceMap[sid] : 1500;
      var price = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : fallbackPrice;
      return {
        id: String(l.id || createId('les')),
        studentId: sid,
        date: l.date,
        startTime: typeof l.startTime === 'string' ? l.startTime : '15:00',
        endTime: typeof l.endTime === 'string' ? l.endTime : '16:00',
        subject: l.subject === 'rus' ? 'rus' : 'eng',
        status: status,
        price: price,
        classwork: typeof l.classwork === 'string' ? l.classwork : '',
        homework: typeof l.homework === 'string' ? l.homework : '',
        hwChecked: Boolean(l.hwChecked),
        isPaid: Boolean(l.isPaid),
        paymentNote: typeof l.paymentNote === 'string' ? l.paymentNote : '',
        teacherNote: tNote,
        teacherNoteActive:
          typeof l.teacherNoteActive === 'boolean' ? l.teacherNoteActive : Boolean(tNote),
        repeatWeekly: l.repeatWeekly !== false,
        seriesId: typeof l.seriesId === 'string' ? l.seriesId : '',
        autoGenerated: Boolean(l.autoGenerated),
      };
    });

    return normalizeStateEntities(validStudents, validLessons);
  }

  function getLastMonthRollover() {
    return safeGetItem(STORAGE_KEYS.LAST_MONTH_ROLLOVER) || '';
  }

  function setLastMonthRollover(monthKey) {
    if (monthKey) {
      safeSetItem(STORAGE_KEYS.LAST_MONTH_ROLLOVER, String(monthKey));
    }
  }

  /**
   * Saves a new or edited lesson and automatically propagates clones to the end of its month
   * (if repeatWeekly is enabled and status is planned or auto-completed because its date is in the past).
   * Also automatically sets status = 'completed' if the saved lesson is in the past and status === 'planned'.
   */
  function saveLessonWithAutoSync(students, lessons, lessonData, options) {
    var opts = options || {};
    var Calendar = root.TutorPlanner && root.TutorPlanner.Calendar;
    var currentLessons = (lessons || []).slice();
    var repeatWeekly = lessonData.repeatWeekly !== false;

    var studentObj = (students || []).find(function (s) {
      return s.id === lessonData.studentId;
    });
    var rawPrice = lessonData.price != null ? Number(lessonData.price) : NaN;
    var resolvedPrice =
      !isNaN(rawPrice) && rawPrice >= 0
        ? rawPrice
        : studentObj && typeof studentObj.defaultPrice === 'number'
        ? studentObj.defaultPrice
        : 1500;

    var requestedStatus = lessonData.status || 'planned';
    var effectiveStatus = requestedStatus;
    if (
      effectiveStatus === 'planned' &&
      Calendar &&
      typeof Calendar.isLessonInPast === 'function' &&
      Calendar.isLessonInPast(lessonData.date, lessonData.endTime, opts.now)
    ) {
      effectiveStatus = 'completed';
    }

    var seriesId =
      lessonData.seriesId ||
      (Calendar
        ? Calendar.buildSeriesId(
            lessonData.studentId,
            lessonData.date,
            lessonData.startTime
          )
        : 'ser_' + lessonData.studentId);

    var savedLesson = Object.assign({}, lessonData, {
      id: lessonData.id || createId('les'),
      status: effectiveStatus,
      price: resolvedPrice,
      repeatWeekly: repeatWeekly,
      seriesId: seriesId,
    });

    var existingIndex = -1;
    var previousLesson = null;
    for (var i = 0; i < currentLessons.length; i++) {
      if (currentLessons[i].id === savedLesson.id) {
        existingIndex = i;
        previousLesson = currentLessons[i];
        break;
      }
    }

    var updatedSeriesCount = 0;

    if (existingIndex !== -1) {
      if (opts.applyToSeries && previousLesson && Calendar) {
        var futureSeries = Calendar.findFutureMonthSeriesLessons(
          currentLessons,
          previousLesson
        );
        var futureIds = {};
        for (var f = 0; f < futureSeries.length; f++) {
          futureIds[futureSeries[f].id] = true;
        }

        var oldWeekday = Calendar.getWeekdayIndexMondayZero(previousLesson.date);
        var newWeekday = Calendar.getWeekdayIndexMondayZero(savedLesson.date);
        var weekdayDelta = newWeekday - oldWeekday;
        var targetMonthPrefix = savedLesson.date.slice(0, 7);

        var nextList = [];
        for (var k = 0; k < currentLessons.length; k++) {
          var item = currentLessons[k];
          if (item.id === savedLesson.id) {
            nextList.push(savedLesson);
            continue;
          }
          if (futureIds[item.id] && item.status === 'planned' && !item.isPaid) {
            if (!repeatWeekly) {
              updatedSeriesCount += 1;
              continue;
            }
            var shiftedDate =
              weekdayDelta !== 0
                ? Calendar.addDaysISO(item.date, weekdayDelta)
                : item.date;
            if (shiftedDate.slice(0, 7) !== targetMonthPrefix) {
              updatedSeriesCount += 1;
              continue;
            }
            var shiftedStatus =
              Calendar.isLessonInPast(shiftedDate, savedLesson.endTime, opts.now)
                ? 'completed'
                : 'planned';
            nextList.push(
              Object.assign({}, item, {
                studentId: savedLesson.studentId,
                date: shiftedDate,
                startTime: savedLesson.startTime,
                endTime: savedLesson.endTime,
                subject: savedLesson.subject,
                price: savedLesson.price,
                status: shiftedStatus,
                teacherNote: savedLesson.teacherNote,
                teacherNoteActive: savedLesson.teacherNoteActive,
                repeatWeekly: true,
                seriesId: seriesId,
              })
            );
            updatedSeriesCount += 1;
            continue;
          }
          nextList.push(item);
        }
        currentLessons = nextList;
      } else {
        currentLessons[existingIndex] = savedLesson;
      }
    } else {
      currentLessons.push(savedLesson);
    }

    var createdClones = [];
    if (
      Calendar &&
      repeatWeekly &&
      (requestedStatus === 'planned' || savedLesson.status === 'planned')
    ) {
      var propResult = Calendar.propagateLessonToMonthEnd(
        currentLessons,
        savedLesson,
        students,
        function () {
          return createId('les');
        },
        opts.now
      );
      currentLessons = propResult.lessons;
      createdClones = propResult.createdClones;
    }

    savePlannerState(students, currentLessons);

    return {
      lesson: savedLesson,
      lessons: currentLessons,
      createdClones: createdClones,
      updatedSeriesCount: updatedSeriesCount,
    };
  }

  /**
   * Deletes a lesson. If applyToSeries === true, also deletes future planned unpaid
   * lessons of the same series in that month (never touching completed or paid lessons).
   */
  function deleteLessonWithAutoSync(students, lessons, lessonId, applyToSeries) {
    var Calendar = root.TutorPlanner && root.TutorPlanner.Calendar;
    var currentLessons = (lessons || []).slice();
    var target = null;
    for (var i = 0; i < currentLessons.length; i++) {
      if (currentLessons[i].id === lessonId) {
        target = currentLessons[i];
        break;
      }
    }
    if (!target) {
      return { lessons: currentLessons, deletedCount: 0 };
    }

    var idsToDelete = {};
    idsToDelete[lessonId] = true;

    if (applyToSeries && Calendar) {
      var futureSeries = Calendar.findFutureMonthSeriesLessons(
        currentLessons,
        target
      );
      for (var f = 0; f < futureSeries.length; f++) {
        if (futureSeries[f].status === 'planned' && !futureSeries[f].isPaid) {
          idsToDelete[futureSeries[f].id] = true;
        }
      }
    }

    var deletedCount = 0;
    var remaining = currentLessons.filter(function (l) {
      if (idsToDelete[l.id]) {
        deletedCount += 1;
        return false;
      }
      return true;
    });

    savePlannerState(students, remaining);
    return {
      lessons: remaining,
      deletedCount: deletedCount,
    };
  }

  /**
   * Rule B store helper: checks if month rollover should run (on the last day of the month
   * or upon entering a new month), generates the next month's schedule, persists state
   * and records LAST_MONTH_ROLLOVER.
   */
  function runAutoMonthRolloverIfNeeded(students, lessons, currentDateStr, options) {
    var Calendar = root.TutorPlanner && root.TutorPlanner.Calendar;
    if (!Calendar) {
      return {
        triggered: false,
        targetMonthKey: getLastMonthRollover(),
        createdLessons: [],
        lessons: lessons || [],
      };
    }

    var lastKey = getLastMonthRollover();
    var rolloverRes = Calendar.autoRolloverToNextMonth(
      lessons,
      students,
      currentDateStr,
      lastKey,
      function () {
        return createId('les');
      },
      options
    );

    if (rolloverRes.triggered && rolloverRes.targetMonthKey) {
      setLastMonthRollover(rolloverRes.targetMonthKey);
      if (rolloverRes.createdLessons.length > 0) {
        savePlannerState(students, rolloverRes.lessons);
      }
    }

    return rolloverRes;
  }

  var Store = {
    STORAGE_KEYS: STORAGE_KEYS,
    STUDENT_COLORS: STUDENT_COLORS,
    createId: createId,
    createInitialDemoData: createInitialDemoData,
    normalizeStateEntities: normalizeStateEntities,
    loadPlannerState: loadPlannerState,
    savePlannerState: savePlannerState,
    serializeDatabaseBackup: serializeDatabaseBackup,
    parseDatabaseBackupJSON: parseDatabaseBackupJSON,
    getLastMonthRollover: getLastMonthRollover,
    setLastMonthRollover: setLastMonthRollover,
    saveLessonWithAutoSync: saveLessonWithAutoSync,
    deleteLessonWithAutoSync: deleteLessonWithAutoSync,
    runAutoMonthRolloverIfNeeded: runAutoMonthRolloverIfNeeded,
  };

  root.TutorPlanner = root.TutorPlanner || {};
  root.TutorPlanner.Store = Store;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Store;
  }
})(typeof window !== 'undefined' ? window : globalThis);
