import { defineStore } from 'pinia';
import moment from 'moment';
import 'moment/locale/ru';
import Highcharts from 'highcharts';
import exportingInit from 'highcharts/modules/exporting';
import exportDataInit from 'highcharts/modules/export-data';
import {
  API_BASE,
  BITRIX24_WEBHOOK,
  CRM_FIELDS,
  APP_CONFIG,
  ISDAYOFF_API_URL,
  buildDealCalcFields,
} from '../config/constants';

moment.locale('ru');
if (typeof exportingInit === 'function') exportingInit(Highcharts);
if (typeof exportDataInit === 'function') exportDataInit(Highcharts);

export const useAppStore = defineStore('app', {
  state: () => ({
                    editEmployeeDialog: false,
                    editEmployeeData: {
                        id: null,
                        name: '',
                        created_at: '',
                        termination_date: null,
                        clearTerminationDate: false
                    },
                    editHireDateMenu: false,
                    editTerminationDateMenu: false,
                    savingEmployee: false,
                    isAdmin: false,
                    applyProductionCalendar: false,
                    loading: false,
                    loadingCalendar: false,
                    applyingCalendar: false,
                    checkingDeal: false,
                    addingEmployee: false,
                    deletingEmployee: false,
                    savingStatus: false,
                    errorMessage: '',
                    successMessage: '',
                    productionCalendar: [],
                    currentYear: new Date().getFullYear(),
                    currentView: 'planning',
                    ruLocale: {
                        firstDayOfWeek: 1,
                        masks: {
                            weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                            months: [
                                'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                                'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
                            ]
                        }
                    },
                    employees: [],
                    deals: [],

                    // Для диалога статуса
                    iconDialog: false,
                    currentEmployee: null,
                    currentDate: null,
                    selectedStatus: null,

                    // Управление сотрудниками
                    newEmployee: { name: '' },
                    selectedEmployeeForDelete: null,

                    // Управление графиком
                    selectedEmployee: null,
                    scheduleAction: 'weekend',
                    scheduleActions: [
                        { text: 'Рабочий день', value: 'working' },
                        { text: 'Отпуск', value: 'vacation' },
                        { text: 'Больничный', value: 'sick' },
                        { text: 'Выходной', value: 'weekend' },
                        { text: 'Уволен', value: 'terminated' },
                        { text: 'Еще не принят', value: 'not_hired' },
                        { text: 'По производственному календарю', value: 'production_calendar' }
                    ],
                    scheduleDateStart: moment().format('YYYY-MM-DD'), 
                    scheduleDateEnd: moment().add(1, 'week').format('YYYY-MM-DD'),
                    dateMenu1: false,
                    dateMenu2: false,

                    // Для сделок
                    newDeal: { 
                        manDays: 5, 
                        startDate: '', 
                        endDate: '', 
                    },
                    dealDateMenu1: false,
                    dealDateMenu2: false,
                    dealCheckResult: null,
                    canAddDeal: false,

                    // Для таблицы загрузки
                    tableDateStart: moment().format('YYYY-MM-DD'),
                    tableDateEnd: moment().add(4, 'week').format('YYYY-MM-DD'),
                    tableDates: [],
                    tableDateMenu1: false,
                    tableDateMenu2: false,
                    productionCalendars: {}, // Хранит календари по годам: {2024: [...], 2025: [...]}
                    currentYear: new Date().getFullYear(),
                    occupancyCache: {}, // Кэш для рассчитанной занятости
                    dynamicRawDemandCache: {}, // Сумма «идеальных» ЧД/день до усечения ёмкостью (динамическое распределение)
                    availableManDaysCache: {}, // Кэш для доступных человеко-дней
                    lastDealsUpdate: null, // Время последнего обновления сделок
                    cacheValid: false, // Флаг валидности кэша
                    _scheduleRangeLoaded: null, // Диапазон загруженного расписания { start, end }
                
  }),
  getters: {

                tableDaysCount() {
                    if (!this.tableDateStart || !this.tableDateEnd) return 0;
                    const start = moment(this.tableDateStart);
                    const end = moment(this.tableDateEnd);
                    return end.diff(start, 'days') + 1;
                },
                // Добавьте это вычисляемое свойство
                showDatePickers() {
                    return this.scheduleAction !== 'production_calendar';
                },
            
  },
  actions: {
initCache() {
        this.occupancyCache = {};
        this.dynamicRawDemandCache = {};
        this.availableManDaysCache = {};
        this.cacheValid = false;
    },

    // Инвалидация кэша при изменении данных
    invalidateCache() {
        this.cacheValid = false;
        this.occupancyCache = {};
        this.dynamicRawDemandCache = {};
        this.availableManDaysCache = {};
    },

                isFilledDealField(value) {
                    return value != null && value !== '' && value !== false;
                },
                /** Плановая дата начала, иначе подтверждённая */
                getDealStartRaw(deal) {
                    const planned = deal[CRM_FIELDS.DEAL_START];
                    if (this.isFilledDealField(planned)) return planned;
                    return deal[CRM_FIELDS.DEAL_CONFIRMED_START];
                },
                /** Плановая дата окончания, иначе подтверждённая */
                getDealEndRaw(deal) {
                    const planned = deal[CRM_FIELDS.DEAL_END];
                    if (this.isFilledDealField(planned)) return planned;
                    return deal[CRM_FIELDS.DEAL_CONFIRMED_END];
                },
                /** Границы периода сделки по полям CRM (включительно по дням) */
                dealPeriodBounds(deal) {
                    return {
                        start: moment(this.getDealStartRaw(deal)).startOf('day'),
                        end: moment(this.getDealEndRaw(deal)).startOf('day'),
                    };
                },
                isDealActiveOnDate(deal, dateStr) {
                    const d = moment(dateStr).startOf('day');
                    const { start, end } = this.dealPeriodBounds(deal);
                    if (!start.isValid() || !end.isValid() || end.isBefore(start)) return false;
                    return !d.isBefore(start) && !d.isAfter(end);
                },
                /** Рабочие дни в периоде сделки по производственному календарю (для делителя ЧД) */
                getDealWorkDaysCount(deal) {
                    const { start, end } = this.dealPeriodBounds(deal);
                    if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 0;
                    return this.countWorkDaysInPeriod(start, end);
                },
                /** Всего дней в периоде сделки (для равномерного деления ЧД на каждый день диапазона) */
                getDealCalendarDaysCount(deal) {
                    const { start, end } = this.dealPeriodBounds(deal);
                    if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 0;
                    return end.diff(start, 'days') + 1;
                },
                /** Округление человеко-дней до 0.1 */
                roundManDays(value) {
                    const decimals = APP_CONFIG.MAN_DAYS_DECIMALS ?? 1;
                    const factor = Math.pow(10, decimals);
                    return Math.round(Number(value) * factor) / factor;
                },
                /** Равномерная дневная нагрузка: ЧД сделки / рабочие дни периода, округление до 0.1 */
                getUniformDailyManDayLoad(manDays, workDaysCount) {
                    if (workDaysCount <= 0) return 0;
                    return this.roundManDays(manDays / workDaysCount);
                },
                /** Дневная нагрузка сделки (ЧД/календарный день периода) с округлением до 0.1 */
                getDealDailyManDayLoad(deal) {
                    return this.getUniformDailyManDayLoad(
                        deal[CRM_FIELDS.DEAL_MAN_DAYS],
                        this.getDealCalendarDaysCount(deal)
                    );
                },

                /** Есть ли в диапазоне рабочий день, где суммарная равномерная норма (ЧД/раб.дни по сделке) превышает ёмкость */
                hasUniformOverloadInRange(rangeStartStr, rangeEndStr) {
                    let cur = moment(rangeStartStr).startOf('day');
                    const re = moment(rangeEndStr).startOf('day');
                    while (cur.isSameOrBefore(re, 'day')) {
                        const dateStr = cur.format('YYYY-MM-DD');
                        if (this.isWeekend(dateStr)) {
                            cur.add(1, 'day');
                            continue;
                        }
                        const avail = this.getAvailableManDays(dateStr);
                        let raw = 0;
                        for (const deal of this.deals) {
                            if (!this.isDealActiveOnDate(deal, dateStr)) continue;
                            const W = this.getDealCalendarDaysCount(deal);
                            if (W <= 0) continue;
                            raw += this.getDealDailyManDayLoad(deal);
                        }
                        if (raw > avail + 1e-6) return true;
                        cur.add(1, 'day');
                    }
                    return false;
                },

                /**
                 * Равномерное распределение по датам сделки в CRM: на каждый день MD/W,
                 * занято на графике = min(сумма норм, доступно). Без динамики остатков.
                 */
                runUniformLoadSimulation(rangeStartStr, rangeEndStr) {
                    const rs = moment(rangeStartStr).startOf('day');
                    const re = moment(rangeEndStr).startOf('day');
                    let cur = rs.clone();
                    while (cur.isSameOrBefore(re, 'day')) {
                        const dateStr = cur.format('YYYY-MM-DD');
                        const available = this.getAvailableManDays(dateStr);
                        this.availableManDaysCache[dateStr] = available;
                        
                        let raw = 0;
                        for (const deal of this.deals) {
                            if (!this.isDealActiveOnDate(deal, dateStr)) continue;
                            const W = this.getDealCalendarDaysCount(deal);
                            if (W <= 0) continue;
                            raw += this.getDealDailyManDayLoad(deal);
                        }
                        this.dynamicRawDemandCache[dateStr] = raw;
                        this.occupancyCache[dateStr] = Math.min(raw, available);
                        
                        cur.add(1, 'day');
                    }
                    this.cacheValid = true;
                },

                /**
                 * Динамическое распределение — только если равномерное (MD/раб.дни по датам сделки)
                 * на каком‑то дне диапазона не помещается в ёмкость (см. hasUniformOverloadInRange).
                 * Распределение ЧД по дням: приоритет у сделок с меньшим числом рабочих дней в периоде.
                 * На день D: базовая ставка = остаток_ЧД / оставшиеся_рабочие_дни до конца сделки.
                 * Проход 1 — короткие сделки первыми получают min(ставка, оставшаяся ёмкость).
                 * Проход 2 — оставшаяся ёмкость дня добирается сделками с большим периодом (с конца списка),
                 * пока не исчерпаны ЧД или 100% ёмкости дня (что наступит раньше).
                 */
                runDynamicLoadSimulation(rangeStartStr, rangeEndStr) {
                    const rs = moment(rangeStartStr).startOf('day');
                    const re = moment(rangeEndStr).startOf('day');
                    const remainingMD = {};
                    for (const deal of this.deals) {
                        const id = String(deal.ID || deal.id);
                        const { start, end } = this.dealPeriodBounds(deal);
                        if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) continue;
                        if (end.isBefore(rs, 'day') || start.isAfter(re, 'day')) continue;
                        const W = this.getDealWorkDaysCount(deal);
                        if (W <= 0) continue;
                        const effStart = moment.max(start, rs);
                        const remW = this.countWorkDaysInPeriod(effStart, end);
                        remainingMD[id] = deal[CRM_FIELDS.DEAL_MAN_DAYS] * (remW / W);
                    }

                    let cur = rs.clone();
                    while (cur.isSameOrBefore(re, 'day')) {
                        const dateStr = cur.format('YYYY-MM-DD');
                        const available = this.getAvailableManDays(dateStr);
                        this.availableManDaysCache[dateStr] = available;

                        if (this.isWeekend(dateStr)) {
                            this.occupancyCache[dateStr] = 0;
                            this.dynamicRawDemandCache[dateStr] = 0;
                            cur.add(1, 'day');
                            continue;
                        }

                        const activeDeals = this.deals
                            .filter((d) => this.isDealActiveOnDate(d, dateStr))
                            .sort((a, b) => {
                                const wa = this.getDealWorkDaysCount(a);
                                const wb = this.getDealWorkDaysCount(b);
                                if (wa !== wb) return wa - wb;
                                return String(a.ID || a.id).localeCompare(String(b.ID || b.id));
                            });

                        let remCap = available;
                        let rawDemandSum = 0;
                        let occupiedSum = 0;

                        for (const deal of activeDeals) {
                            const id = String(deal.ID || deal.id);
                            let rem = remainingMD[id];
                            if (rem === undefined || rem <= 0) continue;
                            const { end: endDeal } = this.dealPeriodBounds(deal);
                            const remWork = this.countWorkDaysInPeriod(moment(dateStr).startOf('day'), endDeal);
                            if (remWork <= 0) continue;
                            const ideal = rem / remWork;
                            rawDemandSum += ideal;
                            const take = Math.min(ideal, remCap);
                            occupiedSum += take;
                            remainingMD[id] = Math.max(0, rem - take);
                            remCap -= take;
                        }

                        // Добор до полной ёмкости дня: сначала длинные активные сделки (обратный порядок)
                        if (remCap > 1e-6) {
                            for (let i = activeDeals.length - 1; i >= 0; i--) {
                                if (remCap <= 1e-6) break;
                                const deal = activeDeals[i];
                                const id = String(deal.ID || deal.id);
                                const rem = remainingMD[id];
                                if (rem === undefined || rem <= 0) continue;
                                const extra = Math.min(rem, remCap);
                                occupiedSum += extra;
                                remainingMD[id] = Math.max(0, rem - extra);
                                remCap -= extra;
                            }
                        }

                        this.dynamicRawDemandCache[dateStr] = rawDemandSum;
                        this.occupancyCache[dateStr] = occupiedSum;
                        cur.add(1, 'day');
                    }

                    this.cacheValid = true;
                },

    // Пакетный расчет для диапазона дат
    async preCalculateOccupancyForRange(startDate, endDate) {
        this.occupancyCache = {};
        this.dynamicRawDemandCache = {};
        this.availableManDaysCache = {};
        this.cacheValid = false;
        if (this.hasUniformOverloadInRange(startDate, endDate)) {
            this.runDynamicLoadSimulation(startDate, endDate);
        } else {
            this.runUniformLoadSimulation(startDate, endDate);
        }
        const results = [];
        const current = moment(startDate);
        const end = moment(endDate);
        while (current.isSameOrBefore(end)) {
            const dateStr = current.format('YYYY-MM-DD');
            results.push({
                date: dateStr,
                occupied: this.occupancyCache[dateStr] ?? 0,
                available: this.availableManDaysCache[dateStr] ?? this.getAvailableManDays(dateStr),
            });
            current.add(1, 'day');
        }
        return results;
    },

                isEmployeeTerminated(employee, date) {
        if (!employee.termination_date) return false;
        return moment(date).isAfter(moment(employee.termination_date), 'day');
    },

    // Метод для проверки, является ли сотрудник принятым на определенную дату
    isEmployeeHired(employee, date) {
        if (!employee.created_at) return true; // Если дата приема не указана, считаем принятым
        return moment(date).isSameOrAfter(moment(employee.created_at), 'day');
    },
updateTableDates() {
    this.tableDates = [];
    const start = moment(this.tableDateStart);
    const end = moment(this.tableDateEnd);
    
    // Определяем, какие годы охватывает период
    const yearsInPeriod = new Set();
    let current = start.clone();
    
    while (current.isSameOrBefore(end)) {
        yearsInPeriod.add(current.year());
        current.add(1, 'day');
    }
    
    // Загружаем календари для всех лет в периоде
    yearsInPeriod.forEach(year => {
        if (year !== this.currentYear) { // Не загружаем текущий год повторно
            this.loadProductionCalendarForYear(year);
        }
    });
    
    // Генерируем даты для таблицы
    current = start.clone();
    for (let i = 0; i < this.tableDaysCount; i++) {
        this.tableDates.push(current.clone().add(i, 'days').format('YYYY-MM-DD'));
    }
},
async loadProductionCalendarForYear(year) {
    this.loadingCalendar = true;
    try {
        // Проверяем, есть ли уже загруженный календарь для этого года
        if (this.productionCalendars && this.productionCalendars[year]) {
            this.productionCalendar = this.productionCalendars[year];
            return;
        }

        const response = await fetch(`${ISDAYOFF_API_URL}?year=${year}&delimeter=,`);
        const csvData = await response.text();
        
        const calendar = [];
        const lines = csvData.split(',');
        
        // Проверяем, если пришли все нули (календаря на следующий год еще нет)
        const allZeros = lines.every(line => line.trim() === '0');
        
        if (allZeros) {
            // Если календаря нет, создаем стандартный (пн-пт рабочие, сб-вс выходные)
            for (let month = 1; month <= 12; month++) {
                for (let day = 1; day <= 31; day++) {
                    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    const date = moment(dateStr);
                    if (date.isValid() && date.year() === year) {
                        const dayOfWeek = date.day();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // вс=0, сб=6
                        calendar.push({
                            date: dateStr,
                            type: isWeekend ? 'weekend' : 'working',
                            description: isWeekend ? 'Выходной' : 'Рабочий день'
                        });
                    }
                }
            }
        } else {
            // Если календарь есть, парсим его
            for (let month = 1; month <= 12; month++) {
                for (let day = 1; day <= 31; day++) {
                    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    const date = moment(dateStr);
                    if (date.isValid() && date.year() === year) {
                        const dayIndex = date.dayOfYear() - 1;
                        if (dayIndex < lines.length) {
                            const dayType = lines[dayIndex].trim();
                            calendar.push({
                                date: dateStr,
                                type: dayType === '1' ? 'weekend' : 'working',
                                description: dayType === '1' ? 'Выходной/праздничный' : 'Рабочий день'
                            });
                        }
                    }
                }
            }
        }
        
        // Сохраняем календарь для этого года
        if (!this.productionCalendars) {
            this.productionCalendars = {};
        }
        this.productionCalendars[year] = calendar;
        this.productionCalendar = calendar;
        
    } catch (error) {
        console.error('Ошибка загрузки производственного календаря:', error);
        // В случае ошибки создаем стандартный календарь
        this.createDefaultCalendar(year);
    } finally {
        this.loadingCalendar = false;
    }
},
clearTerminationDate() {
    if (this.editEmployeeData.clearTerminationDate) {
        this.editEmployeeData.termination_date = '';
    }
},
async deleteEmployeePermanently() {
    if (!this.editEmployeeData.id) return;

    if (!confirm('Вы уверены, что хотите полностью удалить сотрудника? Это действие нельзя отменить.')) {
        return;
    }

    this.deletingEmployee = true;
    try {
        // Сначала удаляем все записи расписания сотрудника
        await this.apiCall(`${API_BASE}/schedule.php`, {
            method: 'DELETE',
            body: JSON.stringify({
                employee_id: this.editEmployeeData.id,
                delete_all: true
            })
        });

        // Затем удаляем самого сотрудника
        await this.apiCall(`${API_BASE}/employees.php`, {
            method: 'DELETE',
            body: JSON.stringify({
                id: this.editEmployeeData.id,
                permanent: true
            })
        });
        
        this.editEmployeeDialog = false;
        this.selectedEmployeeForDelete = null;
        await this.loadEmployees();
        this.showSuccess('Сотрудник полностью удален');
    } catch (error) {
        this.showError('Ошибка удаления сотрудника: ' + error.message);
    } finally {
        this.deletingEmployee = false;
    }
},
// Метод для сохранения изменений сотрудника
async saveEmployeeEdit() {
    if (!this.editEmployeeData.name) {
        this.showError('Введите имя сотрудника');
        return;
    }

    this.savingEmployee = true;
    try {
        const updateData = {
            id: this.editEmployeeData.id,
            name: this.editEmployeeData.name,
            created_at: this.editEmployeeData.created_at
        };

        // Если установлен флаг снятия даты увольнения или явно указана пустая строка
        if (this.editEmployeeData.clearTerminationDate || this.editEmployeeData.termination_date === '') {
            updateData.termination_date = null;
        } else if (this.editEmployeeData.termination_date) {
            updateData.termination_date = this.editEmployeeData.termination_date;
        }

        await this.apiCall(`${API_BASE}/employees.php`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        this.editEmployeeDialog = false;
        await this.loadEmployees();
        await this.loadScheduleData();
        this.showSuccess('Данные сотрудника обновлены');
    } catch (error) {
        this.showError('Ошибка обновления сотрудника: ' + error.message);
    } finally {
        this.savingEmployee = false;
    }
},
formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    // Если дата содержит время, обрезаем до даты
    if (dateStr.includes(' ')) {
        return dateStr.split(' ')[0];
    }
    if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
    }
    return dateStr;
},
// Метод для открытия диалога редактирования
openEditEmployeeDialog() {
    if (!this.selectedEmployeeForDelete) {
        this.showError('Выберите сотрудника для редактирования');
        return;
    }

    this.editEmployeeData = {
        id: this.selectedEmployeeForDelete.id,
        name: this.selectedEmployeeForDelete.name,
        created_at: this.editEmployeeData.created_at || moment().format('YYYY-MM-DD'),
        termination_date: this.selectedEmployeeForDelete.termination_date,
        clearTerminationDate: false
    };
    this.editEmployeeDialog = true;
},
// Метод для создания стандартного календаря
createDefaultCalendar(year) {
    const calendar = [];
    for (let month = 1; month <= 12; month++) {
        for (let day = 1; day <= 31; day++) {
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const date = moment(dateStr);
            if (date.isValid() && date.year() === year) {
                const dayOfWeek = date.day();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                calendar.push({
                    date: dateStr,
                    type: isWeekend ? 'weekend' : 'working',
                    description: isWeekend ? 'Выходной' : 'Рабочий день'
                });
            }
        }
    }
    
    if (!this.productionCalendars) {
        this.productionCalendars = {};
    }
    this.productionCalendars[year] = calendar;
    this.productionCalendar = calendar;
},
isBitrixWebhookConfigured() {
    return typeof BITRIX24_WEBHOOK === 'string' && BITRIX24_WEBHOOK.trim().length > 0;
},
/** Скрипт window.BX24 подключён (ещё не значит, что SDK инициализирован) */
isBitrixSdkPresent() {
    return typeof window.BX24 !== 'undefined' && typeof window.BX24.callMethod === 'function';
},
/** Приложение во фрейме портала (типичный режим window.BX24) */
isLikelyBitrixFrame() {
    try {
        return window.parent !== window;
    } catch (e) {
        return true;
    }
},
/**
 * Инициализация window.BX24. Без window.BX24.init() вызовы callMethod откладываются и не выполняются.
 * Вне iframe портала (или если init не отвечает) — используем вебхук.
 */
async ensureBitrixSdkReady() {
    if (this._bitrixSdkReady !== undefined) {
        return this._bitrixSdkReady;
    }

    if (!this.isBitrixSdkPresent() || typeof window.BX24.init !== 'function') {
        this._bitrixSdkReady = false;
        return false;
    }

    // Вне Bitrix iframe SDK не аутентифицирован — сразу вебхук, без ожидания init
    if (!this.isLikelyBitrixFrame()) {
        this._bitrixSdkReady = false;
        return false;
    }

    this._bitrixSdkReady = await new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(ok);
        };

        const timer = setTimeout(() => finish(false), 4000);

        try {
            window.BX24.init(() => {
                finish(true);
            });
        } catch (e) {
            finish(false);
        }
    });

    return this._bitrixSdkReady;
},
/** @deprecated используйте ensureBitrixSdkReady */
async isBitrixSdkAvailable() {
    return this.ensureBitrixSdkReady();
},
async bitrixCall(method, params = {}) {
    const useSdk = await this.ensureBitrixSdkReady();

    if (useSdk) {
        try {
            return await new Promise((resolve, reject) => {
                window.BX24.callMethod(method, params, (res) => {
                    if (res.error()) {
                        const err = res.error();
                        const message = (err && (err.ex && err.ex.error_description || err.ex && err.ex.error || err.toString())) || String(err);
                        reject(new Error(message));
                        return;
                    }
                    resolve(res.data());
                });
            });
        } catch (sdkError) {
            if (!this.isBitrixWebhookConfigured()) {
                throw sdkError;
            }
            console.warn(`window.BX24.${method} ошибка, fallback на вебхук:`, sdkError);
        }
    }

    if (!this.isBitrixWebhookConfigured()) {
        throw new Error('window.BX24 недоступен и вебхук Bitrix24 не настроен (BITRIX24_WEBHOOK)');
    }

    const base = BITRIX24_WEBHOOK.replace(/\/$/, '');
    const response = await fetch(`${base}/${method}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        throw new Error(`Bitrix webhook HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.error) {
        throw new Error(json.error_description || json.error);
    }

    return json.result;
},
async bitrixUpdateDeal(dealId, fields) {
    return this.bitrixCall('crm.deal.update', { id: dealId, fields });
},
async bitrixAddDealComment(dealId, comment) {
    return this.bitrixCall('crm.timeline.comment.add', {
        fields: {
            ENTITY_ID: String(dealId),
            ENTITY_TYPE: 'deal',
            COMMENT: comment,
        },
    });
},
async callApi(method, filter, select, entityTypeId) {
    const pageSize = APP_CONFIG.BITRIX_PAGE_SIZE;
    const params = {};
    if (filter) params.filter = filter;
    if (select) params.select = select;
    if (method === 'crm.dealcategory.stage.list' && entityTypeId != null) {
        params.entityTypeId = entityTypeId;
        params.id = entityTypeId;
    }

    let allData = [];
    let start = 0;

    while (true) {
        const result = await this.bitrixCall(method, { ...params, start });
        const chunk = Array.isArray(result) ? result : (result && result.items ? result.items : (result ? [result] : []));
        allData = allData.concat(chunk);

        if (chunk.length < pageSize) break;
        start += pageSize;
        if (start > 5000) break;
    }

    return allData;
},
                // API методы
                async apiCall(url, options = {}) {
                    try {
                        const response = await fetch(url, {
                            headers: {
                                'Content-Type': 'application/json',
                                ...options.headers
                            },
                            ...options
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        if (!data.success) {
                            throw new Error(data.error || 'Unknown error');
                        }
                        
                        return data;
                    } catch (error) {
                        console.error('API Error:', error);
                        throw error;
                    }
                },

                async loadEmployees() {
                    try {
                        const data = await this.apiCall(`${API_BASE}/employees.php`);
                        this.employees = data.data.map(emp => ({
                            ...emp,
                            schedule: {}
                        }));
                    } catch (error) {
                        this.showError('Ошибка загрузки сотрудников: ' + error.message);
                    }
                },
                confirmRemoveEmployee() {
                    if (!this.selectedEmployeeForDelete) return;
                    
                    if (confirm(`Вы уверены, что хотите удалить сотрудника "${this.selectedEmployeeForDelete.name}"?`)) {
                        this.removeEmployee();
                    }
                },
                async loadDeals() {
                    try {
                        const lookback = moment()
                            .subtract(APP_CONFIG.DEAL_LIST_MONTHS_BACK, 'month')
                            .startOf('day');
                        const selectFields = [
                            'ID',
                            'TITLE',
                            CRM_FIELDS.DEAL_START,
                            CRM_FIELDS.DEAL_END,
                            CRM_FIELDS.DEAL_CONFIRMED_START,
                            CRM_FIELDS.DEAL_CONFIRMED_END,
                            CRM_FIELDS.DEAL_MAN_DAYS,
                        ];
                        // Только ЧД на сервере; даты и lookback — на клиенте (плановые или подтверждённые UF)
                        const rawDeals = await this.callApi(
                            'crm.deal.list',
                            { [`!${CRM_FIELDS.DEAL_MAN_DAYS}`]: 'null' },
                            selectFields
                        );

                        this.deals = (Array.isArray(rawDeals) ? rawDeals : []).filter((deal) => {
                            const md = Number(deal[CRM_FIELDS.DEAL_MAN_DAYS]);
                            if (!Number.isFinite(md) || md <= 0) return false;
                            const { start, end } = this.dealPeriodBounds(deal);
                            if (!start.isValid() || !end.isValid() || end.isBefore(start)) return false;
                            return end.isSameOrAfter(lookback, 'day');
                        });

                        if ((Array.isArray(rawDeals) ? rawDeals : []).length > 0 && this.deals.length === 0) {
                            const sample = rawDeals[0];
                            console.warn('Сделки с ЧД есть, но нет дат в плановых/подтверждённых UF', {
                                CRM_FIELDS,
                                sample,
                            });
                            this.showError(
                                'Сделки с ЧД найдены, но даты пустые. Заполните плановые или подтверждённые даты в сделке.'
                            );
                        }

                        console.log(`Загружено сделок: ${this.deals.length}`);
                        
                        // Инвалидируем кэш при загрузке новых сделок
                        this.invalidateCache();
                    } catch (error) {
                        console.error('Ошибка загрузки сделок:', error);
                        this.showError('Ошибка загрузки сделок: ' + error.message);
                    }
                },

                async loadScheduleForRange(startDate, endDate, merge = true) {
                    if (!startDate || !endDate) return;

                    const start = moment(startDate).format('YYYY-MM-DD');
                    const end = moment(endDate).format('YYYY-MM-DD');

                    try {
                        const data = await this.apiCall(
                            `${API_BASE}/schedule.php?start_date=${start}&end_date=${end}`
                        );

                        if (!merge) {
                            this.employees.forEach(emp => {
                                emp.schedule = {};
                            });
                        } else {
                            this.employees.forEach(emp => {
                                let cur = moment(start);
                                const endMoment = moment(end);
                                while (cur.isSameOrBefore(endMoment, 'day')) {
                                    delete emp.schedule[cur.format('YYYY-MM-DD')];
                                    cur.add(1, 'day');
                                }
                            });
                        }

                        data.data.forEach(item => {
                            const employee = this.employees.find(e => e.name === item.name);
                            if (employee && item.date) {
                                employee.schedule[item.date] = item.status;
                            }
                        });
                    } catch (error) {
                        this.showError('Ошибка загрузки графика: ' + error.message);
                    }
                },
                async ensureScheduleForRange(startDate, endDate) {
                    const start = moment(startDate).format('YYYY-MM-DD');
                    const end = moment(endDate).format('YYYY-MM-DD');

                    if (!this._scheduleRangeLoaded) {
                        await this.loadScheduleForRange(start, end, false);
                        this._scheduleRangeLoaded = { start, end };
                        return;
                    }

                    const loadedStart = moment(this._scheduleRangeLoaded.start);
                    const loadedEnd = moment(this._scheduleRangeLoaded.end);
                    const needStart = moment(start).isBefore(loadedStart, 'day');
                    const needEnd = moment(end).isAfter(loadedEnd, 'day');

                    if (!needStart && !needEnd) return;

                    const loadStart = needStart
                        ? moment.min(moment(start), loadedStart).format('YYYY-MM-DD')
                        : this._scheduleRangeLoaded.start;
                    const loadEnd = needEnd
                        ? moment.max(moment(end), loadedEnd).format('YYYY-MM-DD')
                        : this._scheduleRangeLoaded.end;

                    await this.loadScheduleForRange(loadStart, loadEnd, true);
                    this._scheduleRangeLoaded = { start: loadStart, end: loadEnd };
                },
                async ensureProductionCalendarsForRange(startDate, endDate) {
                    const years = new Set();
                    let cur = moment(startDate).startOf('day');
                    const end = moment(endDate).startOf('day');
                    while (cur.isSameOrBefore(end, 'day')) {
                        years.add(cur.year());
                        cur.add(1, 'day');
                    }
                    await Promise.all([...years].map(year => this.loadProductionCalendarForYear(year)));
                },
                async loadSchedule() {
                    if (!this.tableDateStart || !this.tableDateEnd) return;
                    await this.loadScheduleForRange(this.tableDateStart, this.tableDateEnd, false);
                    this._scheduleRangeLoaded = {
                        start: this.tableDateStart,
                        end: this.tableDateEnd,
                    };
                },

                async refreshData() {
                    this.loading = true;
                    try {
                        await Promise.all([
                            this.loadEmployees(),
                            this.loadDeals(),
                            this.loadSchedule()
                        ]);

                        if (this.currentView === 'planning') {
                            // Используем оптимизированную версию
                            await this.updateChart();
                        }
                    } catch (error) {
                        this.showError('Ошибка обновления данных: ' + error.message);
                    } finally {
                        this.loading = false;
                    }
                },


                async addEmployee() {
                    if (!this.newEmployee.name) {
                        this.showError('Введите имя сотрудника');
                        return;
                    }

                    this.addingEmployee = true;
                    try {
                        await this.apiCall(`${API_BASE}/employees.php`, {
                            method: 'POST',
                            body: JSON.stringify({ name: this.newEmployee.name })
                        });
                        
                        this.newEmployee.name = '';
                        await this.loadEmployees();
                        await this.loadScheduleData();
                        this.showSuccess('Сотрудник добавлен');
                    } catch (error) {
                        this.showError('Ошибка добавления сотрудника: ' + error.message);
                    } finally {
                        this.addingEmployee = false;
                    }
                },

                async removeEmployee() {
                    if (!this.selectedEmployeeForDelete) return;

                    this.deletingEmployee = true;
                    try {
                        const terminationDate = moment().format('YYYY-MM-DD');
                        await this.apiCall(`${API_BASE}/employees.php`, {
                            method: 'DELETE',
                            body: JSON.stringify({ 
                                id: this.selectedEmployeeForDelete.id,
                                termination_date: terminationDate 
                            })
                        });
                        
                        this.selectedEmployeeForDelete = null;
                        await this.loadEmployees();
                        this.showSuccess('Сотрудник удален');
                    } catch (error) {
                        this.showError('Ошибка удаления сотрудника: ' + error.message);
                    } finally {
                        this.deletingEmployee = false;
                    }
                },

                async saveIconChange() {
                    if (!this.currentEmployee || !this.currentDate || !this.selectedStatus) return;

                    this.savingStatus = true;
                    try {
                        await this.apiCall(`${API_BASE}/schedule.php`, {
                            method: 'POST',
                            body: JSON.stringify({
                                employee_id: this.currentEmployee.id,
                                date: this.currentDate,
                                status: this.selectedStatus
                            })
                        });
                        
                        // Обновляем локальные данные
                        this.currentEmployee.schedule[this.currentDate] = this.selectedStatus;
                        this.iconDialog = false;
                        this.invalidateCache();
                        if (this.currentView === 'planning') {
                            await this.updateChart();
                        }
                        this.showSuccess('Статус обновлен');
                    } catch (error) {
                        this.showError('Ошибка сохранения статуса: ' + error.message);
                    } finally {
                        this.savingStatus = false;
                    }
                },

                async applySchedule() {
                    if (!this.selectedEmployee) {
                        this.showError('Выберите сотрудника');
                        return;
                    }

                    this.loading = true;
                    try {
                        if (this.scheduleAction === 'production_calendar') {
                            // Применяем производственный календарь для выбранного сотрудника
                            await this.applyCalendarToEmployee(this.selectedEmployee);
                        } else {
                            // Стандартная логика применения графика
                            if (!this.scheduleDateStart || !this.scheduleDateEnd) {
                                this.showError('Заполните все поля');
                                return;
                            }

                            await this.apiCall(`${API_BASE}/schedule.php`, {
                                method: 'POST',
                                body: JSON.stringify({
                                    bulk_update: true,
                                    employee_id: this.selectedEmployee.id,
                                    start_date: this.scheduleDateStart,
                                    end_date: this.scheduleDateEnd,
                                    status: this.scheduleAction
                                })
                            });
                        }
                        
                        await this.loadSchedule();
                        this.showSuccess('График обновлен');
                        
                    } catch (error) {
                        this.showError('Ошибка применения графика: ' + error.message);
                    } finally {
                        this.loading = false;
                    }
                },

                async addDeal() {
                    if (!this.canAddDeal) return;

                    this.loading = true;
                    try {
                        await this.apiCall(`${API_BASE}/deals.php`, {
                            method: 'POST',
                            body: JSON.stringify({
                                man_days: this.newDeal.manDays,
                                start_date: this.newDeal.startDate,
                                end_date: this.newDeal.endDate
                            })
                        });
                        
                        await this.loadDeals();
                        this.updateChart();
                        this.newDeal = { 
                            manDays: 5, 
                            startDate: moment().format('YYYY-MM-DD'), 
                            endDate: moment().add(6, 'days').format('YYYY-MM-DD') 
                        };
                        this.dealCheckResult = null;
                        this.canAddDeal = false;
                        this.showSuccess('Сделка добавлена');
                    } catch (error) {
                        this.showError('Ошибка добавления сделки: ' + error.message);
                    } finally {
                        this.loading = false;
                    }
                },

                async deleteDeal(dealId) {
                    this.loading = true;
                    try {
                        await this.apiCall(`${API_BASE}/deals.php`, {
                            method: 'DELETE',
                            body: JSON.stringify({ id: dealId })
                        });
                        
                        await this.loadDeals();
                        this.updateChart();
                        this.showSuccess('Сделка удалена');
                    } catch (error) {
                        this.showError('Ошибка удаления сделки: ' + error.message);
                    } finally {
                        this.loading = false;
                    }
                },

                // Вспомогательные методы
                showError(message) {
                    this.errorMessage = message;
                    setTimeout(() => {
                        this.errorMessage = '';
                    }, 5000);
                },

                showSuccess(message) {
                    this.successMessage = message;
                    setTimeout(() => {
                        this.successMessage = '';
                    }, 3000);
                },

                formatDate(dateStr) {
                    return moment(dateStr).format('DD.MM.YYYY');
                },

                formatDateTime(dateTimeStr) {
                    return moment(dateTimeStr).format('DD.MM.YYYY HH:mm');
                },

                handleWheelScroll(e) {
                    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                        const wrap = document.querySelector('.table-wrapper');
                        if (wrap) wrap.scrollLeft += e.deltaY;
                        e.preventDefault();
                    }
                },

                planning(){
                    this.currentView = 'planning';
                    setTimeout(() => {
                        this.updateChart();
                    }, 200);
                }, 

                loadTable(){
                    this.currentView = 'loadTable';
                    this.loadScheduleData();
                },

                async loadScheduleData() {
                    this.loading = true;
                    try {
                        await this.loadSchedule();
                    } catch (error) {
                        this.showError('Ошибка загрузки графика: ' + error.message);
                    } finally {
                        this.loading = false;
                    }
                },
                formatTableDate(date) {
                    const m = moment(date);
                    return m.format('DD.MM') + '\n' + m.format('ddd');
                },

                changeIcon(employee, date) {
                    // Не позволяем изменять статус для уволенных сотрудников или до даты приема
                    //if (this.isEmployeeTerminated(employee, date) || !this.isEmployeeHired(employee, date)) {
                    //    this.showError('Нельзя изменить статус для этого периода');
                    //    return;
                    //}
                    
                    this.currentEmployee = employee;
                    this.currentDate = date;
                    const currentStatus = employee.schedule[date];
                     if (!currentStatus) {
                        if(this.isEmployeeTerminated(employee, date)){
                            this.selectedStatus = 'terminated';
                        }else if(this.isEmployeeHired(employee, date)){
                            this.selectedStatus = 'not-hired';
                        }else{
                            this.selectedStatus = this.isWeekend(date) ? 'weekend' : 'working';
                        }
                    } else {
                        this.selectedStatus = currentStatus;
                    }

                    this.iconDialog = true;
                },
                getCellClass(employee, date) {
                    if (this.isEmployeeTerminated(employee, date)) {
                        return 'terminated';
                    }
                        
                        // Проверяем статус приема
                    if (!this.isEmployeeHired(employee, date)) {
                        return 'not-hired';
                    }
                        
                    const status = employee.schedule[date];
                    // Сначала проверяем специальные статусы
                    if (status === 'terminated') return 'terminated';
                    if (status === 'not_hired') return 'not-hired';
                    
                    // Затем обычные статусы
                    if (status === 'vacation') return 'vacation';
                    if (status === 'sick') return 'sick';
                    if (status === 'weekend') return 'weekend';
                    if (status === 'working') return 'working';
                    
                    // По умолчанию - проверяем выходной
                    return this.isWeekend(date) ? 'weekend' : 'working';
                },
getCellContent(employee, date) {
    const status = employee.schedule[date];
    if (this.isEmployeeTerminated(employee, date)) {
        return {
            icon: 'mdi-account-off',
            tooltip: 'Уволен',
            color: 'grey darken-2'
        };
    }

    if (!this.isEmployeeHired(employee, date)) {
        return {
            icon: 'mdi-account-clock',
            tooltip: 'Еще не принят',
            color: 'blue-grey lighten-2'
        };
    }

    if (status === 'terminated') {
        return {
            icon: 'mdi-account-off',
            tooltip: 'Уволен',
            color: 'grey darken-2'
        };
    }
    
    if (status === 'not_hired') {
        return {
            icon: 'mdi-account-clock',
            tooltip: 'Еще не принят',
            color: 'blue-grey lighten-2'
        };
    }
    
    if (status === 'vacation') {
        return {
            icon: 'mdi-palm-tree',
            tooltip: 'Отпуск',
            color: 'orange'
        };
    }
    if (status === 'sick') {
        return {
            icon: 'mdi-hospital-box',
            tooltip: 'Больничный',
            color: 'red'
        };
    }
    if (status === 'weekend') {
        return {
            icon: 'mdi-sofa',
            tooltip: 'Выходной',
            color: 'grey'
        };
    }
    if (status === 'working') {
        return {
            icon: 'mdi-briefcase',
            tooltip: 'Рабочий день',
            color: 'green'
        };
    }
    
    return this.isWeekend(date) 
        ? {
            icon: 'mdi-sofa',
            tooltip: 'Выходной',
            color: 'grey'
        } 
        : {
            icon: 'mdi-briefcase',
            tooltip: 'Рабочий день',
            color: 'green'
        };
},
                // МЕТОДЫ ДЛЯ ПРАВИЛЬНОГО РАСЧЕТА ЧЕЛОВЕКО-ДНЕЙ
                // Основной метод проверки возможности добавления сделки
                async checkDeal() {

                    if (!this.newDeal.manDays || !this.newDeal.startDate || !this.newDeal.endDate) {
                        this.showError('Заполните все поля сделки');
                        return;
                    }

                    this.checkingDeal = true;
                    await this.checkDealWithRedistribution();
                    /*
                    try {
                        const start = moment(this.newDeal.startDate);
                        const end = moment(this.newDeal.endDate);
                        
                        let totalAvailableMinusOccupied = 0;
                        let canAdd = true;
                        let problemDate = null;
                        
                        // Считаем рабочие дни в периоде сделки
                        const workDaysInDeal = this.countWorkDaysInPeriod(start, end);
                        
                        if (workDaysInDeal === 0) {
                            this.dealCheckResult = 'В выбранном периоде нет рабочих дней';
                            this.canAddDeal = false;
                            return;
                        }

                        // Проверяем каждую дату в периоде сделки
                        const currentDate = start.clone();
                        while (currentDate.isSameOrBefore(end)) {
                            const dateStr = currentDate.format('YYYY-MM-DD');
                            
                            // Получаем доступные человеко-дни на эту дату (уже с учетом расписания)
                            const availableManDays = this.getAvailableManDays(dateStr);
                            
                            // Получаем занятые человеко-дни на эту дату
                            const occupiedManDays = await this.getOccupiedManDays(dateStr);
                            
                            // Вычисляем свободные человеко-дни (доступные - занятые)
                            const freeManDays = availableManDays - occupiedManDays;
                            
                            // Накопляем общее количество свободных человеко-дней
                            totalAvailableMinusOccupied += freeManDays;
                            
                            // Если свободных человеко-дней меньше 0, сразу отказываем
                            if (freeManDays < 0) {
                                canAdd = false;
                                problemDate = dateStr;
                                break;
                            }
                            
                            currentDate.add(1, 'day');
                        }
                        
                        if (!canAdd) {
                            this.dealCheckResult = `Нельзя добавить сделку. Недостаточно ресурсов на дату ${this.formatDate(problemDate)}`;
                            this.canAddDeal = false;
                            return;
                        }
                        
                        // Вычисляем коэффициент загрузки: требуемые ЧД / свободные ЧД
                        const capacityRatio = totalAvailableMinusOccupied > 0 ? 
                            this.newDeal.manDays / totalAvailableMinusOccupied : 0;
                        
                        // Проверяем условие: коэффициент загрузки должен быть ≤ 0.9 (90%)
                        if (capacityRatio <= APP_CONFIG.CAPACITY_RATIO_LIMIT) {
                            this.dealCheckResult = `Можно добавить сделку. Коэффициент загрузки: ${(capacityRatio * 100).toFixed(1)}% (${this.newDeal.manDays} ЧД / ${totalAvailableMinusOccupied.toFixed(1)} свободных ЧД)`;
                            await new Promise((resolve) => {
                                    window.BX24.callMethod(
                                        "crm.deal.update",
                                        {
                                            id: 13039,
                                            fields: {
                                                UF_CRM_1751532386933: this.newDeal.startDate,
                                                UF_CRM_1751532395170: this.newDeal.endDate,
                                                UF_CRM_1751532404575: this.newDeal.manDays,
                                            },
                                        },
                                        function(result) {
                                        if (result.error()) {
                                            console.error('Ошибка добавления комментария:', result.error())
                                        }
                                        resolve()
                                        }
                                    )
                                    })
                            this.canAddDeal = true;
                        } else {
                            this.dealCheckResult = `Нельзя добавить сделку. Коэффициент загрузки ${(capacityRatio * 100).toFixed(1)}% превышает допустимые 90%. Требуется ${this.newDeal.manDays} ЧД, доступно ${totalAvailableMinusOccupied.toFixed(1)} свободных ЧД`;
                            this.canAddDeal = false;
                        }
                            await new Promise((resolve) => {
                                    window.BX24.callMethod(
                                        "crm.timeline.comment.add",
                                        {
                                        fields: {
                                            ENTITY_ID: "13039",
                                            ENTITY_TYPE: "deal",
                                            COMMENT: this.dealCheckResult,
                                        }
                                        },
                                        function(result) {
                                        if (result.error()) {
                                            console.error('Ошибка добавления комментария:', result.error())
                                        }
                                        resolve()
                                        }
                                    )
                                    })
                                   
                    } catch (error) {
                        this.showError('Ошибка проверки сделки: ' + error.message);
                        this.canAddDeal = false;
                    } finally {
                        this.checkingDeal = false;
                    } */
                },
                isEmployeeAvailableForWork(employee, date) {
                    const dateStr = moment(date).format('YYYY-MM-DD');
                    const dateMoment = moment(dateStr);

                    if (employee.created_at && moment(employee.created_at).isAfter(dateMoment, 'day')) {
                        return false;
                    }
                    if (employee.termination_date && moment(employee.termination_date).isBefore(dateMoment, 'day')) {
                        return false;
                    }

                    const status = employee.schedule[dateStr];
                    if (status === 'working') return true;
                    if (status === 'vacation' || status === 'sick' || status === 'weekend' || status === 'terminated' || status === 'not_hired') {
                        return false;
                    }
                    return !this.isWeekend(dateStr);
                },
                verifyPersonnelChartConsistency(dates) {
                    const mismatches = [];
                    for (const dateStr of dates) {
                        const chartCount = this.getAvailableManDays(dateStr);
                        const tableCount = this.employees.filter(emp =>
                            this.isEmployeeAvailableForWork(emp, dateStr)
                        ).length;
                        if (chartCount !== tableCount) {
                            mismatches.push({ date: dateStr, chartCount, tableCount });
                        }
                    }
                    if (mismatches.length) {
                        console.warn('Несоответствие ЧД график/таблица:', mismatches);
                    } else if (dates.length) {
                        console.log(`Проверка ЧД: график и таблица совпадают для ${dates.length} дат`);
                    }
                    return mismatches;
                },
                /**
                 * Суммарная потребность в ЧД по всем сделкам на дату без ограничения емкостью дня.
                 * Нужна для обнаружения перегруза и как основа для «занято» на графике.
                 */
                getRawOccupiedManDays(date) {
                    const dateStr = moment(date).format('YYYY-MM-DD');
                    if (this.cacheValid && this.dynamicRawDemandCache[dateStr] !== undefined) {
                        return this.dynamicRawDemandCache[dateStr];
                    }
                    let totalLoad = 0;
                    for (const deal of this.deals) {
                        if (!this.isDealActiveOnDate(deal, dateStr)) continue;
                        const workDaysInDeal = this.getDealCalendarDaysCount(deal);
                        if (workDaysInDeal <= 0) continue;
                        totalLoad += this.getDealDailyManDayLoad(deal);
                    }
                    return totalLoad;
                },
                /** Занятые ЧД: из динамической симуляции (остаток/оставшиеся дни + приоритет по короткому периоду), иначе min(статическая потребность, ёмкость). */
                async getOccupiedManDays(date) {
                    const dateStr = moment(date).format('YYYY-MM-DD');
                    if (this.cacheValid && this.occupancyCache[dateStr] !== undefined) {
                        return this.occupancyCache[dateStr];
                    }
                    const raw = this.getRawOccupiedManDays(dateStr);
                    const availableManDays = this.getAvailableManDays(dateStr);
                    return Math.min(raw, availableManDays);
                },
async addDealWithRedistribution() {
    if (!this.canAddDeal) return;

    this.loading = true;
    try {
        // Сначала добавляем сделку
        await this.apiCall(`${API_BASE}/deals.php`, {
            method: 'POST',
            body: JSON.stringify({
                man_days: this.newDeal.manDays,
                start_date: this.newDeal.startDate,
                end_date: this.newDeal.endDate
            })
        });
        
        // Затем автоматически оптимизируем распределение нагрузки
        await this.optimizeWorkloadDistribution();
        
        await this.loadDeals();
        this.updateChart();
        this.newDeal = { 
            manDays: 5, 
            startDate: moment().format('YYYY-MM-DD'), 
            endDate: moment().add(6, 'days').format('YYYY-MM-DD') 
        };
        this.dealCheckResult = null;
        this.canAddDeal = false;
        this.showSuccess('Сделка добавлена и нагрузка оптимизирована');
    } catch (error) {
        this.showError('Ошибка добавления сделки: ' + error.message);
    } finally {
        this.loading = false;
    }
},

// Метод для оптимизации распределения нагрузки между сделками
async optimizeWorkloadDistribution() {
    try {
        const startDate = moment().subtract(APP_CONFIG.CHART_MONTHS_LOOKBACK, 'month'); // Начинаем с месяца назад
        const endDate = moment().add(APP_CONFIG.OPTIMIZATION_MONTHS_AHEAD, 'months'); // Планируем вперёд
        
        const optimizationPeriod = [];
        let currentDate = startDate.clone();
        
        // Собираем данные по всем дням в периоде оптимизации
        while (currentDate.isSameOrBefore(endDate)) {
            const dateStr = currentDate.format('YYYY-MM-DD');
            
            if (!this.isWeekend(dateStr)) {
                const available = this.getAvailableManDays(dateStr);
                const occupied = await this.getOccupiedManDays(dateStr);
                
                optimizationPeriod.push({
                    date: dateStr,
                    available: available,
                    occupied: occupied,
                    free: Math.max(0, available - occupied),
                    overload: Math.max(0, occupied - available)
                });
            }
            
            currentDate.add(1, 'day');
        }
        
        // Находим перегруженные дни
        const overloadedDays = optimizationPeriod.filter(day => day.overload > 0);
        
        for (const overloadedDay of overloadedDays) {
            // Находим дни с достаточной емкостью для перераспределения
            const candidateDays = optimizationPeriod
                .filter(day => 
                    moment(day.date).isAfter(overloadedDay.date) && // Будущие дни
                    day.free > 0 &&
                    !this.isWeekend(day.date)
                )
                .sort((a, b) => a.free - b.free); // Сортируем по возрастанию свободной емкости
            
            let remainingOverload = overloadedDay.overload;
            
            for (const candidateDay of candidateDays) {
                if (remainingOverload <= 0) break;
                
                const loadToMove = Math.min(remainingOverload, candidateDay.free);
                if (loadToMove > 0) {
                    // Здесь должна быть логика фактического перемещения нагрузки между сделками
                    // Например, изменение дат выполнения задач или перераспределение ресурсов
                    remainingOverload -= loadToMove;
                    
                    // Обновляем данные о емкости
                    candidateDay.free -= loadToMove;
                    candidateDay.occupied += loadToMove;
                    overloadedDay.occupied -= loadToMove;
                    overloadedDay.free += loadToMove;
                }
            }
        }
        
    } catch (error) {
        console.error('Ошибка оптимизации нагрузки:', error);
    }
},
async checkDealWithRedistribution() {
    if (!this.newDeal.manDays || !this.newDeal.startDate || !this.newDeal.endDate) {
        this.showError('Заполните все поля сделки');
        return;
    }
    this.checkingDeal = true;
    
    try {
        // Предварительно вычисляем данные для периода сделки
        await this.preCalculateOccupancyForRange(this.newDeal.startDate, this.newDeal.endDate);
        
        const start = moment(this.newDeal.startDate);
        const end = moment(this.newDeal.endDate);
        
        const calendarDaysInDeal = end.diff(start, 'days') + 1;
        
        if (calendarDaysInDeal === 0) {
            this.dealCheckResult = 'В выбранном периоде нет дней';
            this.canAddDeal = false;
            return;
        }

        const requiredDailyLoad = this.getUniformDailyManDayLoad(this.newDeal.manDays, calendarDaysInDeal);
        
        let totalAvailableCapacity = 0;
        let dailyCapacityData = [];
        let problemDates = [];
        
        const currentDate = start.clone();
        while (currentDate.isSameOrBefore(end)) {
            const dateStr = currentDate.format('YYYY-MM-DD');
            
            if (this.isWeekend(dateStr)) {
                currentDate.add(1, 'day');
                continue;
            }
            
            // Используем кэшированные данные
            const available = this.getAvailableManDays(dateStr);
            const occupied = this.occupancyCache[dateStr] ?? 0;
            const free = Math.max(0, available - occupied);
            
            dailyCapacityData.push({
                date: dateStr,
                available: available,
                occupied: occupied,
                free: free,
                required: requiredDailyLoad
            });
            
            if (free < requiredDailyLoad) {
                problemDates.push({
                    date: dateStr,
                    deficit: requiredDailyLoad - free,
                    free: free,
                    available: available,
                    occupied: occupied
                });
            }
            
            totalAvailableCapacity += free;
            currentDate.add(1, 'day');
        }

        // Если нет проблем и коэффициент ок
        const capacityRatio = totalAvailableCapacity > 0 ? 
            this.newDeal.manDays / totalAvailableCapacity : 0;
        
        if (problemDates.length === 0) {
            if (capacityRatio <= APP_CONFIG.CAPACITY_RATIO_LIMIT) {
                this.dealCheckResult = `Можно добавить сделку на даты ${this.newDeal.startDate} / ${this.newDeal.endDate}. Коэффициент загрузки: ${(capacityRatio * 100).toFixed(1)}% (${this.newDeal.manDays} ЧД / ${totalAvailableCapacity.toFixed(1)} свободных ЧД)`;
                await this.updateCurrentDealFields(buildDealCalcFields(
                    this.newDeal.startDate,
                    this.newDeal.endDate,
                    this.newDeal.manDays
                ));
                this.canAddDeal = true;
            } else {
                this.dealCheckResult = `Нельзя добавить сделку на даты ${this.newDeal.startDate} / ${this.newDeal.endDate}. Коэффициент загрузки ${(capacityRatio * 100).toFixed(1)}% превышает допустимые 90%. Требуется ${this.newDeal.manDays} ЧД, доступно ${totalAvailableCapacity.toFixed(1)} свободных ЧД`;
                this.canAddDeal = false;
            }
        } else {
            // Пытаемся перераспределить внутри периода
            const sortedDays = dailyCapacityData
                .filter(day => !this.isWeekend(day.date))
                .sort((a, b) => b.free - a.free);
            
            let totalRedistributableLoad = problemDates.reduce((sum, problem) => sum + problem.deficit, 0);
            let remainingLoad = totalRedistributableLoad;
            
            for (const day of sortedDays) {
                if (remainingLoad <= 0) break;
                
                if (problemDates.some(problem => problem.date === day.date)) continue;
                
                const additionalCapacity = Math.max(0, day.free - day.required);
                
                if (additionalCapacity > 0) {
                    const loadToMove = Math.min(remainingLoad, additionalCapacity);
                    remainingLoad -= loadToMove;
                    
                    day.free -= loadToMove;
                    day.occupied += loadToMove;
                }
            }

            if (remainingLoad <= 0) {
                this.dealCheckResult = `Можно добавить сделку на даты ${this.newDeal.startDate} / ${this.newDeal.endDate}. Коэффициент загрузки: ${(capacityRatio * 100).toFixed(1)}% (${this.newDeal.manDays} ЧД / ${totalAvailableCapacity.toFixed(1)} свободных ЧД)`;
                await this.updateCurrentDealFields(buildDealCalcFields(
                    this.newDeal.startDate,
                    this.newDeal.endDate,
                    this.newDeal.manDays
                ));
                this.canAddDeal = true;
            } else {
                // Расширение периода за счет следующих дней
                let extendedEnd = end.clone();
                let extendedCalendarDays = calendarDaysInDeal;
                const maxExtensions = APP_CONFIG.MAX_DEAL_EXTENSION_DAYS;
                let extensions = 0;
                let fitted = false;

                while (true) {
                    extendedEnd.add(1, 'day');
                    const extendedDateStr = extendedEnd.format('YYYY-MM-DD');
                    extendedCalendarDays += 1;
                    extensions += 1;

                    if (extensions > maxExtensions) {
                        this.dealCheckResult = `Нельзя добавить сделку. Не удалось найти подходящее расширение в пределах ${maxExtensions} дней.`;
                        this.canAddDeal = false;
                        break;
                    }

                    const newDailyLoad = this.getUniformDailyManDayLoad(this.newDeal.manDays, extendedCalendarDays);

                    let fits = true;
                    let current = start.clone();
                    while (current.isSameOrBefore(extendedEnd)) {
                        const dStr = current.format('YYYY-MM-DD');
                        if (!this.isWeekend(dStr)) {
                            const free = await this.getFreeManDays(dStr);
                            if (free < newDailyLoad) {
                                fits = false;
                                break;
                            }
                        }
                        current.add(1, 'day');
                    }

                    if (fits) {
                        this.newDeal.endDate = extendedDateStr;
                        let extendedCapacity = 0;
                        let currentExt = start.clone();
                        while (currentExt.isSameOrBefore(extendedEnd)) {
                            const dStr = currentExt.format('YYYY-MM-DD');
                            if (!this.isWeekend(dStr)) {
                                extendedCapacity += await this.getFreeManDays(dStr);
                            }
                            currentExt.add(1, 'day');
                        }
                        const newCapacityRatio = extendedCapacity > 0 ? this.newDeal.manDays / extendedCapacity : 0;
                        this.dealCheckResult = `Сделка будет добавлена с расширением периода до ${this.newDeal.endDate} из-за нехватки ресурсов. Новый коэффициент загрузки: ${(newCapacityRatio * 100).toFixed(1)}%`;
                        await this.updateCurrentDealFields(buildDealCalcFields(
                            this.newDeal.startDate,
                            this.newDeal.endDate,
                            this.newDeal.manDays
                        ));
                        this.canAddDeal = true;
                        fitted = true;
                        break;
                    }
                }

                if (!fitted) {
                    this.canAddDeal = false;
                }
            }
        }
        
        await this.addCurrentDealComment(this.dealCheckResult);
                                   
    } catch (error) {
        this.showError('Ошибка проверки сделки: ' + error.message);
        this.canAddDeal = false;
    } finally {
        this.checkingDeal = false;
    }
},
async getFreeManDays(date) {
    const available = this.getAvailableManDays(date);
    const occupied = await this.getOccupiedManDays(date);
    
    // Свободные человеко-дни не могут быть меньше 0
    return Math.max(0, available - occupied);
},

// Метод для получения перегрузки (если занятость превышает доступность)
async getOverload(date) {
    const dateStr = moment(date).format('YYYY-MM-DD');
    const available = this.getAvailableManDays(dateStr);
    const raw = this.getRawOccupiedManDays(dateStr);
    return Math.max(0, raw - available);
},
                // Метод для подсчета рабочих дней в периоде (исключая выходные)
                countWorkDaysInPeriod(start, end) {
                    let workDays = 0;
                    const current = start.clone();
                    
                    while (current.isSameOrBefore(end)) {
                        const dateStr = current.format('YYYY-MM-DD');
                        
                        // День считается рабочим, если он не выходной по календарю
                        // (статусы сотрудников не влияют на определение "рабочего дня" для расчета периода)
                        if (!this.isWeekend(dateStr)) {
                            workDays++;
                        }
                        current.add(1, 'day');
                    }
                    
                    return workDays;
                },

                // Метод для получения доступных человеко-дней на дату
                getAvailableManDays(date) {
                    const dateStr = moment(date).format('YYYY-MM-DD');
                    const availableCount = this.employees.filter(emp =>
                        this.isEmployeeAvailableForWork(emp, dateStr)
                    ).length;
                    return Math.max(0, availableCount);
                },

                // Метод для проверки является ли день выходным
                isWeekend(date) {
                    const dateMoment = moment(date);
                    const year = dateMoment.year();
                    const dateStr = dateMoment.format('YYYY-MM-DD');
                    
                    // Проверяем стандартные выходные (суббота и воскресенье)
                    const dayOfWeek = dateMoment.day();
                    const isStandardWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    
                    // Проверяем производственный календарь для соответствующего года
                    if (this.productionCalendars && this.productionCalendars[year]) {
                        const calendarDay = this.productionCalendars[year].find(d => d.date === dateStr);
                        if (calendarDay) {
                            return calendarDay.type === 'weekend';
                        }
                    }
                    
                    return isStandardWeekend;
                },
                async updateOccupancyData() {
                    this.occupancyData = [];
                    const startDate = moment();
                    const endDate = moment().add(30, 'days');
                    
                    for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
                        const dateStr = m.format('YYYY-MM-DD');
                        const available = this.getAvailableManDays(dateStr);
                        const occupied = await this.getOccupiedManDays(dateStr);
                        
                        // Гарантируем, что свободные дни не могут быть отрицательными
                        const free = Math.max(0, available - occupied);
                        const percentage = available > 0 ? (occupied / available) * 100 : 0;
                        
                        this.occupancyData.push({
                            date: dateStr,
                            available: available,
                            occupied: occupied,
                            free: free,
                            percentage: percentage,
                            overload: Math.max(0, occupied - available) // Дополнительно храним данные о перегрузке
                        });
                    }
                },

                getOccupancyClass(percentage) {
                    if (percentage >= 90) return 'high-occupancy';
                    if (percentage >= 70) return 'medium-occupancy';
                    return 'low-occupancy';
                },

                getOccupancyStatus(percentage) {
                    if (percentage >= 90) return 'Высокая загрузка';
                    if (percentage >= 70) return 'Средняя загрузка';
                    return 'Низкая загрузка';
                },
                attachChartWheelPan(chart, categories) {
                    const chartContainer = document.getElementById('chartContainer');
                    if (!chartContainer || !chart) return;

                    if (this._chartWheelHandler) {
                        chartContainer.removeEventListener('wheel', this._chartWheelHandler);
                    }

                    const scrollSpeed = APP_CONFIG.CHART_SCROLL_SPEED;
                    this._chartWheelHandler = (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                        if (!delta) return;

                        const xAxis = chart.xAxis[0];
                        const extremes = xAxis.getExtremes();
                        const range = extremes.max - extremes.min;
                        const step = delta > 0 ? scrollSpeed : -scrollSpeed;

                        let newMin = extremes.min + step;
                        let newMax = extremes.max + step;

                        if (newMin < 0) {
                            newMin = 0;
                            newMax = range;
                        }
                        if (newMax >= categories.length - 1) {
                            newMax = categories.length - 1;
                            newMin = Math.max(0, newMax - range);
                        }

                        xAxis.setExtremes(newMin, newMax, true, false);
                    };

                    chartContainer.addEventListener('wheel', this._chartWheelHandler, { passive: false });
                },
                // Обновление графика загрузки
