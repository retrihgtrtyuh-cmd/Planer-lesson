(function (root) {
  'use strict';

  var STORAGE_KEYS = {
    STUDENTS: 'tutor_planner_students_v3',
    LESSONS: 'tutor_planner_lessons_v3',
    DELETED_IDS: 'tutor_planner_deleted_ids_v3',
    INITIALIZED: 'tutor_planner_initialized_v3',
    LAST_MONTH_ROLLOVER: 'tutor_planner_last_month_rollover_v3',
    PAIRED_DEVICE: 'tutor_planner_paired_device_v3',
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
    return Object.prototype.hasOwnProperty.call(memoryStorage, key)
      ? memoryStorage[key]
      : null;
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

  function safeRemoveItem(key) {
    delete memoryStorage[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // Ignore security errors
    }
  }

  function createId(prefix) {
    var p = prefix || 'id';
    return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Returns a clean empty initial database without any fictional students, prices, or lessons
   * so a freshly installed app is ready for immediate synchronization or user entry.
   */
  function createInitialDemoData() {
    return {
      students: [],
      lessons: [],
      deletedIds: [],
    };
  }

  function normalizeDeletedIds(deletedIds) {
    if (!Array.isArray(deletedIds)) return [];
    var map = {};
    for (var i = 0; i < deletedIds.length; i++) {
      var item = deletedIds[i];
      if (!item || !item.id) continue;
      var idStr = String(item.id);
      var ts = Number(item.deletedAt) || Date.now();
      if (!map[idStr] || ts > map[idStr]) {
        map[idStr] = ts;
      }
    }
    var keys = Object.keys(map);
    var result = [];
    for (var k = 0; k < keys.length; k++) {
      result.push({
        id: keys[k],
        deletedAt: map[keys[k]],
      });
    }
    return result;
  }

  function recordDeletedIds(existingDeletedIds, idsToAdd, deletedAtTimestamp) {
    var ts = Number(deletedAtTimestamp) || Date.now();
    var combined = (existingDeletedIds || []).slice();
    var list = Array.isArray(idsToAdd) ? idsToAdd : [idsToAdd];
    for (var i = 0; i < list.length; i++) {
      if (list[i]) {
        combined.push({
          id: String(list[i]),
          deletedAt: ts,
        });
      }
    }
    return normalizeDeletedIds(combined);
  }

  function normalizeStateEntities(students, lessons, now, deletedIds) {
    var Calendar = root.TutorPlanner && root.TutorPlanner.Calendar;
    var stuPriceMap = {};
    var normalizedStudents = (students || []).map(function (s, idx) {
      var rawPrice = s && s.defaultPrice != null ? Number(s.defaultPrice) : NaN;
      var defaultPrice = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
      var color =
        s && typeof s.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s.color.trim())
          ? s.color.trim()
          : STUDENT_COLORS[idx % STUDENT_COLORS.length];
      var updatedAt =
        s && typeof s.updatedAt === 'number' && !isNaN(s.updatedAt) && s.updatedAt > 0
          ? s.updatedAt
          : 1;
      stuPriceMap[s.id] = defaultPrice;
      return Object.assign({}, s, {
        defaultPrice: defaultPrice,
        color: color,
        updatedAt: updatedAt,
      });
    });

    var normalizedLessons = (lessons || []).map(function (l) {
      var rawPrice = l && l.price != null ? Number(l.price) : NaN;
      var fallbackPrice =
        stuPriceMap[l.studentId] != null ? stuPriceMap[l.studentId] : 0;
      var price = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : fallbackPrice;
      var updatedAt =
        l && typeof l.updatedAt === 'number' && !isNaN(l.updatedAt) && l.updatedAt > 0
          ? l.updatedAt
          : 1;
      return Object.assign({}, l, {
        price: price,
        updatedAt: updatedAt,
      });
    });

    if (Calendar && typeof Calendar.autoCompletePastLessons === 'function') {
      var autoRes = Calendar.autoCompletePastLessons(normalizedLessons, now);
      normalizedLessons = autoRes.lessons;
    }

    return {
      students: normalizedStudents,
      lessons: normalizedLessons,
      deletedIds: normalizeDeletedIds(deletedIds || loadDeletedIds()),
    };
  }

  function loadDeletedIds() {
    try {
      var raw = safeGetItem(STORAGE_KEYS.DELETED_IDS);
      return raw ? normalizeDeletedIds(JSON.parse(raw)) : [];
    } catch (e) {
      return [];
    }
  }

  function saveDeletedIds(deletedIds) {
    var norm = normalizeDeletedIds(deletedIds);
    safeSetItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(norm));
    return norm;
  }

  function savePlannerState(students, lessons, deletedIds) {
    safeSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students || []));
    safeSetItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons || []));
    if (Array.isArray(deletedIds)) {
      saveDeletedIds(deletedIds);
    }
    safeSetItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  function loadPlannerState() {
    try {
      var rawStudents = safeGetItem(STORAGE_KEYS.STUDENTS);
      var rawLessons = safeGetItem(STORAGE_KEYS.LESSONS);
      var rawDeleted = safeGetItem(STORAGE_KEYS.DELETED_IDS);
      var initialized = safeGetItem(STORAGE_KEYS.INITIALIZED);

      if (!initialized && !rawStudents && !rawLessons) {
        var emptyInit = createInitialDemoData();
        savePlannerState(emptyInit.students, emptyInit.lessons, emptyInit.deletedIds);
        return emptyInit;
      }

      var students = rawStudents ? JSON.parse(rawStudents) : [];
      var lessons = rawLessons ? JSON.parse(rawLessons) : [];
      var deletedIds = rawDeleted ? JSON.parse(rawDeleted) : [];

      var normalized = normalizeStateEntities(students, lessons, undefined, deletedIds);
      savePlannerState(normalized.students, normalized.lessons, normalized.deletedIds);
      return normalized;
    } catch (e) {
      return createInitialDemoData();
    }
  }

  function serializeDatabaseBackup(students, lessons, deletedIds) {
    var delList = Array.isArray(deletedIds) ? normalizeDeletedIds(deletedIds) : loadDeletedIds();
    return JSON.stringify(
      {
        version: 4,
        exportedAt: new Date().toISOString(),
        students: students || [],
        lessons: lessons || [],
        deletedIds: delList,
      },
      null,
      2
    );
  }

  function parseDatabaseBackupJSON(jsonStringOrObject) {
    var parsed =
      typeof jsonStringOrObject === 'string'
        ? JSON.parse(jsonStringOrObject)
        : jsonStringOrObject;

    if (!parsed || !Array.isArray(parsed.students) || !Array.isArray(parsed.lessons)) {
      throw new Error('Некорректный формат данных синхронизации.');
    }

    var stuPriceMap = {};
    var validStudents = parsed.students.map(function (s, idx) {
      if (!s || typeof s.name !== 'string' || !s.name.trim()) {
        throw new Error('Ошибка в данных ученика #' + (idx + 1) + ': отсутствует имя.');
      }
      var id = String(s.id || createId('stu'));
      var tNote = typeof s.teacherNote === 'string' ? s.teacherNote : '';
      var rawPrice = s.defaultPrice != null ? Number(s.defaultPrice) : NaN;
      var defaultPrice = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
      var color =
        typeof s.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s.color.trim())
          ? s.color.trim()
          : STUDENT_COLORS[idx % STUDENT_COLORS.length];
      var updatedAt =
        typeof s.updatedAt === 'number' && !isNaN(s.updatedAt) && s.updatedAt > 0
          ? s.updatedAt
          : 1;
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
        updatedAt: updatedAt,
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
      var fallbackPrice = stuPriceMap[sid] != null ? stuPriceMap[sid] : 0;
      var price = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : fallbackPrice;
      var updatedAt =
        typeof l.updatedAt === 'number' && !isNaN(l.updatedAt) && l.updatedAt > 0
          ? l.updatedAt
          : 1;
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
        updatedAt: updatedAt,
      };
    });

    var validDeletedIds = normalizeDeletedIds(parsed.deletedIds || []);

    return normalizeStateEntities(validStudents, validLessons, undefined, validDeletedIds);
  }

  /**
   * Smart Merge (Умное двустороннее слияние баз данных):
   * - Can be called as mergeSyncData(incomingData) or mergeSyncData(localData, incomingData).
   * - Respects deletedIds [{ id, deletedAt }] so deleted lessons/students never resurrect.
   * - Adds missing records by id.
   * - Resolves conflicts on records present on both devices by keeping the one with greater updatedAt.
   * - Returns merged state + human-readable Russian summary report.
   */
  function mergeSyncData(localOrIncoming, optionalIncoming) {
    var localState;
    var rawIncoming;

    if (arguments.length >= 2 && optionalIncoming !== undefined) {
      localState = localOrIncoming || loadPlannerState();
      rawIncoming = optionalIncoming;
    } else {
      localState = loadPlannerState();
      rawIncoming = localOrIncoming;
    }

    var incomingParsed = parseDatabaseBackupJSON(rawIncoming);

    var localStudents = Array.isArray(localState.students) ? localState.students : [];
    var localLessons = Array.isArray(localState.lessons) ? localState.lessons : [];
    var localDeleted = Array.isArray(localState.deletedIds)
      ? localState.deletedIds
      : loadDeletedIds();

    var mergedDeletedList = normalizeDeletedIds(
      localDeleted.concat(incomingParsed.deletedIds || [])
    );
    var deletedMap = {};
    for (var d = 0; d < mergedDeletedList.length; d++) {
      deletedMap[mergedDeletedList[d].id] = mergedDeletedList[d].deletedAt;
    }

    function isDeletedEntity(entity) {
      if (!entity || !entity.id) return true;
      var delAt = deletedMap[entity.id];
      if (!delAt) return false;
      var updAt = Number(entity.updatedAt) || 0;
      return updAt <= delAt;
    }

    var addedStudents = 0;
    var updatedStudents = 0;
    var addedLessons = 0;
    var updatedLessons = 0;

    // 1. Merge Students by id
    var studentMap = {};
    var studentOrder = [];

    for (var i = 0; i < localStudents.length; i++) {
      var locStu = localStudents[i];
      if (!locStu || !locStu.id) continue;
      if (isDeletedEntity(locStu)) continue;
      studentMap[locStu.id] = Object.assign({}, locStu, {
        updatedAt: Number(locStu.updatedAt) || 1,
      });
      studentOrder.push(locStu.id);
    }

    var incomingStudents = incomingParsed.students || [];
    for (var j = 0; j < incomingStudents.length; j++) {
      var incStu = incomingStudents[j];
      if (!incStu || !incStu.id) continue;
      if (isDeletedEntity(incStu)) continue;

      var existingStu = studentMap[incStu.id];
      if (!existingStu) {
        studentMap[incStu.id] = Object.assign({}, incStu, {
          updatedAt: Number(incStu.updatedAt) || 1,
        });
        studentOrder.push(incStu.id);
        addedStudents += 1;
      } else {
        var incStuTime = Number(incStu.updatedAt) || 1;
        var locStuTime = Number(existingStu.updatedAt) || 1;
        if (incStuTime > locStuTime) {
          studentMap[incStu.id] = Object.assign({}, incStu, {
            updatedAt: incStuTime,
          });
          updatedStudents += 1;
        }
      }
    }

    var mergedStudents = [];
    for (var sIdx = 0; sIdx < studentOrder.length; sIdx++) {
      var sid = studentOrder[sIdx];
      if (studentMap[sid]) {
        mergedStudents.push(studentMap[sid]);
      }
    }

    // 2. Merge Lessons by id
    var lessonMap = {};
    var lessonOrder = [];

    for (var l = 0; l < localLessons.length; l++) {
      var locLes = localLessons[l];
      if (!locLes || !locLes.id) continue;
      if (isDeletedEntity(locLes)) continue;
      if (deletedMap[locLes.studentId] && !studentMap[locLes.studentId]) continue;
      lessonMap[locLes.id] = Object.assign({}, locLes, {
        updatedAt: Number(locLes.updatedAt) || 1,
      });
      lessonOrder.push(locLes.id);
    }

    var incomingLessons = incomingParsed.lessons || [];
    for (var m = 0; m < incomingLessons.length; m++) {
      var incLes = incomingLessons[m];
      if (!incLes || !incLes.id) continue;
      if (isDeletedEntity(incLes)) continue;
      if (deletedMap[incLes.studentId] && !studentMap[incLes.studentId]) continue;

      var existingLes = lessonMap[incLes.id];
      if (!existingLes) {
        lessonMap[incLes.id] = Object.assign({}, incLes, {
          updatedAt: Number(incLes.updatedAt) || 1,
        });
        lessonOrder.push(incLes.id);
        addedLessons += 1;
      } else {
        var incLesTime = Number(incLes.updatedAt) || 1;
        var locLesTime = Number(existingLes.updatedAt) || 1;
        if (incLesTime > locLesTime) {
          lessonMap[incLes.id] = Object.assign({}, incLes, {
            updatedAt: incLesTime,
          });
          updatedLessons += 1;
        }
      }
    }

    var mergedLessons = [];
    for (var lIdx = 0; lIdx < lessonOrder.length; lIdx++) {
      var lid = lessonOrder[lIdx];
      if (lessonMap[lid]) {
        mergedLessons.push(lessonMap[lid]);
      }
    }

    var normalized = normalizeStateEntities(
      mergedStudents,
      mergedLessons,
      undefined,
      mergedDeletedList
    );

    savePlannerState(
      normalized.students,
      normalized.lessons,
      normalized.deletedIds
    );

    var totalStudentsChanged = addedStudents + updatedStudents;
    var reportText =
      'Добавлено уроков: ' +
      addedLessons +
      ', Обновлено: ' +
      updatedLessons +
      ', Учеников: ' +
      totalStudentsChanged;

    return {
      students: normalized.students,
      lessons: normalized.lessons,
      deletedIds: normalized.deletedIds,
      addedLessons: addedLessons,
      updatedLessons: updatedLessons,
      addedStudents: addedStudents,
      updatedStudents: updatedStudents,
      totalStudentsChanged: totalStudentsChanged,
      reportText: reportText,
    };
  }

  function getPairedDeviceCode() {
    return safeGetItem(STORAGE_KEYS.PAIRED_DEVICE) || '';
  }

  function setPairedDeviceCode(code) {
    var clean = String(code || '').replace(/\D/g, '').slice(0, 6);
    if (clean.length === 6) {
      safeSetItem(STORAGE_KEYS.PAIRED_DEVICE, clean);
    } else if (!clean) {
      safeRemoveItem(STORAGE_KEYS.PAIRED_DEVICE);
    }
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
   * Saves a new or edited lesson with updatedAt: Date.now() and automatically propagates
   * clones to the end of its month if repeatWeekly is enabled.
   */
  function saveLessonWithAutoSync(students, lessons, lessonData, options) {
    var opts = options || {};
    var nowTs = Date.now();
    var Calendar = root.TutorPlanner && root.TutorPlanner.Calendar;
    var currentLessons = (lessons || []).slice();
    var currentDeletedIds = loadDeletedIds();
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
        : 0;

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
      updatedAt: nowTs,
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
    var removedSeriesIds = [];

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
              removedSeriesIds.push(item.id);
              continue;
            }
            var shiftedDate =
              weekdayDelta !== 0
                ? Calendar.addDaysISO(item.date, weekdayDelta)
                : item.date;
            if (shiftedDate.slice(0, 7) !== targetMonthPrefix) {
              updatedSeriesCount += 1;
              removedSeriesIds.push(item.id);
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
                updatedAt: nowTs,
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

    if (removedSeriesIds.length > 0) {
      currentDeletedIds = recordDeletedIds(currentDeletedIds, removedSeriesIds, nowTs);
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
      currentLessons = propResult.lessons.map(function (l) {
        return l.updatedAt ? l : Object.assign({}, l, { updatedAt: nowTs });
      });
      createdClones = propResult.createdClones;
    }

    savePlannerState(students, currentLessons, currentDeletedIds);

    return {
      lesson: savedLesson,
      lessons: currentLessons,
      deletedIds: currentDeletedIds,
      createdClones: createdClones,
      updatedSeriesCount: updatedSeriesCount,
    };
  }

  /**
   * Deletes a lesson and records its id in deletedIds: [{ id, deletedAt }]
   * so it will not resurrect when syncing with another device.
   */
  function deleteLessonWithAutoSync(students, lessons, lessonId, applyToSeries) {
    var Calendar = root.TutorPlanner && root.TutorPlanner.Calendar;
    var currentLessons = (lessons || []).slice();
    var currentDeletedIds = loadDeletedIds();
    var target = null;
    for (var i = 0; i < currentLessons.length; i++) {
      if (currentLessons[i].id === lessonId) {
        target = currentLessons[i];
        break;
      }
    }
    if (!target) {
      return {
        lessons: currentLessons,
        deletedIds: currentDeletedIds,
        deletedCount: 0,
      };
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
    var removedList = [];
    var remaining = currentLessons.filter(function (l) {
      if (idsToDelete[l.id]) {
        deletedCount += 1;
        removedList.push(l.id);
        return false;
      }
      return true;
    });

    var updatedDeletedIds = recordDeletedIds(
      currentDeletedIds,
      removedList,
      Date.now()
    );

    savePlannerState(students, remaining, updatedDeletedIds);
    return {
      lessons: remaining,
      deletedIds: updatedDeletedIds,
      deletedCount: deletedCount,
    };
  }

  /**
   * Deletes a student and all their lessons, recording all deleted IDs in deletedIds
   * so neither the student nor their lessons resurrect during Smart Merge.
   */
  function deleteStudentWithAutoSync(students, lessons, studentId) {
    var nowTs = Date.now();
    var removedIds = [studentId];
    var remainingStudents = (students || []).filter(function (s) {
      return s.id !== studentId;
    });
    var remainingLessons = (lessons || []).filter(function (l) {
      if (l.studentId === studentId) {
        removedIds.push(l.id);
        return false;
      }
      return true;
    });
    var updatedDeletedIds = recordDeletedIds(loadDeletedIds(), removedIds, nowTs);
    savePlannerState(remainingStudents, remainingLessons, updatedDeletedIds);
    return {
      students: remainingStudents,
      lessons: remainingLessons,
      deletedIds: updatedDeletedIds,
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
        var nowTs = Date.now();
        rolloverRes.lessons = rolloverRes.lessons.map(function (l) {
          return l.updatedAt ? l : Object.assign({}, l, { updatedAt: nowTs });
        });
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
    normalizeDeletedIds: normalizeDeletedIds,
    recordDeletedIds: recordDeletedIds,
    loadDeletedIds: loadDeletedIds,
    saveDeletedIds: saveDeletedIds,
    normalizeStateEntities: normalizeStateEntities,
    loadPlannerState: loadPlannerState,
    savePlannerState: savePlannerState,
    serializeDatabaseBackup: serializeDatabaseBackup,
    parseDatabaseBackupJSON: parseDatabaseBackupJSON,
    mergeSyncData: mergeSyncData,
    getPairedDeviceCode: getPairedDeviceCode,
    setPairedDeviceCode: setPairedDeviceCode,
    getLastMonthRollover: getLastMonthRollover,
    setLastMonthRollover: setLastMonthRollover,
    saveLessonWithAutoSync: saveLessonWithAutoSync,
    deleteLessonWithAutoSync: deleteLessonWithAutoSync,
    deleteStudentWithAutoSync: deleteStudentWithAutoSync,
    runAutoMonthRolloverIfNeeded: runAutoMonthRolloverIfNeeded,
  };

  root.TutorPlanner = root.TutorPlanner || {};
  root.TutorPlanner.Store = Store;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Store;
  }
})(typeof window !== 'undefined' ? window : globalThis);
