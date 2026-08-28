/**
 * Production calendar and workdays.
 * moment is passed explicitly.
 */

export function createDefaultCalendar(year, moment) {
  const calendar = [];
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= 31; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = moment(dateStr);
      if (date.isValid() && date.year() === year) {
        const dayOfWeek = date.day();
        const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
        calendar.push({
          date: dateStr,
          type: isWeekendDay ? 'weekend' : 'working',
          description: isWeekendDay ? 'Выходной' : 'Рабочий день',
        });
      }
    }
  }
  return calendar;
}

export function parseIsDayOffCsv(year, csvData, moment) {
  const lines = String(csvData).split(',');
  const allZeros = lines.every((line) => line.trim() === '0');
  if (allZeros || lines.length === 0) {
    return createDefaultCalendar(year, moment);
  }

  const calendar = [];
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= 31; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = moment(dateStr);
      if (date.isValid() && date.year() === year) {
        const dayIndex = date.dayOfYear() - 1;
        if (dayIndex < lines.length) {
          const dayType = lines[dayIndex].trim();
          calendar.push({
            date: dateStr,
            type: dayType === '1' ? 'weekend' : 'working',
            description: dayType === '1' ? 'Выходной/праздничный' : 'Рабочий день',
          });
        }
      }
    }
  }
  return calendar;
}

export function isWeekend(date, productionCalendars, moment) {
  const dateMoment = moment(date);
  const year = dateMoment.year();
  const dateStr = dateMoment.format('YYYY-MM-DD');
  const dayOfWeek = dateMoment.day();
  const isStandardWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (productionCalendars && productionCalendars[year]) {
    const calendarDay = productionCalendars[year].find((d) => d.date === dateStr);
    if (calendarDay) {
      return calendarDay.type === 'weekend';
    }
  }

  return isStandardWeekend;
}

export function countWorkDaysInPeriod(start, end, isWeekendFn) {
  let workDays = 0;
  const current = start.clone();

  while (current.isSameOrBefore(end)) {
    const dateStr = current.format('YYYY-MM-DD');
    if (!isWeekendFn(dateStr)) {
      workDays++;
    }
    current.add(1, 'day');
  }

  return workDays;
}