async updateChart() {
    const currentYear = moment().year();
        const nextYear = currentYear + 1;
        
        const startDate = moment().subtract(APP_CONFIG.CHART_MONTHS_LOOKBACK, 'month').startOf('day');
        const endDate = moment().endOf('year').add(APP_CONFIG.CHART_YEARS_AHEAD, 'year');
        const startStr = startDate.format('YYYY-MM-DD');
        const endStr = endDate.format('YYYY-MM-DD');

        await this.ensureProductionCalendarsForRange(startStr, endStr);
        await this.ensureScheduleForRange(startStr, endStr);
        
        // Предварительно вычисляем данные для всего периода
        await this.preCalculateOccupancyForRange(startStr, endStr);

        const categories = [];
        const availableData = [];
        const occupiedData = [];
        const freeData = [];
        const rawDemandByIndex = [];

        const allDates = [];
        for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
            allDates.push(m.format('YYYY-MM-DD'));
        }
        // Точки графика: сырая потребность и доступно из кэша; занято — из динамической симуляции при валидном кэше
        for (const dateStr of allDates) {
            const m = moment(dateStr);
            categories.push(m.format('DD.MM.YY'));

            const available = this.getAvailableManDays(dateStr);
            const rawDemand = this.getRawOccupiedManDays(dateStr);
            const occupied =
                this.cacheValid && this.occupancyCache[dateStr] !== undefined
                    ? this.occupancyCache[dateStr]
                    : Math.min(rawDemand, available);
            const free = Math.max(0, available - occupied);

            availableData.push(available);
            occupiedData.push(occupied);
            freeData.push(free);
            rawDemandByIndex.push(rawDemand);
        }

        const tableOverlapDates = this.tableDates.filter(d =>
            moment(d).isBetween(startDate, endDate, 'day', '[]')
        );
        this.verifyPersonnelChartConsistency(tableOverlapDates.length ? tableOverlapDates : allDates.slice(0, 14));

        const vm = this;
        Highcharts.chart('loadChart', {
        lang: {
            contextButtonTitle: "Контекстное меню",
            decimalPoint: ",",
            downloadJPEG: "Скачать JPEG",
            downloadPDF: "Скачать PDF",
            downloadPNG: "Скачать PNG",
            downloadSVG: "Скачать SVG",
            downloadCSV: "Скачать CSV",
            downloadXLS: "Скачать XLS",
            viewFullscreen: "Полноэкранный режим",
            viewData: "",
            drillUpText: "Назад к {series.name}",
            loading: "Загрузка...",
            months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", 
                    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
            noData: "Нет данных для отображения",
            printChart: "Напечатать график",
            resetZoom: "Сбросить масштаб",
            resetZoomTitle: "Сбросить масштаб 1:1",
            shortMonths: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", 
                        "Июл", "Август", "Сен", "Окт", "Ноя", "Дек"],
            thousandsSep: " ",
            weekdays: ["Воскресенье", "Понедельник", "Вторник", "Среда", 
                    "Четверг", "Пятница", "Суббота"]
        },
                chart: {
            type: 'line',
            zoomType: 'x',
            panning: true,
            panKey: 'shift',
            events: {
                load: function() {
                    const chart = this;
                    const initialDays = 30; // Показываем 60 дней изначально
                    
                    // Находим индекс сегодняшней даты
                    const today = moment().format('DD.MM.YY');
                    const todayIndex = categories.indexOf(today);
                    
                    // Устанавливаем начальный видимый диапазон (30 дней до сегодня и 30 после)
                    const startIndex = Math.max(0, todayIndex);
                    const endIndex = Math.min(categories.length - 1, todayIndex + 30);
                    
                    chart.xAxis[0].setExtremes(startIndex, endIndex);
                    vm.attachChartWheelPan(chart, categories);
                }
            }
        },
        title: {
            text: 'График загрузки ресурсов на ' + currentYear + (endDate.year() > currentYear ? '-' + nextYear : '')
        },
        subtitle: {
            text: 'Доступные и занятые человеко-дни по дням'
        },
        xAxis: {
            categories: categories,
            crosshair: true,
            labels: {
                rotation: -45,
                formatter: function() {
                    // Группируем подписи по месяцам для лучшей читаемости
                    const date = moment(this.value, 'DD.MM.YY');
                    const day = date.date();
                    const month = date.month();
                    // Для остальных дней показываем только число
                    return date.format('DD.MM.YY');
                }
            },
            //minRange: 7 // Минимальный диапазон - неделя
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Человеко-дни'
            },
        },
        tooltip: {
            shared: true,
            formatter: function() {
                const pointIndex = this.points[0].point.index;
                const date = moment(this.points[0].series.xAxis.categories[pointIndex], 'DD.MM.YY');
                let s = '<b>' + date.format('DD.MM.YYYY (dddd)') + '</b>';
                this.points.forEach(point => {
                    s += '<br/><span style="color:' + point.color + '">\u25CF</span> ' + 
                        point.series.name + ': ' + point.y.toFixed(1);
                });
                const rawD = rawDemandByIndex[pointIndex];
                if (rawD !== undefined) {
                    const avail = availableData[pointIndex];
                    if (rawD > avail + 0.05) {
                        s += '<br/><span style="color:#ff9800">\u25CF</span> Перегруз: потребность ' + rawD.toFixed(1) + ' ЧД при ёмкости ' + avail.toFixed(1) + ' ЧД';
                    }
                }
                return s;
            }
        },
        plotOptions: {
            line: {
                marker: {
                    enabled: false, // Отключаем маркеры для большого количества точек
                    radius: 2
                },
                lineWidth: 1
            },
            series: {
                cursor: 'pointer',
                point: {
                    events: {
                        click: function() {
                            // Обработчик клика по точке
                        }
                    }
                }
            }
        },
        series: [{
            name: 'Доступные ЧД',
            data: availableData,
            color: '#36a2eb',
            lineWidth: 2
        }, {
            name: 'Занятые ЧД',
            data: occupiedData,
            color: '#ff6384',
            lineWidth: 2
        }, {
            name: 'Свободные ЧД',
            data: freeData,
            color: '#4bc0c0',
            lineWidth: 2
        }],
        legend: {
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'bottom'
        },
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500
                },
                chartOptions: {
                    legend: {
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom'
                    },
                    xAxis: {
                        labels: {
                            rotation: -45
                        }
                    }
                }
            }]
        }
    });
},
async fixOverload() {
    const summary = await this.getLoadSummary(moment(), moment().add(60, 'days'));
    
    if (summary.totalOverload > 0) {
        this.showSuccess(`Автоматически исправляем перегрузку: ${summary.totalOverload.toFixed(1)} ЧД`);
        await this.optimizeWorkloadDistribution();
    }
},
async checkSystemOverload() {
    const thirtyDaysAgo = moment().subtract(30, 'days');
    const thirtyDaysAhead = moment().add(30, 'days');
    
    const summary = await this.getLoadSummary(thirtyDaysAgo, thirtyDaysAhead);
    
    if (summary.totalOverload > 0) {
        this.showError(`Обнаружена перегрузка: ${summary.totalOverload.toFixed(1)} ЧД в ${summary.overloadDays} днях`);
        return true;
    }
    
    return false;
},
async getLoadSummary(startDate, endDate) {
    const summary = {
        totalAvailable: 0,
        totalOccupied: 0,
        totalFree: 0,
        overloadDays: 0,
        totalOverload: 0,
        days: []
    };
    
    const currentDate = moment(startDate);
    const end = moment(endDate);
    
    while (currentDate.isSameOrBefore(end)) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        
        if (!this.isWeekend(dateStr)) {
            const available = this.getAvailableManDays(dateStr);
            const occupied = await this.getOccupiedManDays(dateStr);
            const free = Math.max(0, available - occupied);
            const overload = Math.max(0, occupied - available);
            
            summary.days.push({
                date: dateStr,
                available,
                occupied,
                free,
                overload,
                isOverloaded: overload > 0
            });
            
            summary.totalAvailable += available;
            summary.totalOccupied += occupied;
            summary.totalFree += free;
            
            if (overload > 0) {
                summary.overloadDays++;
                summary.totalOverload += overload;
            }
        }
        
        currentDate.add(1, 'day');
    }
    
    return summary;
},
async normalizeWorkload() {
    try {
        const startDate = moment().subtract(APP_CONFIG.CHART_MONTHS_LOOKBACK, 'month');
        const endDate = moment().add(APP_CONFIG.OPTIMIZATION_MONTHS_AHEAD, 'months');
        
        const daysToNormalize = [];
        let currentDate = startDate.clone();
        
        // Собираем данные по всем дням
        while (currentDate.isSameOrBefore(endDate)) {
            const dateStr = currentDate.format('YYYY-MM-DD');
            
            if (!this.isWeekend(dateStr)) {
                const available = this.getAvailableManDays(dateStr);
                const occupied = await this.getOccupiedManDays(dateStr);
                const free = available - occupied;
                
                if (free < 0) {
                    daysToNormalize.push({
                        date: dateStr,
                        available: available,
                        occupied: occupied,
                        overload: -free, // Перегрузка (положительное число)
                        free: 0 // Принудительно устанавливаем free = 0
                    });
                }
            }
            
            currentDate.add(1, 'day');
        }
        
        // Обрабатываем дни с перегрузкой
        for (const overloadedDay of daysToNormalize) {
            // Находим ближайшие будущие дни с достаточной емкостью
            const futureDays = [];
            let futureDate = moment(overloadedDay.date).add(1, 'day');
            
            while (futureDate.isSameOrBefore(endDate) && overloadedDay.overload > 0) {
                const futureDateStr = futureDate.format('YYYY-MM-DD');
                
                if (!this.isWeekend(futureDateStr)) {
                    const futureAvailable = this.getAvailableManDays(futureDateStr);
                    const futureOccupied = await this.getOccupiedManDays(futureDateStr);
                    const futureFree = Math.max(0, futureAvailable - futureOccupied);
                    
                    if (futureFree > 0) {
                        futureDays.push({
                            date: futureDateStr,
                            free: futureFree,
                            available: futureAvailable,
                            occupied: futureOccupied
                        });
                    }
                }
                
                futureDate.add(1, 'day');
            }
            
            // Сортируем будущие дни по свободной емкости (по убыванию)
            futureDays.sort((a, b) => b.free - a.free);
            
            let remainingOverload = overloadedDay.overload;
            
            // Перераспределяем нагрузку на будущие дни
            for (const futureDay of futureDays) {
                if (remainingOverload <= 0) break;
                
                const loadToMove = Math.min(remainingOverload, futureDay.free);
                if (loadToMove > 0) {
                    // Здесь должна быть реальная логика перемещения задач между датами
                    console.log(`Перемещаем ${loadToMove.toFixed(1)} ЧД с ${overloadedDay.date} на ${futureDay.date}`);
                    
                    remainingOverload -= loadToMove;
                    futureDay.free -= loadToMove;
                }
            }
            
            // Если осталась нераспределенная нагрузка, логируем предупреждение
            if (remainingOverload > 0) {
                console.warn(`Не удалось распределить ${remainingOverload.toFixed(1)} ЧД перегрузки с ${overloadedDay.date}`);
            }
        }
        
    } catch (error) {
        console.error('Ошибка нормализации нагрузки:', error);
    }
},
                // Методы для работы с производственным календарем
                async loadProductionCalendar() {
                    this.loadingCalendar = true;
                    try {
                        const response = await fetch(`${ISDAYOFF_API_URL}?year=${this.currentYear}&delimeter=,`);
                        const csvData = await response.text();
                        
                        this.productionCalendar = [];
                        const lines = csvData.split(',');
                        
                        for (let month = 1; month <= 12; month++) {
                            for (let day = 1; day <= 31; day++) {
                                const dateStr = `${this.currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                const date = moment(dateStr);
                                if (date.isValid() && date.year() === this.currentYear) {
                                    const dayIndex = date.dayOfYear() - 1;
                                    if (dayIndex < lines.length) {
                                        const dayType = lines[dayIndex].trim();
                                        this.productionCalendar.push({
                                            date: dateStr,
                                            type: dayType === '1' ? 'weekend' : 'working',
                                            description: dayType === '1' ? 'Выходной/праздничный' : 'Рабочий день'
                                        });
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        this.showError('Ошибка загрузки производственного календаря: ' + error.message);
                    } finally {
                        this.loadingCalendar = false;
                    }
                },

                async refreshProductionCalendar() {
                    await this.loadProductionCalendar();
                },

                async applyCalendarToAll() {
                    this.applyingCalendar = true;
                    try {
                        for (const employee of this.employees) {
                            await this.applyCalendarToEmployee(employee);
                        }
                        await this.loadSchedule();
                        this.showSuccess('Производственный календарь применен ко всем сотрудникам');
                    } catch (error) {
                        this.showError('Ошибка применения календаря: ' + error.message);
                    } finally {
                        this.applyingCalendar = false;
                    }
                },

                async applyCalendarToEmployee(employee) {
                    try {
                        await this.apiCall(`${API_BASE}schedule.php`, {
                            method: 'DELETE',
                            body: JSON.stringify({
                                employee_id: employee.id,
                            })
                        });
                    } catch (error) {
                        throw error;
                    }
                },
                async loadOptimizedChartData() {
                    this.loading = true;
                    try {
                        const currentYear = moment().year();
                        const nextYear = currentYear + 1;
                        
                        // Предварительная загрузка всех необходимых данных
                        await Promise.all([
                            this.loadProductionCalendarForYear(currentYear),
                            this.loadProductionCalendarForYear(nextYear),
                            this.loadEmployees(),
                            this.loadDeals(),
                            this.loadSchedule()
                        ]);
                        
                        // Обновляем график
                        await this.updateChart();
                        
                    } catch (error) {
                        this.showError('Ошибка загрузки данных графика: ' + error.message);
                    } finally {
                        this.loading = false;
                    }
                },
                /** ID сделки из placement (вкладка в карточке); иначе null */
                getPlacementDealId() {
                    try {
                        if (typeof window.BX24 !== 'undefined' && window.BX24.placement && typeof window.BX24.placement.info === 'function') {
                            const info = window.BX24.placement.info();
                            const id = info && info.options && info.options.ID;
                            if (id != null && id !== '') return String(id);
                        }
                    } catch (e) { /* не в контексте placement */ }
                    return null;
                },
                async updateCurrentDealFields(fields) {
                    const dealId = this.getPlacementDealId();
                    if (!dealId) {
                        console.warn('ID текущей сделки не определён');
                        return false;
                    }
                    try {
                        await this.bitrixUpdateDeal(dealId, fields);
                        return true;
                    } catch (error) {
                        console.error('Ошибка обновления сделки:', error);
                        return false;
                    }
                },
                async addCurrentDealComment(comment) {
                    const dealId = this.getPlacementDealId();
                    if (!dealId) return false;
                    try {
                        await this.bitrixAddDealComment(dealId, comment);
                        return true;
                    } catch (error) {
                        console.error('Ошибка добавления комментария:', error);
                        return false;
                    }
                },
async redistributeOverload() {
    this.loading = true;
    try {
        const placementDealId = this.getPlacementDealId();
        if (!placementDealId) {
            console.warn('Перераспределение перегрузки пропущено: не удалось определить текущую сделку');
            return;
        }
        const startDate = moment();
        const endDate = moment().add(APP_CONFIG.OVERLOAD_MONTHS_AHEAD, 'months');
        const maxIterations = APP_CONFIG.REDISTRIBUTE_MAX_ITERATIONS;
        let iteration = 0;
        let hasOverload = true;
        
        console.log('=== Начинаем цикличное перераспределение перегрузок ===', `(только сделка ${placementDealId})`);
        
        // Цикл продолжается пока есть перегрузки и не превышен лимит итераций
        while (hasOverload && iteration < maxIterations) {
            iteration++;
            console.log(`\n--- Итерация ${iteration} ---`);
            
            // Инвалидируем кэш перед каждой итерацией
            this.invalidateCache();
            
            // Пересчитываем занятость для всего периода
            await this.preCalculateOccupancyForRange(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
            
            let currentDate = startDate.clone();
            const overloadedDays = [];
            
            // Собираем все дни с перегрузкой
            while (currentDate.isSameOrBefore(endDate)) {
                const dateStr = currentDate.format('YYYY-MM-DD');
                
                if (!this.isWeekend(dateStr)) {
                    const available = this.getAvailableManDays(dateStr);
                    const occupied = this.occupancyCache[dateStr] ?? await this.getOccupiedManDays(dateStr);
                    const rawOccupied = this.getRawOccupiedManDays(dateStr);
                    // Перегруз: фактическая потребность ЧД больше мощности дня (occupied из getOccupied — усечённый)
                    if (rawOccupied > available) {
                        overloadedDays.push({
                            date: dateStr,
                            overload: rawOccupied - available,
                            available: available,
                            occupied: occupied,
                            rawOccupied: rawOccupied,
                            dateObj: currentDate.clone()
                        });
                    }
                }
                
                currentDate.add(1, 'day');
            }
            
            // Сортируем по дате (от ранних к поздним)
            overloadedDays.sort((a, b) => a.dateObj - b.dateObj);

            // Обрабатываем только дни, где участвует текущая сделка (остальные учтены в расчёте ЧД, но не перераспределяем)
            const overloadedDaysToProcess = overloadedDays.filter(od =>
                this.deals.some(deal => {
                    if (String(deal.ID || deal.id) !== placementDealId) return false;
                    return this.isDealActiveOnDate(deal, od.date);
                })
            );

            if (overloadedDaysToProcess.length === 0) {
                hasOverload = false;
                console.log(`Перегрузок для текущей сделки больше нет. Завершаем на итерации ${iteration}`);
                break;
            }
            
            console.log(`Найдено ${overloadedDaysToProcess.length} дней с перегрузкой на итерации ${iteration} (только дни текущей сделки)`);
            
            for (const overloadedDay of overloadedDaysToProcess) {
                console.log(`Обработка перегрузки ${overloadedDay.overload.toFixed(1)} ЧД на ${overloadedDay.date}`);
                
                // Находим только текущую сделку, если она создает нагрузку в этот день
                const dealsOnDay = this.deals.filter(deal =>
                    String(deal.ID || deal.id) === placementDealId &&
                    this.isDealActiveOnDate(deal, overloadedDay.date)
                );
                
                if (dealsOnDay.length === 0) {
                    console.log(`На дате ${overloadedDay.date} нет сделок`);
                    continue;
                }

                const targetDeal = dealsOnDay[0];
                const dealsToExtend = [targetDeal];
                const targetDaily = this.getDealDailyManDayLoad(targetDeal);
                const totalOverload = Math.min(overloadedDay.overload, targetDaily);
                console.log(`Общая перегрузка на день ${overloadedDay.date}: ${overloadedDay.overload.toFixed(2)} ЧД; переносим только долю текущей сделки: ${totalOverload.toFixed(2)} ЧД (дневная нагрузка сделки ${targetDaily.toFixed(2)} ЧД)`);
                if (totalOverload <= 0) {
                    console.log(`Пропуск: нечего переносить по текущей сделке на ${overloadedDay.date}`);
                    continue;
                }
                
                // Сначала — слоты внутри текущих сроков (до самого раннего дня окончания среди продлеваемых сделок), затем при необходимости — за предел срока (продление).
                let searchDate = overloadedDay.dateObj.clone().add(1, 'day');
                let remainingOverload = totalOverload;
                let totalDaysExtended = 0;
                const maxExtension = APP_CONFIG.REDISTRIBUTE_MAX_EXTENSION_DAYS;
                let minDealEnd = null;
                for (const d of dealsToExtend) {
                    const e = moment(d[CRM_FIELDS.DEAL_END]).startOf('day');
                    if (!minDealEnd || e.isBefore(minDealEnd, 'day')) minDealEnd = e.clone();
                }

                const absorbOneDay = async () => {
                    const searchDateStr = searchDate.format('YYYY-MM-DD');
                    if (!this.isWeekend(searchDateStr)) {
                        const available = this.getAvailableManDays(searchDateStr);
                        let occupied = this.occupancyCache[searchDateStr];
                        if (occupied === undefined) {
                            occupied = await this.getOccupiedManDays(searchDateStr);
                            this.occupancyCache[searchDateStr] = occupied;
                        }
                        const freeSpace = Math.max(0, available - occupied);
                        if (freeSpace > 0) {
                            const canFit = Math.min(remainingOverload, freeSpace);
                            console.log(`  День ${searchDateStr}: вместимость = ${available.toFixed(1)} ЧД, занято = ${occupied.toFixed(1)} ЧД, свободно = ${freeSpace.toFixed(1)} ЧД, помещаем = ${canFit.toFixed(2)} ЧД`);
                            remainingOverload -= canFit;
                            totalDaysExtended++;
                            this.occupancyCache[searchDateStr] = occupied + canFit;
                            console.log(`  Обновлённая занятость ${searchDateStr}: ${this.occupancyCache[searchDateStr].toFixed(1)} ЧД`);
                        } else {
                            console.log(`  День ${searchDateStr}: нет свободного места (свободно = ${freeSpace.toFixed(1)} ЧД)`);
                        }
                    }
                    searchDate.add(1, 'day');
                };

                console.log(`Ищем место для ${remainingOverload.toFixed(2)} ЧД начиная с ${searchDate.format('YYYY-MM-DD')}; фаза 1 — внутри сроков до ${minDealEnd ? minDealEnd.format('YYYY-MM-DD') : '—'}`);

                let phase1Steps = 0;
                while (remainingOverload > 0 && minDealEnd && searchDate.isSameOrBefore(minDealEnd, 'day') && phase1Steps < maxExtension) {
                    await absorbOneDay();
                    phase1Steps++;
                }

                let phase2Steps = 0;
                while (remainingOverload > 0 && phase2Steps < maxExtension) {
                    await absorbOneDay();
                    phase2Steps++;
                }

                if (totalDaysExtended > 0) {
                    const proposedEnd = searchDate.clone().subtract(1, 'day').startOf('day');
                    console.log(`Перераспределение: предлагаемая дата окончания (по поиску) ${proposedEnd.format('YYYY-MM-DD')}, шагов с поглощением ${totalDaysExtended}`);

                    for (const deal of dealsToExtend) {
                        const dealId = deal.ID || deal.id;
                        const dealEnd = moment(deal[CRM_FIELDS.DEAL_END]).startOf('day');
                        const newEndMoment = moment.max(dealEnd, proposedEnd);
                        if (!newEndMoment.isAfter(dealEnd, 'day')) {
                            console.log(`Сделка ${dealId}: дата окончания ${dealEnd.format('YYYY-MM-DD')} не сдвигается (перегруз размещён внутри срока)`);
                            continue;
                        }
                        const newEndDateStr = newEndMoment.format('YYYY-MM-DD');
                        const oldEndDateStr = dealEnd.format('YYYY-MM-DD');
                        console.log(`Сделка ${dealId}: продление с ${dealEnd.format('YYYY-MM-DD')} до ${newEndDateStr} (рабочих дней в периоде не уменьшаем)`);

                        let dealUpdated = false;
                        try {
                            await this.bitrixUpdateDeal(dealId, {
                                [CRM_FIELDS.DEAL_END]: newEndDateStr,
                            });
                            dealUpdated = true;
                            deal[CRM_FIELDS.DEAL_END] = newEndDateStr;
                            console.log(`Сделка ${dealId} продлена до ${newEndDateStr}`);
                        } catch (error) {
                            console.error('Ошибка обновления сделки:', error);
                        }

                        if (dealUpdated) {
                            const commentText = `Перераспределение нагрузки: дата окончания изменена с ${oldEndDateStr} на ${newEndDateStr}.`;
                            try {
                                await this.bitrixAddDealComment(dealId, commentText);
                                console.log(`Комментарий о перераспределении добавлен в сделку ${dealId}`);
                            } catch (error) {
                                console.error('Ошибка добавления комментария о перераспределении:', error);
                            }
                        }
                    }
                } else {
                    console.log(`Не удалось найти место для перераспределения перегрузки`);
                }
            }
            
            // После обработки всех перегруженных дней перезагружаем данные сделок
            await this.loadDeals();
        }
        
        if (iteration >= maxIterations) {
            console.log(`Достигнут лимит итераций (${maxIterations}). Перераспределение завершено.`);
        }
        
        // Финальная перезагрузка данных
        this.invalidateCache();
        await this.loadDeals();
        await this.updateChart();
        
        this.showSuccess(`Перегрузка по текущей сделке распределена (итераций: ${iteration})`);
        
    } catch (error) {
        console.error('Ошибка при распределении перегрузки:', error);
        this.showError('Ошибка распределения нагрузки: ' + error.message);
    } finally {
        this.loading = false;
    }
},

    async init() {

                    try {
                        await new Promise(resolve => setTimeout(resolve, 200));

                        const useSdk = await this.ensureBitrixSdkReady();
                        console.log(useSdk
                            ? 'Bitrix: используется window.BX24 SDK'
                            : (this.isBitrixWebhookConfigured()
                                ? 'Bitrix: используется вебхук (window.BX24 недоступен)'
                                : 'Bitrix: нет ни SDK, ни вебхука'));

                        // 1. Получаем информацию о пользователе
                        if (useSdk || this.isBitrixWebhookConfigured()) {
                            try {
                                const user = await this.bitrixCall('user.current');
                                const isWebhookAdmin = user.IS_ADMIN === 'Y' || user.IS_ADMIN === true;
                                this.isAdmin = user.ID == APP_CONFIG.ADMIN_USER_ID
                                    || (useSdk && typeof window.BX24.isAdmin === 'function' && window.BX24.isAdmin())
                                    || isWebhookAdmin;
                            } catch (userError) {
                                console.warn('Не удалось определить пользователя Bitrix24:', userError);
                                this.isAdmin = false;
                            }
                        }
                        
                        // 2. Показываем индикатор загрузки
                        this.loading = true;
                        
                        // 3. Загружаем производственный календарь для текущего года
                        await this.loadProductionCalendarForYear(this.currentYear);
                        
                        // 4. Загружаем основные данные последовательно
                        await this.loadEmployees();
                        await this.loadDeals();
                        await this.loadSchedule();
                        
                        // 5. Инициализируем кэш после загрузки данных
                        this.initCache();
                        
                        // 6. Обновляем таблицу дат
                        this.updateTableDates();
                        
                        // 7. Загружаем оптимизированные данные для графика
                        await this.loadOptimizedChartData();
                        await this.redistributeOverload();
                        console.log('Все данные успешно загружены');
                        
                    } catch (error) {
                        console.error('Ошибка при загрузке данных:', error);
                        this.showError('Ошибка загрузки данных: ' + error.message);
                    } finally {
                        // 8. Скрываем индикатор загрузки независимо от результата
                        this.loading = false;
                    }
                
    },
  },
});
