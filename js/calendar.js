(function (root) {
  'use strict';

  var MONTHS_GENITIVE_SHORT = [
    'янв',
    'фев',
    'мар',
    'апр',
    'мая',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ];

  var DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var DAY_NAMES_FULL = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
    'Воскресенье',
  ];

  function parseISODate(dateStr) {
    var parts = String(dateStr || '').split('-').map(Number);
    return new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0, 0);
  }

  function toISODateString(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function getTodayISO(now) {
    var d = now || new Date();
    return toISODateString(d);
  }

  function getMondayOfWeek(input) {
    var d;
    if (!input) {
      var now = new Date();
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    } else if (typeof input === 'string') {
      d = parseISODate(input);
    } else {
      d = new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0);
    }
    var day = d.getDay();
    var diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    return toISODateString(d);
  }

  function addDaysISO(dateStr, days) {
    var d = parseISODate(dateStr);
    d.setDate(d.getDate() + days);
    return toISODateString(d);
  }

  /**
   * Adds a duration in minutes (default 60 minutes = 1 hour) to a HH:mm time string.
   */
  function addMinutesToTime(startTimeStr, durationMinutes) {
    var minsToAdd = typeof durationMinutes === 'number' ? durationMinutes : 60;
    var parts = String(startTimeStr || '15:00').split(':').map(Number);
    var h = isNaN(parts[0]) ? 15 : parts[0];
    var m = isNaN(parts[1]) ? 0 : parts[1];
    var totalMinutes = (h * 60 + m + minsToAdd) % (24 * 60);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    var endH = Math.floor(totalMinutes / 60);
    var endM = totalMinutes % 60;
    return String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0');
  }

  /**
   * Converts HH:mm string to minutes from midnight.
   */
  function timeStrToMinutes(timeStr) {
    var parts = String(timeStr || '15:00').split(':').map(Number);
    var h = isNaN(parts[0]) ? 15 : parts[0];
    var m = isNaN(parts[1]) ? 0 : parts[1];
    return h * 60 + m;
  }

  /**
   * Calculates duration in minutes between startTime and endTime.
   */
  function getDurationMinutes(startTimeStr, endTimeStr) {
    var sMins = timeStrToMinutes(startTimeStr || '15:00');
    var eMins = timeStrToMinutes(endTimeStr || '16:00');
    var diff = eMins - sMins;
    return diff > 0 ? diff : 60;
  }

  /**
   * Formats total minutes as compact Russian hours/minutes string (e.g. "1 ч", "1.5 ч", "2 ч 15 м").
   */
  function formatTotalDurationCompact(totalMinutes) {
    var mins = Number(totalMinutes) || 0;
    if (mins <= 0) return '0 ч';
    var hours = Math.floor(mins / 60);
    var rem = mins % 60;
    if (rem === 0) return hours + ' ч';
    if (rem === 30) return hours + '.5 ч';
    if (hours === 0) return rem + ' мин';
    return hours + ' ч ' + rem + ' м';
  }

  /**
   * Formats a number as Russian rubles (e.g. 1800 -> "1 800 ₽", 0 -> "0 ₽").
   */
  function formatCurrency(amount) {
    var num =
      typeof amount === 'number' && !isNaN(amount)
        ? Math.round(amount)
        : Math.round(Number(amount) || 0);
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  /**
   * Checks if a lesson's date and endTime are in the past relative to `now`.
   * `now` can be a Date instance, an ISO timestamp string, or undefined (defaults to new Date()).
   */
  function isLessonInPast(dateStr, endTimeStr, now) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

    var nowObj;
    var todayISO;
    var nowMinutes;

    if (!now) {
      nowObj = new Date();
      todayISO = toISODateString(nowObj);
      nowMinutes = nowObj.getHours() * 60 + nowObj.getMinutes();
    } else if (now instanceof Date) {
      nowObj = now;
      todayISO = toISODateString(nowObj);
      nowMinutes = nowObj.getHours() * 60 + nowObj.getMinutes();
    } else if (typeof now === 'string') {
      if (now.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(now)) {
        todayISO = now;
        nowMinutes = 23 * 60 + 59;
      } else {
        nowObj = new Date(now);
        todayISO = toISODateString(nowObj);
        nowMinutes = nowObj.getHours() * 60 + nowObj.getMinutes();
      }
    } else {
      nowObj = new Date();
      todayISO = toISODateString(nowObj);
      nowMinutes = nowObj.getHours() * 60 + nowObj.getMinutes();
    }

    if (dateStr < todayISO) return true;
    if (dateStr > todayISO) return false;

    var endMins = timeStrToMinutes(endTimeStr || '16:00');
    return nowMinutes >= endMins;
  }

  /**
   * Automatically transitions any 'planned' lesson whose end time has passed into 'completed'.
   * Cancelled and rescheduled lessons are never modified.
   */
  function autoCompletePastLessons(lessons, now) {
    var list = lessons || [];
    var changedCount = 0;
    var updated = new Array(list.length);

    for (var i = 0; i < list.length; i++) {
      var l = list[i];
      if (l && l.status === 'planned' && isLessonInPast(l.date, l.endTime, now)) {
        updated[i] = Object.assign({}, l, { status: 'completed' });
        changedCount += 1;
      } else {
        updated[i] = l;
      }
    }

    return {
      lessons: updated,
      changedCount: changedCount,
      updatedCount: changedCount,
    };
  }

  /**
   * Calculates compact day workload summary (active count, time range, total hours)
   * for the compact 3-column day header.
   */
  function calculateDayWorkload(dayLessons) {
    var active = [];
    for (var i = 0; i < (dayLessons || []).length; i++) {
      if (dayLessons[i] && dayLessons[i].status !== 'cancelled') {
        active.push(dayLessons[i]);
      }
    }
    if (active.length === 0) {
      return {
        count: 0,
        activeCount: 0,
        firstStart: '',
        lastEnd: '',
        timeRange: '—',
        totalMinutes: 0,
        durationLabel: '0 ч',
        totalHoursText: '0 ч',
        summaryText: 'Свободно',
      };
    }

    var sorted = sortLessonsChronologically(active);
    var firstStart = sorted[0].startTime || '15:00';
    var lastEnd = sorted[0].endTime || '16:00';
    var totalMins = 0;

    for (var k = 0; k < sorted.length; k++) {
      var item = sorted[k];
      if (item.endTime && item.endTime > lastEnd) {
        lastEnd = item.endTime;
      }
      totalMins += getDurationMinutes(item.startTime, item.endTime);
    }

    var hoursText = formatTotalDurationCompact(totalMins);
    return {
      count: active.length,
      activeCount: active.length,
      firstStart: firstStart,
      lastEnd: lastEnd,
      timeRange: firstStart + '–' + lastEnd,
      totalMinutes: totalMins,
      durationLabel: hoursText,
      totalHoursText: hoursText,
      summaryText: firstStart + '–' + lastEnd + ' (' + hoursText + ')',
    };
  }

  function getWeekDays(mondayISO, todayISO) {
    var today = todayISO || getTodayISO();
    var monday = getMondayOfWeek(mondayISO);
    var days = [];

    for (var i = 0; i < 7; i++) {
      var currentISO = addDaysISO(monday, i);
      var d = parseISODate(currentISO);
      days.push({
        date: currentISO,
        dayNameShort: DAY_NAMES_SHORT[i],
        dayNameFull: DAY_NAMES_FULL[i],
        dayNumber: d.getDate(),
        monthShort: MONTHS_GENITIVE_SHORT[d.getMonth()],
        isToday: currentISO === today,
      });
    }
    return days;
  }

  function formatWeekRange(mondayISO) {
    var normMon = getMondayOfWeek(mondayISO);
    var monday = parseISODate(normMon);
    var sunday = parseISODate(addDaysISO(normMon, 6));

    var mDay = monday.getDate();
    var sDay = sunday.getDate();
    var mMonth = MONTHS_GENITIVE_SHORT[monday.getMonth()];
    var sMonth = MONTHS_GENITIVE_SHORT[sunday.getMonth()];
    var mYear = monday.getFullYear();
    var sYear = sunday.getFullYear();

    if (mYear !== sYear) {
      return mDay + ' ' + mMonth + ' ' + mYear + ' – ' + sDay + ' ' + sMonth + ' ' + sYear;
    }
    if (monday.getMonth() === sunday.getMonth()) {
      return mDay + ' – ' + sDay + ' ' + sMonth + ' ' + sYear;
    }
    return mDay + ' ' + mMonth + ' – ' + sDay + ' ' + sMonth + ' ' + sYear;
  }

  function formatRussianDate(dateStr, includeWeekday) {
    if (!dateStr) return '';
    var withWeekday = includeWeekday !== false;
    var d = parseISODate(dateStr);
    var day = d.getDate();
    var month = MONTHS_GENITIVE_SHORT[d.getMonth()];
    var year = d.getFullYear();
    var jsDay = d.getDay();
    var weekdayIdx = jsDay === 0 ? 6 : jsDay - 1;
    var weekday = DAY_NAMES_SHORT[weekdayIdx];
    return withWeekday ? day + ' ' + month + ' ' + year + ', ' + weekday : day + ' ' + month + ' ' + year;
  }

  function sortLessonsChronologically(lessons) {
    return (lessons || []).slice().sort(function (a, b) {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.endTime.localeCompare(b.endTime);
    });
  }

  function filterLessons(lessons, options) {
    var opts = options || {};
    var weekMondayISO = opts.weekMondayISO;
    var subjectFilter = opts.subjectFilter || 'all';
    var exactDate = opts.exactDate || '';
    var studentId = opts.studentId || '';

    var weekStart = '';
    var weekEnd = '';
    if (weekMondayISO) {
      weekStart = getMondayOfWeek(weekMondayISO);
      weekEnd = addDaysISO(weekStart, 6);
    }

    var filtered = (lessons || []).filter(function (lesson) {
      if (subjectFilter !== 'all' && lesson.subject !== subjectFilter) {
        return false;
      }
      if (studentId && lesson.studentId !== studentId) {
        return false;
      }
      if (exactDate) {
        return lesson.date === exactDate;
      }
      if (weekStart && weekEnd) {
        return lesson.date >= weekStart && lesson.date <= weekEnd;
      }
      return true;
    });

    return sortLessonsChronologically(filtered);
  }

  /**
   * Calculates weekly stats:
   * - "Оплачено уроков": all non-cancelled lessons with isPaid === true (count + sum in ₽).
   * - "Не оплачено уроков": ONLY past or completed non-cancelled lessons with isPaid === false (count + sum in ₽).
   *   Future planned lessons are NEVER counted as unpaid debt.
   */
  function calculateWeeklyStats(lessons, weekMondayISO, subjectFilter, now) {
    var filter = subjectFilter || 'all';
    var weekStart = getMondayOfWeek(weekMondayISO);
    var weekEnd = addDaysISO(weekStart, 6);

    var weekLessons = (lessons || []).filter(function (l) {
      var inWeek = l.date >= weekStart && l.date <= weekEnd;
      var matchesSubject = filter === 'all' || l.subject === filter;
      return inWeek && matchesSubject;
    });

    var totalActiveLessons = 0;
    var engLessons = 0;
    var rusLessons = 0;
    var completedLessons = 0;
    var plannedLessons = 0;
    var cancelledLessons = 0;
    var paidLessonsCount = 0;
    var paidAmount = 0;
    var unpaidLessonsCount = 0;
    var unpaidAmount = 0;

    for (var i = 0; i < weekLessons.length; i++) {
      var lesson = weekLessons[i];
      if (lesson.status === 'cancelled') {
        cancelledLessons += 1;
        continue;
      }

      totalActiveLessons += 1;
      if (lesson.subject === 'eng') engLessons += 1;
      if (lesson.subject === 'rus') rusLessons += 1;

      var isPastOrDone =
        lesson.status === 'completed' ||
        isLessonInPast(lesson.date, lesson.endTime, now);

      if (isPastOrDone) {
        completedLessons += 1;
      } else {
        plannedLessons += 1;
      }

      var lessonPrice =
        typeof lesson.price === 'number' && !isNaN(lesson.price)
          ? lesson.price
          : Number(lesson.price) || 0;

      if (lesson.isPaid) {
        paidLessonsCount += 1;
        paidAmount += lessonPrice;
      } else if (isPastOrDone) {
        unpaidLessonsCount += 1;
        unpaidAmount += lessonPrice;
      }
    }

    return {
      totalActiveLessons: totalActiveLessons,
      engLessons: engLessons,
      rusLessons: rusLessons,
      completedLessons: completedLessons,
      plannedLessons: plannedLessons,
      cancelledLessons: cancelledLessons,
      paidLessonsCount: paidLessonsCount,
      paidAmount: paidAmount,
      unpaidLessonsCount: unpaidLessonsCount,
      unpaidAmount: unpaidAmount,
    };
  }

  /**
   * Single-pass O(N) aggregation of per-student statistics and lesson lists
   * for instant opening of the Student Directory modal without O(S * L) lag.
   */
  function buildStudentStatsMap(lessons, now) {
    var map = {};
    var all = lessons || [];

    for (var i = 0; i < all.length; i++) {
      var l = all[i];
      if (!l || !l.studentId) continue;
      var sid = l.studentId;
      var entry = map[sid];
      if (!entry) {
        entry = {
          totalCount: 0,
          activeCount: 0,
          completedCount: 0,
          paidCount: 0,
          paidAmount: 0,
          unpaidPastCount: 0,
          unpaidPastAmount: 0,
          lessons: [],
        };
        map[sid] = entry;
      }

      entry.lessons.push(l);
      entry.totalCount += 1;

      if (l.status === 'cancelled') {
        continue;
      }

      entry.activeCount += 1;
      var isPastOrDone =
        l.status === 'completed' || isLessonInPast(l.date, l.endTime, now);
      if (isPastOrDone) {
        entry.completedCount += 1;
      }

      var price =
        typeof l.price === 'number' && !isNaN(l.price)
          ? l.price
          : Number(l.price) || 0;

      if (l.isPaid) {
        entry.paidCount += 1;
        entry.paidAmount += price;
      } else if (isPastOrDone) {
        entry.unpaidPastCount += 1;
        entry.unpaidPastAmount += price;
      }
    }

    return map;
  }

  function findPreviousStudentLesson(lessons, studentId, currentLessonDate, currentLessonId) {
    if (!studentId || !currentLessonDate) return null;

    var candidates = (lessons || []).filter(function (l) {
      if (l.studentId !== studentId) return false;
      if (currentLessonId && l.id === currentLessonId) return false;
      if (l.status === 'cancelled') return false;
      return l.date < currentLessonDate;
    });

    if (candidates.length === 0) return null;

    var completedCandidates = candidates.filter(function (l) {
      return l.status === 'completed';
    });
    var pool = completedCandidates.length > 0 ? completedCandidates : candidates;

    var sorted = sortLessonsChronologically(pool);
    return sorted[sorted.length - 1] || null;
  }

  /**
   * Resolves the persistent "Заметка для учителя" for a student on or after the lesson date.
   * When teacherNoteActive is true on the student (or carried from previous lessons),
   * it automatically appears on all subsequent lessons until manually disabled or edited.
   */
  function resolveActiveTeacherNote(students, lessons, studentId, lessonDate) {
    if (!studentId) return { text: '', active: false };

    var student = (students || []).find(function (s) {
      return s.id === studentId;
    });

    if (student && typeof student.teacherNote === 'string') {
      if (student.teacherNoteActive && student.teacherNote.trim()) {
        return { text: student.teacherNote.trim(), active: true };
      }
      if (student.teacherNoteActive === false) {
        return { text: '', active: false };
      }
    }

    // Fallback: check chronological lessons up to lessonDate
    var priorLessons = sortLessonsChronologically(
      (lessons || []).filter(function (l) {
        return l.studentId === studentId && (!lessonDate || l.date <= lessonDate);
      })
    );

    var latestText = '';
    var latestActive = false;
    for (var i = 0; i < priorLessons.length; i++) {
      var item = priorLessons[i];
      if (typeof item.teacherNote === 'string' && item.teacherNote.trim()) {
        latestText = item.teacherNote.trim();
        latestActive = item.teacherNoteActive !== false;
      } else if (item.teacherNoteActive === false) {
        latestText = '';
        latestActive = false;
      }
    }

    return { text: latestActive ? latestText : '', active: latestActive };
  }

  /**
   * Returns 0 for Monday through 6 for Sunday for an ISO date string YYYY-MM-DD.
   */
  function getWeekdayIndexMondayZero(dateStr) {
    var d = parseISODate(dateStr);
    var jsDay = d.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  /**
   * Builds a deterministic series ID for a recurring weekly slot.
   */
  function buildSeriesId(studentId, dateStr, startTime) {
    var weekdayIdx = getWeekdayIndexMondayZero(dateStr);
    var cleanTime = String(startTime || '15:00').replace(':', '');
    return 'ser_' + String(studentId || 'stu') + '_' + weekdayIdx + '_' + cleanTime;
  }

  /**
   * Returns an array of YYYY-MM-DD dates with the same weekday (+7, +14, +21, +28 days)
   * strictly within the same calendar month and year as dateStr.
   */
  function getRemainingSameWeekdayDatesInMonth(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];
    var baseDate = parseISODate(dateStr);
    var targetYear = baseDate.getFullYear();
    var targetMonth = baseDate.getMonth();
    var result = [];

    for (var step = 7; step <= 35; step += 7) {
      var candidateISO = addDaysISO(dateStr, step);
      var candidateDate = parseISODate(candidateISO);
      if (
        candidateDate.getFullYear() === targetYear &&
        candidateDate.getMonth() === targetMonth
      ) {
        result.push(candidateISO);
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Returns true if dateStr (YYYY-MM-DD) is the last calendar day of its month
   * (e.g. Feb 28/29, Apr 30, Oct 31).
   */
  function isLastDayOfMonth(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    var current = parseISODate(dateStr);
    var nextDay = parseISODate(addDaysISO(dateStr, 1));
    return current.getMonth() !== nextDay.getMonth();
  }

  /**
   * Returns all dates of the next calendar month grouped by weekday (0=Mon..6=Sun)
   * and as a flat chronological array.
   * Accepts (year, month1to12) or a date string "YYYY-MM-DD" / "YYYY-MM" as first arg.
   */
  function getAllDatesInNextMonthByWeekday(yearOrDateStr, month1to12) {
    var y;
    var m1;
    if (typeof yearOrDateStr === 'string' && yearOrDateStr.indexOf('-') !== -1) {
      var parts = yearOrDateStr.split('-').map(Number);
      y = parts[0] || 2026;
      m1 = parts[1] || 1;
    } else {
      y = Number(yearOrDateStr) || 2026;
      m1 = Number(month1to12) || 1;
    }

    var nextYear = m1 === 12 ? y + 1 : y;
    var nextMonth1 = m1 === 12 ? 1 : m1 + 1;
    var nextMonthIndex0 = nextMonth1 - 1;
    var monthKey =
      String(nextYear) + '-' + String(nextMonth1).padStart(2, '0');

    var byWeekday = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    var allDates = [];

    var cursor = new Date(nextYear, nextMonthIndex0, 1, 12, 0, 0, 0);
    while (cursor.getMonth() === nextMonthIndex0) {
      var iso = toISODateString(cursor);
      var wIdx = getWeekdayIndexMondayZero(iso);
      byWeekday[wIdx].push(iso);
      allDates.push(iso);
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      year: nextYear,
      month: nextMonth1,
      monthKey: monthKey,
      allDates: allDates,
      byWeekday: byWeekday,
    };
  }

  /**
   * Finds future planned, unpaid lessons belonging to the same weekly series
   * within the same calendar month as targetLesson.
   * Completed and paid lessons are never included.
   */
  function findFutureMonthSeriesLessons(lessons, targetLesson) {
    if (!targetLesson || !targetLesson.date) return [];
    var monthPrefix = targetLesson.date.slice(0, 7);
    var targetWeekday = getWeekdayIndexMondayZero(targetLesson.date);

    return sortLessonsChronologically(
      (lessons || []).filter(function (l) {
        if (!l || l.id === targetLesson.id) return false;
        if (!l.date || l.date.slice(0, 7) !== monthPrefix) return false;
        if (l.date <= targetLesson.date) return false;
        if (l.status !== 'planned' || l.isPaid) return false;

        if (targetLesson.seriesId && l.seriesId) {
          return l.seriesId === targetLesson.seriesId;
        }
        return (
          l.studentId === targetLesson.studentId &&
          getWeekdayIndexMondayZero(l.date) === targetWeekday &&
          l.startTime === targetLesson.startTime
        );
      })
    );
  }

  /**
   * Rule A: Clones a planned (or auto-completed past) recurring lesson to all remaining
   * same-weekday dates in the same calendar month without creating duplicates or touching paid/completed lessons.
   */
  function propagateLessonToMonthEnd(lessons, baseLesson, students, generateId, now) {
    var currentLessons = (lessons || []).slice();
    if (
      !baseLesson ||
      (baseLesson.status !== 'planned' && baseLesson.status !== 'completed') ||
      baseLesson.repeatWeekly === false
    ) {
      return {
        lessons: currentLessons,
        createdClones: [],
        seriesId: (baseLesson && baseLesson.seriesId) || '',
      };
    }

    var idGen =
      generateId ||
      function () {
        return 'les_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      };

    var seriesId =
      baseLesson.seriesId ||
      buildSeriesId(baseLesson.studentId, baseLesson.date, baseLesson.startTime);

    var studentObj = (students || []).find(function (s) {
      return s.id === baseLesson.studentId;
    });
    var resolvedPrice =
      typeof baseLesson.price === 'number' && !isNaN(baseLesson.price)
        ? baseLesson.price
        : studentObj && typeof studentObj.defaultPrice === 'number'
        ? studentObj.defaultPrice
        : 1500;

    // Ensure baseLesson in currentLessons has seriesId, price, and repeatWeekly: true
    currentLessons = currentLessons.map(function (l) {
      if (l.id === baseLesson.id) {
        return Object.assign({}, l, {
          repeatWeekly: true,
          seriesId: seriesId,
          price: resolvedPrice,
        });
      }
      return l;
    });

    var remainingDates = getRemainingSameWeekdayDatesInMonth(baseLesson.date);
    var resolvedNote = resolveActiveTeacherNote(
      students,
      currentLessons,
      baseLesson.studentId,
      baseLesson.date
    );
    var noteText =
      baseLesson.teacherNoteActive && baseLesson.teacherNote
        ? baseLesson.teacherNote
        : resolvedNote.active
        ? resolvedNote.text
        : '';
    var noteActive = Boolean(noteText);

    var createdClones = [];
    var endTimeVal =
      baseLesson.endTime || addMinutesToTime(baseLesson.startTime, 60);

    for (var i = 0; i < remainingDates.length; i++) {
      var targetDate = remainingDates[i];
      var hasConflict = currentLessons.some(function (existing) {
        return (
          existing.studentId === baseLesson.studentId &&
          existing.date === targetDate &&
          existing.startTime === baseLesson.startTime
        );
      });

      if (hasConflict) {
        continue;
      }

      var cloneStatus = isLessonInPast(targetDate, endTimeVal, now)
        ? 'completed'
        : 'planned';

      var clone = {
        id: idGen(),
        studentId: baseLesson.studentId,
        date: targetDate,
        startTime: baseLesson.startTime,
        endTime: endTimeVal,
        subject: baseLesson.subject,
        status: cloneStatus,
        classwork: '',
        homework: '',
        hwChecked: false,
        price: resolvedPrice,
        isPaid: false,
        paymentNote: '',
        teacherNote: noteText,
        teacherNoteActive: noteActive,
        repeatWeekly: true,
        seriesId: seriesId,
        autoGenerated: true,
      };

      currentLessons.push(clone);
      createdClones.push(clone);
    }

    return {
      lessons: currentLessons,
      createdClones: createdClones,
      seriesId: seriesId,
    };
  }

  /**
   * Helper to get the last ISO date (YYYY-MM-DD) of a given year and 1-based month.
   */
  function getLastDateOfMonthISO(year, month1to12) {
    var lastDayDate = new Date(year, month1to12, 0, 12, 0, 0, 0);
    return toISODateString(lastDayDate);
  }

  /**
   * Rule B: Automatically rolls over the active weekly schedule template
   * to all days of the next calendar month when:
   * 1) currentDateStr is the last day of the current month, OR
   * 2) a new month has started and lastRolloverKey !== currentMonthKey, OR
   * 3) options.forceSync is true.
   */
  function autoRolloverToNextMonth(
    lessons,
    students,
    currentDateStr,
    lastRolloverKey,
    generateId,
    options
  ) {
    var opts = options || {};
    var currentLessons = (lessons || []).slice();
    var todayStr = currentDateStr || getTodayISO();
    var d = parseISODate(todayStr);
    var currYear = d.getFullYear();
    var currMonth1 = d.getMonth() + 1;
    var currMonthKey =
      String(currYear) + '-' + String(currMonth1).padStart(2, '0');

    var isLastDay = isLastDayOfMonth(todayStr);
    var sourceYear = currYear;
    var sourceMonth1 = currMonth1;

    if (isLastDay || opts.forceNextMonthFromCurrent) {
      // Rollover from current month -> next month
      sourceYear = currYear;
      sourceMonth1 = currMonth1;
    } else if (lastRolloverKey !== currMonthKey) {
      // Check if we entered a new month and need to roll over from previous month -> current month
      var prevYear = currMonth1 === 1 ? currYear - 1 : currYear;
      var prevMonth1 = currMonth1 === 1 ? 12 : currMonth1 - 1;
      var prevMonthPrefix =
        String(prevYear) + '-' + String(prevMonth1).padStart(2, '0');
      var hasPrevMonthLessons = currentLessons.some(function (l) {
        return (
          l.date &&
          l.date.slice(0, 7) === prevMonthPrefix &&
          l.status !== 'cancelled' &&
          l.repeatWeekly !== false
        );
      });
      if (hasPrevMonthLessons) {
        sourceYear = prevYear;
        sourceMonth1 = prevMonth1;
      } else {
        return {
          triggered: false,
          targetMonthKey: lastRolloverKey || '',
          createdLessons: [],
          lessons: currentLessons,
        };
      }
    } else {
      return {
        triggered: false,
        targetMonthKey: lastRolloverKey || '',
        createdLessons: [],
        lessons: currentLessons,
      };
    }

    var nextMonthData = getAllDatesInNextMonthByWeekday(
      sourceYear,
      sourceMonth1
    );
    var targetMonthKey = nextMonthData.monthKey;

    if (
      lastRolloverKey === targetMonthKey &&
      !opts.forceSyncOnLastDay &&
      !opts.forceNextMonthFromCurrent
    ) {
      return {
        triggered: false,
        targetMonthKey: targetMonthKey,
        createdLessons: [],
        lessons: currentLessons,
      };
    }

    // Extract active weekly schedule template from the last 7 days of the source month
    var sourceMonthLastISO = getLastDateOfMonthISO(sourceYear, sourceMonth1);
    var sourceWindowStartISO = addDaysISO(sourceMonthLastISO, -6);
    var sourceMonthPrefix =
      String(sourceYear) + '-' + String(sourceMonth1).padStart(2, '0');

    var windowLessons = sortLessonsChronologically(
      currentLessons.filter(function (l) {
        return (
          l.date >= sourceWindowStartISO &&
          l.date <= sourceMonthLastISO &&
          l.status !== 'cancelled' &&
          l.repeatWeekly !== false
        );
      })
    );

    // Fallback to any active recurring lessons in the source month if the last 7 days had none
    if (windowLessons.length === 0) {
      windowLessons = sortLessonsChronologically(
        currentLessons.filter(function (l) {
          return (
            l.date &&
            l.date.slice(0, 7) === sourceMonthPrefix &&
            l.status !== 'cancelled' &&
            l.repeatWeekly !== false
          );
        })
      );
    }

    if (windowLessons.length === 0) {
      return {
        triggered: false,
        targetMonthKey: targetMonthKey,
        createdLessons: [],
        lessons: currentLessons,
      };
    }

    // Deduplicate template slots by (studentId + weekdayIdx + startTime), keeping the latest lesson
    var templateMap = {};
    for (var w = 0; w < windowLessons.length; w++) {
      var item = windowLessons[w];
      var weekdayIdx = getWeekdayIndexMondayZero(item.date);
      var slotKey =
        item.studentId + '__' + weekdayIdx + '__' + item.startTime;
      templateMap[slotKey] = item;
    }

    var idGen =
      generateId ||
      function () {
        return 'les_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      };

    var studentsById = {};
    for (var sIdx = 0; sIdx < (students || []).length; sIdx++) {
      studentsById[students[sIdx].id] = students[sIdx];
    }

    var createdLessons = [];
    var slotKeys = Object.keys(templateMap);

    for (var k = 0; k < slotKeys.length; k++) {
      var templateLesson = templateMap[slotKeys[k]];
      var tplWeekday = getWeekdayIndexMondayZero(templateLesson.date);
      var targetDatesForWeekday = nextMonthData.byWeekday[tplWeekday] || [];

      var stuObj = studentsById[templateLesson.studentId];
      var tplPrice =
        typeof templateLesson.price === 'number' && !isNaN(templateLesson.price)
          ? templateLesson.price
          : stuObj && typeof stuObj.defaultPrice === 'number'
          ? stuObj.defaultPrice
          : 1500;

      var resolvedNote = resolveActiveTeacherNote(
        students,
        currentLessons,
        templateLesson.studentId,
        sourceMonthLastISO
      );
      var noteText = resolvedNote.active
        ? resolvedNote.text
        : templateLesson.teacherNoteActive
        ? templateLesson.teacherNote || ''
        : '';
      var noteActive = Boolean(noteText);

      for (var dIdx = 0; dIdx < targetDatesForWeekday.length; dIdx++) {
        var targetDate = targetDatesForWeekday[dIdx];
        var exists = currentLessons.some(function (existing) {
          return (
            existing.studentId === templateLesson.studentId &&
            existing.date === targetDate &&
            existing.startTime === templateLesson.startTime
          );
        });

        if (exists) continue;

        var newLesson = {
          id: idGen(),
          studentId: templateLesson.studentId,
          date: targetDate,
          startTime: templateLesson.startTime,
          endTime:
            templateLesson.endTime ||
            addMinutesToTime(templateLesson.startTime, 60),
          subject: templateLesson.subject,
          status: 'planned',
          classwork: '',
          homework: '',
          hwChecked: false,
          price: tplPrice,
          isPaid: false,
          paymentNote: '',
          teacherNote: noteText,
          teacherNoteActive: noteActive,
          repeatWeekly: true,
          seriesId:
            templateLesson.seriesId ||
            buildSeriesId(
              templateLesson.studentId,
              targetDate,
              templateLesson.startTime
            ),
          autoGenerated: true,
        };

        currentLessons.push(newLesson);
        createdLessons.push(newLesson);
      }
    }

    return {
      triggered: true,
      targetMonthKey: targetMonthKey,
      createdLessons: createdLessons,
      lessons: currentLessons,
    };
  }

  function buildAutoTransferredLessons(allLessons, sourceMondayISO, targetMondayISO, generateId) {
    var idGen =
      generateId ||
      function () {
        return 'les_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      };

    var normSourceMonday = getMondayOfWeek(sourceMondayISO);
    var normTargetMonday = getMondayOfWeek(targetMondayISO);
    var sourceEnd = addDaysISO(normSourceMonday, 6);
    var targetEnd = addDaysISO(normTargetMonday, 6);

    var sourceWeekLessons = sortLessonsChronologically(
      (allLessons || []).filter(function (l) {
        return l.date >= normSourceMonday && l.date <= sourceEnd;
      })
    );

    var targetWeekExisting = (allLessons || []).filter(function (l) {
      return l.date >= normTargetMonday && l.date <= targetEnd;
    });

    var skippedCancelled = 0;
    var skippedDuplicates = 0;
    var createdLessons = [];

    var sourceMonDate = parseISODate(normSourceMonday);

    for (var i = 0; i < sourceWeekLessons.length; i++) {
      var src = sourceWeekLessons[i];
      if (src.status === 'cancelled') {
        skippedCancelled += 1;
        continue;
      }

      var srcDate = parseISODate(src.date);
      var dayOffset = Math.round(
        (srcDate.getTime() - sourceMonDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      var newDate = addDaysISO(normTargetMonday, dayOffset);

      var hasDuplicateInExisting = targetWeekExisting.some(function (existing) {
        return existing.date === newDate && existing.startTime === src.startTime;
      });
      var hasDuplicateInCreated = createdLessons.some(function (created) {
        return created.date === newDate && created.startTime === src.startTime;
      });

      if (hasDuplicateInExisting || hasDuplicateInCreated) {
        skippedDuplicates += 1;
        continue;
      }

      createdLessons.push({
        id: idGen(),
        studentId: src.studentId,
        date: newDate,
        startTime: src.startTime,
        endTime: src.endTime || addMinutesToTime(src.startTime, 60),
        subject: src.subject,
        status: 'planned',
        classwork: '',
        homework: '',
        hwChecked: false,
        price: typeof src.price === 'number' ? src.price : Number(src.price) || 1500,
        isPaid: false,
        paymentNote: '',
        teacherNote: src.teacherNoteActive ? src.teacherNote || '' : '',
        teacherNoteActive: Boolean(src.teacherNoteActive && src.teacherNote),
        repeatWeekly: src.repeatWeekly !== false,
        seriesId:
          src.seriesId || buildSeriesId(src.studentId, newDate, src.startTime),
        autoGenerated: true,
      });
    }

    return {
      createdLessons: createdLessons,
      skippedCancelled: skippedCancelled,
      skippedDuplicates: skippedDuplicates,
      sourceWeekRange: formatWeekRange(normSourceMonday),
      targetWeekRange: formatWeekRange(normTargetMonday),
    };
  }

  var Calendar = {
    parseISODate: parseISODate,
    toISODateString: toISODateString,
    getTodayISO: getTodayISO,
    getMondayOfWeek: getMondayOfWeek,
    addDaysISO: addDaysISO,
    addMinutesToTime: addMinutesToTime,
    timeStrToMinutes: timeStrToMinutes,
    getDurationMinutes: getDurationMinutes,
    formatTotalDurationCompact: formatTotalDurationCompact,
    formatCurrency: formatCurrency,
    isLessonInPast: isLessonInPast,
    autoCompletePastLessons: autoCompletePastLessons,
    calculateDayWorkload: calculateDayWorkload,
    getWeekDays: getWeekDays,
    formatWeekRange: formatWeekRange,
    formatRussianDate: formatRussianDate,
    sortLessonsChronologically: sortLessonsChronologically,
    filterLessons: filterLessons,
    calculateWeeklyStats: calculateWeeklyStats,
    buildStudentStatsMap: buildStudentStatsMap,
    findPreviousStudentLesson: findPreviousStudentLesson,
    resolveActiveTeacherNote: resolveActiveTeacherNote,
    getWeekdayIndexMondayZero: getWeekdayIndexMondayZero,
    buildSeriesId: buildSeriesId,
    getRemainingSameWeekdayDatesInMonth: getRemainingSameWeekdayDatesInMonth,
    isLastDayOfMonth: isLastDayOfMonth,
    getAllDatesInNextMonthByWeekday: getAllDatesInNextMonthByWeekday,
    findFutureMonthSeriesLessons: findFutureMonthSeriesLessons,
    propagateLessonToMonthEnd: propagateLessonToMonthEnd,
    autoRolloverToNextMonth: autoRolloverToNextMonth,
    buildAutoTransferredLessons: buildAutoTransferredLessons,
  };

  root.TutorPlanner = root.TutorPlanner || {};
  root.TutorPlanner.Calendar = Calendar;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calendar;
  }
})(typeof window !== 'undefined' ? window : globalThis);
