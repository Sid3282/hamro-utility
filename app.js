// ===== data from data.js =====

const {
  nepaliMonths,
  nepaliWeekdaysFull,
  englishWeekdaysUpper,
  adMonthsShort,
  bsData,
  startDays,
  holidaysByYear,
} = window.DATA;

/* helpers */
const nepDigits = "०१२३४५६७८९";
const toNepNum = (num) => String(num).replace(/\d/g, d => nepDigits[d]);
const pad2 = (n) => String(n).padStart(2, "0");

/* DOM elements */
const yearSelector = document.getElementById("year-selector");
const monthSelector = document.getElementById("month-selector");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
const todayBtn = document.getElementById("today-btn");
const periodLabelEl = document.getElementById("period-label");
const tableEl = document.getElementById("calendar-table");
const upcomingList = document.getElementById("upcoming-list");
const headerTodayEl = document.getElementById("header-today");
const pageTitleEl = document.getElementById("page-title");
const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const navMenu = document.getElementById("nav-menu");

// Notes elements
const notesList = document.getElementById("notes-list");
const notesEmpty = document.getElementById("notes-empty");
const noteInput = document.getElementById("note-input");
const saveNoteBtn = document.getElementById("save-note");
const cancelNoteBtn = document.getElementById("cancel-note");
const editNoteBtn = document.getElementById("edit-note");
const deleteNoteBtn = document.getElementById("delete-note");
const noteFormContainer = document.getElementById("note-form-container");
const dmNoteLi = document.getElementById("dm-note-li");
const dmNote = document.getElementById("dm-note");
const dmSeasonLi = document.getElementById("dm-season-li");
const dmSeason = document.getElementById("dm-season");

// Date Converter elements
const converterToggleBtns = document.querySelectorAll('.toggle-btn');
const bsToAdForm = document.getElementById('bs-to-ad-form');
const adToBsForm = document.getElementById('ad-to-bs-form');
const convertBsToAdBtn = document.getElementById('convert-bs-to-ad-btn');
const convertAdToBsBtn = document.getElementById('convert-ad-to-bs-btn');
const bsToAdResult = document.getElementById('bs-to-ad-result');
const adToBsResult = document.getElementById('ad-to-bs-result');

// Currency Converter elements
const currencyAmountInput = document.getElementById('currency-amount');
const fromCurrencySelect = document.getElementById('from-currency');
const toCurrencySelect = document.getElementById('to-currency');
const convertCurrencyBtn = document.getElementById('convert-currency-btn');
const currencyResult = document.getElementById('currency-result');
const currencyUpdateTime = document.getElementById('currency-update-time');

// Delete Confirmation Modal elements
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
const deleteCancelBtn = document.getElementById('delete-cancel-btn');

/* Epoch & conversions */
const EPOCH_AD = { y: 1943, m: 4, d: 14 };
const EPOCH_WEEKDAY_SUN0 = 3;

function isLeapAD(y) {
  return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
}

function adMonthLens(y) {
  return [31, isLeapAD(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
}

function adMonthLensAt(y, m) {
  return adMonthLens(y)[m - 1];
}

function getAvailableYears() {
  return Object.keys(bsData).map(Number).sort((a, b) => a - b);
}

function hasYear(y) {
  return !!bsData[y];
}

function bsMonthDays(year, month) {
  return bsData[year][month];
}

function getStartDay(year, month) {
  return startDays[year]?.[month] ?? 0;
}

function bsOffsetFromEpoch(year, month, day) {
  let offset = 0;
  for (const y of getAvailableYears()) {
    if (y >= year) break;
    offset += bsData[y].reduce((a, b) => a + b, 0);
  }
  for (let i = 0; i < month; i++) offset += bsData[year][i];
  return offset + (day - 1);
}

function offsetToADParts(offset) {
  let y = EPOCH_AD.y,
    m = EPOCH_AD.m,
    d = EPOCH_AD.d,
    rem = offset;
  while (rem > 0) {
    const ml = adMonthLensAt(y, m),
      left = ml - d;
    if (rem <= left) {
      d += rem;
      rem = 0;
    } else {
      rem -= (left + 1);
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }
  const w = (EPOCH_WEEKDAY_SUN0 + offset) % 7;
  return {
    y,
    m,
    d,
    w
  };
}

function bsToAdParts(y, m, d) {
  if (!hasYear(y)) return null;
  return offsetToADParts(bsOffsetFromEpoch(y, m, d));
}

function adToBs(adDate) {
  const ms = 86400000,
    t = Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate());
  const e = Date.UTC(EPOCH_AD.y, EPOCH_AD.m - 1, EPOCH_AD.d);
  let delta = Math.floor((t - e) / ms);
  
  if (delta < 0) return {
    year: getAvailableYears()[0],
    month: 0,
    day: 1,
    outOfRange: true
  };
  
  const years = getAvailableYears();
  let y = years[0],
    m = 0;
  
  outer: for (const Y of years) {
    for (let mi = 0; mi < 12; mi++) {
      const len = bsData[Y][mi];
      if (delta < len) {
        y = Y;
        m = mi;
        break outer;
      }
      delta -= len;
    }
  }
  
  const d = delta + 1;
  const last = years[years.length - 1];
  return {
    year: y,
    month: m,
    day: d,
    outOfRange: (y === last && d > bsData[last][m])
  };
}

/* Date Converter Functions */
function validateBSDate(bsYear, bsMonth, bsDay) {
  if (!hasYear(bsYear)) {
    return { error: "Invalid BS year. Must be between 2000-2099" };
  }
  
  if (bsMonth < 0 || bsMonth > 11) {
    return { error: "Invalid BS month. Must be 0-11" };
  }
  
  const daysInMonth = bsMonthDays(bsYear, bsMonth);
  if (bsDay < 1 || bsDay > daysInMonth) {
    return { error: `Invalid BS day. Must be 1-${daysInMonth} for ${nepaliMonths[bsMonth]}` };
  }
  
  return { valid: true };
}

function validateADDate(adYear, adMonth, adDay) {
  const adDate = new Date(adYear, adMonth - 1, adDay);
  
  if (isNaN(adDate.getTime())) {
    return { error: "Invalid AD date" };
  }
  
  const minAD = new Date(1943, 3, 14);
  const maxAD = new Date(2042, 3, 13);
  
  if (adDate < minAD || adDate > maxAD) {
    return { error: "Date must be between 14 April 1943 and 13 April 2042" };
  }
  
  return { valid: true };
}

function bsToAdConverter(bsYear, bsMonth, bsDay) {
  const validation = validateBSDate(bsYear, bsMonth, bsDay);
  if (validation.error) return validation;
  
  const adParts = bsToAdParts(bsYear, bsMonth, bsDay);
  if (!adParts) {
    return { error: "Conversion failed" };
  }
  
  const weekday = nepaliWeekdaysFull[adParts.w];
  const adDate = new Date(adParts.y, adParts.m - 1, adParts.d);
  const formattedDate = adDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  return {
    success: true,
    bsYear,
    bsMonth,
    bsDay,
    adYear: adParts.y,
    adMonth: adParts.m,
    adDay: adParts.d,
    weekday: weekday,
    formattedDate: formattedDate,
    isSaturday: weekday === 'शनिबार'
  };
}

function adToBsConverter(adYear, adMonth, adDay) {
  const validation = validateADDate(adYear, adMonth, adDay);
  if (validation.error) return validation;
  
  const adDate = new Date(adYear, adMonth - 1, adDay);
  const bsResult = adToBs(adDate);
  
  if (bsResult.outOfRange) {
    return { error: "Date is out of conversion range" };
  }
  
  const weekdayNum = adDate.getDay();
  const weekday = nepaliWeekdaysFull[weekdayNum];
  
  return {
    success: true,
    bsResult: bsResult,
    weekday: weekday,
    isSaturday: weekday === 'शनिबार'
  };
}

/* Season Function */
function getSeasonForMonth(bsMonth) {
  const seasons = [
    { name: "बसन्त (Spring)", months: [11, 0] }, // Chaitra, Baisakh
    { name: "ग्रीष्म (Summer)", months: [1, 2] }, // Jestha, Ashadh
    { name: "वर्षा (Monsoon)", months: [3, 4] }, // Shrawan, Bhadra
    { name: "शरद (Autumn)", months: [5, 6] }, // Ashwin, Kartik
    { name: "हेमन्त (Pre-Winter)", months: [7, 8] }, // Mangsir, Poush
    { name: "शिशिर (Winter)", months: [9, 10] }, // Magh, Falgun
  ];
  
  for (const season of seasons) {
    if (season.months.includes(bsMonth)) {
      return season.name;
    }
  }
  
  return "";
}

/* tithi approximation */
const SYNODIC = 29.530588853;
const TITHI_NAMES = {
  shukla: ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "पूर्णिमा"],
  krishna: ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "औँसी"]
};

function daysSince2000(y, m, d) {
  const dateUTC = Date.UTC(y, m - 1, d),
    baseUTC = Date.UTC(2000, 0, 1);
  return (dateUTC - baseUTC) / 86400000;
}

function lunarAgeDays(y, m, d) {
  const D = daysSince2000(y, m, d) - 5.097;
  let a = D % SYNODIC;
  if (a < 0) a += SYNODIC;
  return a;
}

function tithiForAD(y, m, d) {
  const age = lunarAgeDays(y, m, d);
  const t = Math.floor(age / (SYNODIC / 30)) + 1;
  return t <= 15 ? `शुक्ल ${TITHI_NAMES.shukla[t-1]}` : `कृष्ण ${TITHI_NAMES.krishna[t-16]}`;
}

/* Notes Functionality */
let notes = JSON.parse(localStorage.getItem('np_notes') || '{}');
let currentNoteDate = null;
let pendingDeleteDateKey = null;

function saveNotes() {
  localStorage.setItem('np_notes', JSON.stringify(notes));
}

function getNote(dateKey) {
  return notes[dateKey] || null;
}

function saveNote(dateKey, noteText) {
  if (noteText.trim()) {
    notes[dateKey] = {
      text: noteText.trim(),
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
  } else {
    delete notes[dateKey];
  }
  saveNotes();
  updateCalendarNotes();
  renderNotesList();
}

function deleteNote(dateKey) {
  if (notes[dateKey]) {
    delete notes[dateKey];
    saveNotes();
    updateCalendarNotes();
    renderNotesList();
    return true;
  }
  return false;
}

function generateDateKey(year, month, day) {
  return `${year}-${month}-${day}`;
}

function updateCalendarNotes() {
  const cells = tableEl.querySelectorAll('td:not(.empty)');
  cells.forEach(cell => {
    const bsDay = cell.querySelector('.bs-day')?.textContent;
    if (bsDay) {
      const dayVal = parseInt(bsDay.replace(/[०१२३४५६७८९]/g, d => nepDigits.indexOf(d)));
      const year = parseInt(yearSelector.value);
      const month = parseInt(monthSelector.value);
      const dateKey = generateDateKey(year, month, dayVal);
      
      if (notes[dateKey]) {
        cell.classList.add('has-note');
      } else {
        cell.classList.remove('has-note');
      }
    }
  });
}

function renderNotesList() {
  notesList.innerHTML = '';
  
  const noteEntries = Object.entries(notes);
  
  if (noteEntries.length === 0) {
    notesEmpty.style.display = 'block';
    notesList.style.display = 'none';
    return;
  }
  
  notesEmpty.style.display = 'none';
  notesList.style.display = 'grid';
  
  noteEntries.sort((a, b) => {
    const dateA = new Date(b[1].created || 0);
    const dateB = new Date(a[1].created || 0);
    return dateA - dateB;
  });
  
  noteEntries.slice(0, 5).forEach(([dateKey, note]) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const monthName = nepaliMonths[month];
    const adParts = bsToAdParts(year, month, day);
    const weekday = adParts ? nepaliWeekdaysFull[adParts.w] : '';
    const isSaturday = weekday === 'शनिबार';
    
    const li = document.createElement('li');
    li.className = 'note-item';
    li.dataset.dateKey = dateKey;
    
    li.innerHTML = `
      <div class="note-item-header">
        <div class="note-date ${isSaturday ? 'saturday' : ''}">${monthName} ${toNepNum(day)}, ${toNepNum(year)}</div>
        <div class="note-actions-sidebar">
          <button class="note-btn-sidebar edit-note-sidebar" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="note-btn-sidebar delete-note-sidebar" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="note-content">${note.text}</div>
    `;
    
    li.querySelector('.edit-note-sidebar').addEventListener('click', (e) => {
      e.stopPropagation();
      openNoteEditor(dateKey, year, month, day);
    });
    
    li.querySelector('.delete-note-sidebar').addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirmation(dateKey);
    });
    
    li.addEventListener('click', () => {
      openDayModalForDate(year, month, day);
    });
    
    notesList.appendChild(li);
  });
}

/* Delete Confirmation Modal Functions */
function showDeleteConfirmation(dateKey) {
  pendingDeleteDateKey = dateKey;
  deleteConfirmModal.classList.add('show');
  deleteConfirmModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function hideDeleteConfirmation() {
  deleteConfirmModal.classList.remove('show');
  deleteConfirmModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  pendingDeleteDateKey = null;
}

function confirmDelete() {
  if (pendingDeleteDateKey) {
    deleteNote(pendingDeleteDateKey);
    if (currentNoteDate === pendingDeleteDateKey) {
      dmNoteLi.style.display = 'none';
      noteFormContainer.style.display = 'block';
      noteInput.value = '';
      currentNoteDate = null;
    }
    hideDeleteConfirmation();
  }
}

/* Calendar grid generation */
function buildHeaderRow() {
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  
  nepaliWeekdaysFull.forEach((np, i) => {
    const th = document.createElement("th");
    if (i === 6) th.className = "sat";
    
    th.innerHTML = `
      <div class="th-wrap">
        <div class="th-nep">${np}</div>
        <div class="th-en">${englishWeekdaysUpper[i]}</div>
      </div>
    `;
    tr.appendChild(th);
  });
  
  thead.appendChild(tr);
  return thead;
}

function getADMonthSpanWithYear(month, year) {
  const s = bsToAdParts(year, month, 1);
  const e = bsToAdParts(year, month, bsMonthDays(year, month));
  const span = (adMonthsShort[s.m - 1] === adMonthsShort[e.m - 1]) ?
    adMonthsShort[s.m - 1] : 
    `${adMonthsShort[s.m-1]}/${adMonthsShort[e.m-1]}`;
  return `${nepaliMonths[month]} ${toNepNum(year)} | ${span} ${e.y}`;
}

function generateCalendar(month, year, todayBs) {
  while (tableEl.firstChild) {
    tableEl.firstChild.remove();
  }
  
  tableEl.appendChild(buildHeaderRow());
  
  const tbody = document.createElement("tbody");
  tableEl.appendChild(tbody);
  
  const dim = bsMonthDays(year, month);
  const start = getStartDay(year, month);
  const yearHolidays = holidaysByYear[year] || [];
  
  const getHolidayInfo = (m, d) => {
    const items = yearHolidays.filter(h => h.month === m && h.day === d);
    return {
      names: items.map(i => i.name),
      anyRed: items.some(i => i.red)
    };
  };
  
  let date = 1;
  
  for (let row = 0; row < 6; row++) {
    const tr = document.createElement("tr");
    
    for (let col = 0; col < 7; col++) {
      const td = document.createElement("td");
      
      if (row === 0 && col < start) {
        td.className = "empty";
        td.setAttribute("aria-hidden", "true");
        tr.appendChild(td);
        continue;
      }
      
      if (date > dim) {
        td.className = "empty";
        td.setAttribute("aria-hidden", "true");
        tr.appendChild(td);
        continue;
      }
      
      const dayVal = date;
      const isToday = todayBs && 
                     (todayBs.year === year && 
                      todayBs.month === month && 
                      todayBs.day === dayVal) && 
                     !todayBs.outOfRange;
      
      const holiday = getHolidayInfo(month, dayVal);
      const ad = bsToAdParts(year, month, dayVal);
      const adLabel = `${adMonthsShort[ad.m-1]} ${ad.d}`;
      const festival = holiday.names.join(" | ");
      const tithi = tithiForAD(ad.y, ad.m, ad.d);
      const dateKey = generateDateKey(year, month, dayVal);
      const hasNote = notes[dateKey];
      
      const classes = [];
      if (col === 6) classes.push("is-sat");
      if (isToday) classes.push("today");
      if (holiday.anyRed) classes.push("holiday-red");
      if (hasNote) classes.push("has-note");
      td.className = classes.join(" ");
      
      const isMobile = window.innerWidth < 768;
      
      td.innerHTML = `
        <div class="cell-top">
          <span class="bs-day">${toNepNum(dayVal)}</span>
        </div>
        ${!isMobile && festival ? `<span class="festival" title="${festival}">${festival}</span>` : ''}
        ${!isMobile ? `<span class="tithi">${tithi}</span>` : ''}
        <span class="ad-date">${adLabel}</span>
      `;
      
      td.addEventListener("click", () => {
        const adParts = bsToAdParts(year, month, dayVal);
        openDayModal({
          year,
          month,
          day: dayVal,
          adParts,
          weekday: nepaliWeekdaysFull[adParts.w],
          tithi: tithiForAD(adParts.y, adParts.m, adParts.d),
          festival: festival,
          note: hasNote ? notes[dateKey] : null
        });
      });
      
      td.addEventListener("touchstart", (e) => {
        e.currentTarget.classList.add("touch-active");
      }, { passive: true });
      
      td.addEventListener("touchend", (e) => {
        e.currentTarget.classList.remove("touch-active");
      }, { passive: true });
      
      tr.appendChild(td);
      date++;
    }
    
    tbody.appendChild(tr);
    if (date > dim) break;
  }
  
  periodLabelEl.textContent = getADMonthSpanWithYear(month, year);
  updateCalendarNotes();
}

/* Sunrise/Sunset functionality */
const SUN_LAT = 27.7172;
const SUN_LON = 85.3240;
const NPT_TZ = 'Asia/Kathmandu';
const timeFmt = new Intl.DateTimeFormat('en-NP', {
  timeZone: NPT_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function nptDateISO(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NPT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  
  const getPart = (type) => parts.find(x => x.type === type)?.value;
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

async function fetchSunTimesForISO(iso) {
  try {
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${SUN_LAT}&lng=${SUN_LON}&date=${iso}&formatted=0`
    );
    
    if (!res.ok) throw new Error('Network response was not ok');
    
    const data = await res.json();
    if (data.status !== 'OK') throw new Error('API error');
    
    return {
      sunrise: timeFmt.format(new Date(data.results.sunrise)),
      sunset: timeFmt.format(new Date(data.results.sunset))
    };
  } catch (error) {
    console.warn('Failed to fetch sun times:', error);
    return {
      sunrise: '--:--',
      sunset: '--:--'
    };
  }
}

async function loadSunTimesTodayAndSchedule() {
  try {
    const todayISO = nptDateISO();
    const times = await fetchSunTimesForISO(todayISO);
    
    const sunriseEl = document.getElementById('sunrise');
    const sunsetEl = document.getElementById('sunset');
    
    if (sunriseEl) sunriseEl.textContent = times.sunrise;
    if (sunsetEl) sunsetEl.textContent = times.sunset;
    
    const now = new Date();
    const nowNPT = new Date(now.toLocaleString('en-US', { timeZone: NPT_TZ }));
    const tomorrowNPT = new Date(nowNPT);
    tomorrowNPT.setDate(tomorrowNPT.getDate() + 1);
    tomorrowNPT.setHours(0, 0, 0, 0);
    
    const nextUpdateUTC = new Date(tomorrowNPT.toLocaleString('en-US', { timeZone: 'UTC' }));
    const delay = nextUpdateUTC.getTime() - now.getTime() + 10000;
    
    setTimeout(loadSunTimesTodayAndSchedule, Math.max(delay, 60000));
  } catch (error) {
    console.error('Error in sun times schedule:', error);
    setTimeout(loadSunTimesTodayAndSchedule, 300000);
  }
}

/* Currency Converter Functionality */
let forexRates = {};
let forexLastUpdated = null;

// Fetch current forex rates from NRB API
async function fetchCurrentForexRates() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const url = `https://www.nrb.org.np/api/forex/v1/rates?from=${today}&to=${today}&per_page=100&page=1`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const payload = data?.data?.payload ?? data?.data;
    
    if (!payload || !payload.length) {
      throw new Error('No forex data available');
    }
    
    const dayData = payload[0];
    const rates = dayData.rates || [];
    
    if (!rates.length) {
      throw new Error('No rates available');
    }
    
    // Process rates into a usable format
    const processedRates = {};
    
    rates.forEach(rate => {
      const currencyCode = rate.currency?.iso3;
      if (currencyCode) {
        const unit = parseInt(rate.currency?.unit) || 1;
        const buy = parseFloat(rate.buy) || 0;
        const sell = parseFloat(rate.sell) || 0;
        
        processedRates[currencyCode] = {
          buy: buy / unit,
          sell: sell / unit,
          unit: unit,
          name: rate.currency?.name || currencyCode
        };
      }
    });
    
    // Add NPR rate (always 1:1)
    processedRates['NPR'] = {
      buy: 1,
      sell: 1,
      unit: 1,
      name: 'Nepalese Rupee'
    };
    
    forexRates = processedRates;
    forexLastUpdated = new Date();
    
    return processedRates;
    
  } catch (error) {
    console.error('Error fetching forex rates from NRB:', error);
    // Fallback to static rates if API fails
    const fallbackRates = {
      'USD': { buy: 133.20, sell: 133.80, unit: 1, name: 'US Dollar' },
      'EUR': { buy: 142.50, sell: 143.20, unit: 1, name: 'Euro' },
      'GBP': { buy: 168.30, sell: 169.00, unit: 1, name: 'British Pound' },
      'CAD': { buy: 97.50, sell: 98.00, unit: 1, name: 'Canadian Dollar' },
      'AUD': { buy: 87.80, sell: 88.30, unit: 1, name: 'Australian Dollar' },
      'CHF': { buy: 148.20, sell: 148.90, unit: 1, name: 'Swiss Franc' },
      'JPY': { buy: 0.88, sell: 0.89, unit: 100, name: 'Japanese Yen' },
      'CNY': { buy: 18.40, sell: 18.50, unit: 1, name: 'Chinese Yuan' },
      'INR': { buy: 1.60, sell: 1.61, unit: 100, name: 'Indian Rupee' },
      'NPR': { buy: 1, sell: 1, unit: 1, name: 'Nepalese Rupee' }
    };
    
    forexRates = fallbackRates;
    forexLastUpdated = new Date();
    return fallbackRates;
  }
}

// Initialize currency converter
function initCurrencyConverter() {
  currencyAmountInput.value = '1';
  fromCurrencySelect.value = 'USD';
  toCurrencySelect.value = 'NPR';
  
  loadCurrencyRates();
  
  convertCurrencyBtn.addEventListener('click', performCurrencyConversion);
  
  currencyAmountInput.addEventListener('input', function() {
    if (this.value && parseFloat(this.value) > 0) {
      performCurrencyConversion();
    }
  });
  
  fromCurrencySelect.addEventListener('change', performCurrencyConversion);
  toCurrencySelect.addEventListener('change', performCurrencyConversion);
}

// Load currency rates
async function loadCurrencyRates() {
  try {
    await fetchCurrentForexRates();
    
    if (forexLastUpdated) {
      const timeString = forexLastUpdated.toLocaleTimeString('en-NP', {
        timeZone: 'Asia/Kathmandu',
        hour: '2-digit',
        minute: '2-digit'
      });
      const dateString = forexLastUpdated.toLocaleDateString('en-NP', {
        timeZone: 'Asia/Kathmandu',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      currencyUpdateTime.textContent = `Rates updated: ${dateString} ${timeString}`;
    }
    
  } catch (error) {
    console.error('Failed to load currency rates:', error);
    currencyUpdateTime.textContent = 'Using fallback rates';
  }
}

// Perform currency conversion
function performCurrencyConversion() {
  const amount = parseFloat(currencyAmountInput.value);
  const fromCurrency = fromCurrencySelect.value;
  const toCurrency = toCurrencySelect.value;
  
  currencyResult.style.display = 'block';
  
  if (isNaN(amount) || amount <= 0) {
    currencyResult.className = 'converter-result error';
    currencyResult.innerHTML = '<span>Please enter a valid amount</span>';
    return;
  }
  
  if (!forexRates[fromCurrency] || !forexRates[toCurrency]) {
    currencyResult.className = 'converter-result error';
    currencyResult.innerHTML = `<span>Rate not available for ${fromCurrency} → ${toCurrency}</span>`;
    return;
  }
  
  try {
    let convertedAmount;
    let rateDetails;
    
    if (fromCurrency === 'NPR') {
      const toRate = forexRates[toCurrency];
      convertedAmount = amount / toRate.buy;
      rateDetails = `1 ${toCurrency} = ${toRate.buy.toFixed(2)} NPR`;
      
    } else if (toCurrency === 'NPR') {
      const fromRate = forexRates[fromCurrency];
      convertedAmount = amount * fromRate.buy;
      rateDetails = `1 ${fromCurrency} = ${fromRate.buy.toFixed(2)} NPR`;
      
    } else {
      const fromRate = forexRates[fromCurrency];
      const toRate = forexRates[toCurrency];
      
      const amountInNPR = amount * fromRate.buy;
      convertedAmount = amountInNPR / toRate.buy;
      rateDetails = `1 ${fromCurrency} = ${fromRate.buy.toFixed(2)} NPR`;
    }
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    const formattedResult = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(convertedAmount);
    
    currencyResult.className = 'converter-result success';
    currencyResult.innerHTML = `
      <div class="result-amount">${formattedResult} ${toCurrency}</div>
      <div class="result-details">${formattedAmount} ${fromCurrency} = ${formattedResult} ${toCurrency}</div>
    `;
    
  } catch (error) {
    console.error('Conversion error:', error);
    currencyResult.className = 'converter-result error';
    currencyResult.innerHTML = '<span>Conversion failed. Please try again.</span>';
  }
}

// Auto-refresh rates every 30 minutes
function startRateAutoRefresh() {
  setInterval(async () => {
    try {
      await fetchCurrentForexRates();
      performCurrencyConversion();
      
      const timeString = new Date().toLocaleTimeString('en-NP', {
        timeZone: 'Asia/Kathmandu',
        hour: '2-digit',
        minute: '2-digit'
      });
      currencyUpdateTime.textContent = `Rates updated: ${timeString}`;
    } catch (error) {
      console.log('Auto-refresh failed:', error);
    }
  }, 30 * 60 * 1000);
}

/* Modal functionality */
const modal = document.getElementById("day-modal");
const modalClose = document.getElementById("modal-close");
const elBs = document.getElementById("modal-title");
const elAd = document.getElementById("modal-ad");
const elSunR = document.getElementById("modal-sunrise");
const elSunS = document.getElementById("modal-sunset");
const elWeek = document.getElementById("dm-week");
const elTithi = document.getElementById("dm-tithi");
const elFest = document.getElementById("dm-fest");
const elFestLi = document.getElementById("dm-fest-li");
const elDiff = document.getElementById("dm-diff");
const elDiffLi = document.getElementById("dm-diff-li");

function getTodayNPT() {
  const iso = nptDateISO();
  const [y, m, d] = iso.split("-").map(n => parseInt(n, 10));
  return { y, m, d };
}

function diffFromTodayText(adY, adM, adD) {
  const today = getTodayNPT();
  const todayUTC = Date.UTC(today.y, today.m - 1, today.d);
  const dayUTC = Date.UTC(adY, adM - 1, adD);
  const diff = Math.round((dayUTC - todayUTC) / 86400000);
  
  if (diff === 0) return "आज";
  if (diff > 0) return `${toNepNum(diff)} दिन बाँकी`;
  return `${toNepNum(Math.abs(diff))} दिन पहिले`;
}

// Open note editor
function openNoteEditor(dateKey, year, month, day) {
  currentNoteDate = dateKey;
  const note = getNote(dateKey);
  noteInput.value = note ? note.text : '';
  noteFormContainer.style.display = 'block';
  noteInput.focus();
}

// Close note editor
function closeNoteEditor() {
  noteFormContainer.style.display = 'none';
  noteInput.value = '';
  currentNoteDate = null;
}

async function openDayModal({ year, month, day, adParts, weekday, tithi, festival, note }) {
  const monthDisplay = `${nepaliMonths[month]}`;
  elBs.textContent = `${monthDisplay} ${toNepNum(day)}, ${toNepNum(year)} ${weekday}`;
  elBs.classList.toggle('saturday', weekday === 'शनिबार');
  
  const adDate = new Date(Date.UTC(adParts.y, adParts.m - 1, adParts.d));
  const adFormatted = adDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  elAd.textContent = adFormatted;
  
  const selISO = `${adParts.y}-${pad2(adParts.m)}-${pad2(adParts.d)}`;
  const modalSun = await fetchSunTimesForISO(selISO);
  elSunR.textContent = modalSun.sunrise;
  elSunS.textContent = modalSun.sunset;
  
  elWeek.textContent = weekday;
  elWeek.classList.toggle('saturday', weekday === 'शनिबार');
  elTithi.textContent = tithi;
  
  // Get season
  const season = getSeasonForMonth(month);
  dmSeason.textContent = season;
  dmSeasonLi.style.display = season ? "" : "none";
  
  const diffText = diffFromTodayText(adParts.y, adParts.m, adParts.d);
  elDiff.textContent = diffText;
  elDiffLi.style.display = "";
  
  if (festival && festival.trim()) {
    elFest.textContent = festival;
    elFestLi.style.display = "";
  } else {
    elFestLi.style.display = "none";
  }
  
  const dateKey = generateDateKey(year, month, day);
  currentNoteDate = dateKey;
  const currentNote = note || getNote(dateKey);
  
  if (currentNote) {
    dmNote.textContent = currentNote.text;
    dmNoteLi.style.display = "";
    noteFormContainer.style.display = 'none';
  } else {
    dmNoteLi.style.display = "none";
    noteFormContainer.style.display = 'block';
    noteInput.value = '';
  }
  
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

// Open modal for specific date
function openDayModalForDate(year, month, day) {
  const adParts = bsToAdParts(year, month, day);
  const holiday = holidaysByYear[year]?.filter(h => h.month === month && h.day === day) || [];
  const festival = holiday.map(h => h.name).join(" | ");
  
  openDayModal({
    year,
    month,
    day,
    adParts,
    weekday: nepaliWeekdaysFull[adParts.w],
    tithi: tithiForAD(adParts.y, adParts.m, adParts.d),
    festival: festival
  });
}

function closeDayModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  closeNoteEditor();
}

// Modal event listeners
modalClose.addEventListener("click", closeDayModal);
modal.querySelector(".modal-overlay").addEventListener("click", closeDayModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) {
    closeDayModal();
  }
  if (e.key === "Escape" && deleteConfirmModal.classList.contains("show")) {
    hideDeleteConfirmation();
  }
});

// Note action event listeners
saveNoteBtn.addEventListener("click", () => {
  if (currentNoteDate && noteInput.value.trim()) {
    saveNote(currentNoteDate, noteInput.value);
    const [year, month, day] = currentNoteDate.split('-').map(Number);
    const note = getNote(currentNoteDate);
    dmNote.textContent = note.text;
    dmNoteLi.style.display = "";
    noteFormContainer.style.display = 'none';
    noteInput.value = '';
  }
});

cancelNoteBtn.addEventListener("click", () => {
  closeNoteEditor();
  const note = getNote(currentNoteDate);
  if (note) {
    dmNoteLi.style.display = "";
  } else {
    dmNoteLi.style.display = "none";
  }
});

editNoteBtn.addEventListener("click", () => {
  const dateKey = currentNoteDate;
  const [year, month, day] = dateKey.split('-').map(Number);
  openNoteEditor(dateKey, year, month, day);
});

deleteNoteBtn.addEventListener("click", () => {
  if (currentNoteDate) {
    showDeleteConfirmation(currentNoteDate);
  }
});

// Delete confirmation modal event listeners
deleteConfirmBtn.addEventListener('click', confirmDelete);
deleteCancelBtn.addEventListener('click', hideDeleteConfirmation);
deleteConfirmModal.querySelector('.delete-modal-overlay').addEventListener('click', hideDeleteConfirmation);

/* Update page title with current date */
function updatePageTitle(todayBs) {
  if (!pageTitleEl) return;
  
  const monthName = nepaliMonths[todayBs.month];
  const dayNum = toNepNum(todayBs.day);
  
  pageTitleEl.textContent = `Nepali PatroX - ${monthName} ${dayNum}`;
}

/* Update header today with time period and live seconds */
let timeUpdateInterval = null;

function updateHeaderToday(todayBs, todayAd) {
  if (!headerTodayEl) return;
  
  const adStr = `${todayAd.getFullYear()}-${pad2(todayAd.getMonth() + 1)}-${pad2(todayAd.getDate())}`;
  const weekFull = nepaliWeekdaysFull[todayAd.getDay()];
  const bsText = `${nepaliMonths[todayBs.month]} ${toNepNum(todayBs.day)}, ${toNepNum(todayBs.year)} (${weekFull})`;
  
  // Get current time and determine time period
  const updateTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;
    
    let timePeriod = '';
    if (hours >= 4 && hours < 11) {
      timePeriod = 'बिहानको';
    } else if (hours >= 11 && hours < 15) {
      timePeriod = 'दिउँसोको';
    } else if (hours >= 15 && hours < 18) {
      timePeriod = 'अपराह्न';
    } else if (hours >= 18 && hours < 21) {
      timePeriod = 'बेलुकाको';
    } else {
      timePeriod = 'रातिको';
    }
    
    headerTodayEl.innerHTML = `
      <span class="date-info">आज: ${bsText} | AD: ${adStr}</span>
      <span class="time-info">${timePeriod}: ${timeStr}</span>
    `;
    headerTodayEl.classList.toggle('saturday', weekFull === 'शनिबार');
  };
  
  // Clear existing interval if any
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
  
  // Initial update
  updateTime();
  
  // Update every second for live countdown
  timeUpdateInterval = setInterval(updateTime, 1000);
}

/* Mobile Menu Functionality */
function initMobileMenu() {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenuToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenuToggle.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  document.addEventListener('click', (e) => {
    if (!mobileMenuToggle.contains(e.target) && !navMenu.contains(e.target)) {
      mobileMenuToggle.classList.remove('active');
      navMenu.classList.remove('active');
    }
  });
}

/* Initialize Date Converter */
function initConverter() {
  // Toggle between converter modes
  converterToggleBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const mode = this.dataset.mode;
      
      converterToggleBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      if (mode === 'bs-to-ad') {
        bsToAdForm.classList.add('active');
        adToBsForm.classList.remove('active');
        bsToAdResult.style.display = 'none';
        adToBsResult.style.display = 'none';
      } else {
        bsToAdForm.classList.remove('active');
        adToBsForm.classList.add('active');
        bsToAdResult.style.display = 'none';
        adToBsResult.style.display = 'none';
      }
    });
  });
  
  // BS to AD converter
  convertBsToAdBtn.addEventListener('click', function() {
    const bsYear = parseInt(document.getElementById('bs-year-input').value);
    const bsMonth = parseInt(document.getElementById('bs-month-input').value);
    const bsDay = parseInt(document.getElementById('bs-day-input').value);
    
    const result = bsToAdConverter(bsYear, bsMonth, bsDay);
    
    bsToAdResult.style.display = 'block';
    
    if (result.error) {
      bsToAdResult.className = 'converter-result error';
      bsToAdResult.innerHTML = `<span>${result.error}</span>`;
      return;
    }
    
    bsToAdResult.className = 'converter-result success';
    
    bsToAdResult.innerHTML = `
      <div class="result-date-combined english">
        <div class="date-main">${result.formattedDate}</div>
        <div class="weekday ${result.isSaturday ? 'saturday' : ''}">${result.weekday}</div>
      </div>
    `;
  });
  
  // AD to BS converter
  convertAdToBsBtn.addEventListener('click', function() {
    const adYear = parseInt(document.getElementById('ad-year-input').value);
    const adMonth = parseInt(document.getElementById('ad-month-input').value);
    const adDay = parseInt(document.getElementById('ad-day-input').value);
    
    const result = adToBsConverter(adYear, adMonth, adDay);
    
    adToBsResult.style.display = 'block';
    
    if (result.error) {
      adToBsResult.className = 'converter-result error';
      adToBsResult.innerHTML = `<span>${result.error}</span>`;
      return;
    }
    
    adToBsResult.className = 'converter-result success';
    
    const bsDate = result.bsResult;
    const monthName = nepaliMonths[bsDate.month];
    const bsFormatted = `${monthName} ${toNepNum(bsDate.day)}, ${toNepNum(bsDate.year)}`;
    
    adToBsResult.innerHTML = `
      <div class="result-date-combined nepali">
        <div class="date-main">${bsFormatted}</div>
        <div class="weekday ${result.isSaturday ? 'saturday' : ''}">${result.weekday}</div>
      </div>
    `;
  });
  
  // Set current date as default
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  
  document.getElementById('ad-year-input').value = todayYear;
  document.getElementById('ad-month-input').value = todayMonth;
  document.getElementById('ad-day-input').value = todayDay;
  
  const todayBs = adToBs(today);
  if (!todayBs.outOfRange) {
    document.getElementById('bs-year-input').value = todayBs.year;
    document.getElementById('bs-month-input').value = todayBs.month;
    document.getElementById('bs-day-input').value = todayBs.day;
  } else {
    document.getElementById('bs-year-input').value = 2082;
    document.getElementById('bs-month-input').value = 7;
    document.getElementById('bs-day-input').value = 22;
  }
  
  // Add Enter key support for converter inputs
  document.querySelectorAll('.converter-input-row input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const converterForm = input.closest('.converter-form');
        if (converterForm.id === 'bs-to-ad-form') {
          convertBsToAdBtn.click();
        } else {
          convertAdToBsBtn.click();
        }
      }
    });
  });
}

/* Upcoming Events - Show ALL events from current year onward */
function buildUpcomingEvents(todayAd, limit = 50) {
  const years = getAvailableYears();
  const todayUTC = Date.UTC(todayAd.getFullYear(), todayAd.getMonth(), todayAd.getDate());
  const items = [];
  
  // Get current BS year
  const todayBs = adToBs(todayAd);
  const currentBsYear = todayBs.year;
  
  // Filter years starting from current BS year
  const yearsFromNow = years.filter(y => y >= currentBsYear);
  
  for (const year of yearsFromNow) {
    const yearHolidays = holidaysByYear[year] || [];
    
    for (const holiday of yearHolidays) {
      const adParts = bsToAdParts(year, holiday.month, holiday.day);
      if (!adParts) continue;
      
      const dayUTC = Date.UTC(adParts.y, adParts.m - 1, adParts.d);
      const diff = Math.round((dayUTC - todayUTC) / 86400000);
      
      if (diff >= 0) {
        const weekday = nepaliWeekdaysFull[adParts.w];
        const adDate = new Date(adParts.y, adParts.m - 1, adParts.d);
        const adFormatted = adDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        
        items.push({
          label: holiday.name,
          bsText: `${nepaliMonths[holiday.month]} ${toNepNum(holiday.day)}, ${toNepNum(year)}`,
          adText: adFormatted,
          inDays: diff,
          sortKey: dayUTC,
          isRed: holiday.red || false,
          weekday: weekday,
          isSaturday: weekday === 'शनिबार',
          day: holiday.day,
          month: holiday.month,
          year: year,
          adParts: adParts
        });
      }
    }
  }
  
  items.sort((a, b) => a.sortKey - b.sortKey);
  return items.slice(0, limit);
}

function renderUpcomingEvents(todayAd) {
  const events = buildUpcomingEvents(todayAd, 50); // Increased limit to show more events
  upcomingList.innerHTML = "";
  
  if (!events.length) {
    upcomingList.innerHTML = `
      <div class="upcoming-item">
        <div class="event-date">
          <div class="day">--</div>
          <div class="month">--</div>
        </div>
        <div class="event-info">
          <div class="event-title">कुनै आगामी कार्यक्रमहरू छैनन्</div>
          <div class="event-meta">तपाईंको चयनका लागि आगामी कार्यक्रमहरू उपलब्ध छैनन्</div>
        </div>
      </div>
    `;
    return;
  }
  
  events.forEach(event => {
    const li = document.createElement('li');
    li.className = 'upcoming-item';
    
    let badgeText = '';
    if (event.inDays === 0) {
      badgeText = "आज";
    } else if (event.inDays === 1) {
      badgeText = "भोलि";
    } else if (event.inDays === 2) {
      badgeText = "पर्सी";
    } else if (event.inDays <= 7) {
      badgeText = `${toNepNum(event.inDays)} दिन`;
    } else if (event.inDays <= 30) {
      const weeks = Math.floor(event.inDays / 7);
      badgeText = `${toNepNum(weeks)} हप्ता`;
    } else if (event.inDays <= 365) {
      const months = Math.floor(event.inDays / 30);
      badgeText = `${toNepNum(months)} महिना`;
    } else {
      const years = Math.floor(event.inDays / 365);
      badgeText = `${toNepNum(years)} वर्ष`;
    }
    
    if (event.inDays > 0) {
      badgeText += " बाँकी";
    }
    
    const badgeClass = event.isRed ? "event-pill red" : "event-pill";
    
    li.innerHTML = `
      <div class="event-date">
        <div class="day">${toNepNum(event.day)}</div>
        <div class="month">${nepaliMonths[event.month]}</div>
      </div>
      <div class="event-info">
        <div class="event-title">${event.label}</div>
        <div class="event-meta ${event.isSaturday ? 'saturday' : ''}">${event.bsText}</div>
        <div class="event-meta">${event.adText}</div>
      </div>
      <div class="${badgeClass}">${badgeText}</div>
    `;
    
    li.addEventListener('click', () => {
      openDayModal({
        year: event.year,
        month: event.month,
        day: event.day,
        adParts: event.adParts,
        weekday: event.weekday,
        tithi: tithiForAD(event.adParts.y, event.adParts.m, event.adParts.d),
        festival: event.label
      });
    });
    
    upcomingList.appendChild(li);
  });
}

/* Selector and upcoming festivals functionality */
function populateSelectors() {
  const years = getAvailableYears();
  
  yearSelector.innerHTML = "";
  years.forEach(y => {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = toNepNum(y);
    yearSelector.appendChild(option);
  });
  
  monthSelector.innerHTML = "";
  nepaliMonths.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = month;
    monthSelector.appendChild(option);
  });
}

/* App state and initialization */
let currentYear = 2082;
let currentMonth = 7;

function setCurrentDateToToday() {
  const now = new Date();
  const todayBs = adToBs(now);
  
  if (!todayBs.outOfRange) {
    currentYear = todayBs.year;
    currentMonth = todayBs.month;
  }
}

function populateMonthYearAndRender() {
  const now = new Date();
  const todayBs = adToBs(now);
  
  // Update selectors
  yearSelector.value = String(currentYear);
  monthSelector.value = String(currentMonth);
  
  generateCalendar(currentMonth, currentYear, todayBs);
  updateHeaderToday(todayBs, now);
  updatePageTitle(todayBs);
  renderUpcomingEvents(now);
  renderNotesList();
}

function init() {
  // Set current date to today
  setCurrentDateToToday();
  
  // Initialize converters
  initConverter();
  initCurrencyConverter();
  
  // Start rate auto-refresh
  startRateAutoRefresh();
  
  // Initialize mobile menu
  initMobileMenu();
  
  // Initialize notes
  renderNotesList();
  
  // Populate selectors
  populateSelectors();
  
  // Initial render
  populateMonthYearAndRender();
  
  // Load sun times
  loadSunTimesTodayAndSchedule();
  
  // Event listeners
  prevButton.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      const years = getAvailableYears();
      const currentIndex = years.indexOf(currentYear);
      currentYear = years[Math.max(0, currentIndex - 1)];
    }
    
    populateMonthYearAndRender();
  });
  
  nextButton.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      const years = getAvailableYears();
      const currentIndex = years.indexOf(currentYear);
      currentYear = years[Math.min(years.length - 1, currentIndex + 1)];
    }
    
    populateMonthYearAndRender();
  });
  
  todayBtn.addEventListener("click", () => {
    const now = new Date();
    const todayBs = adToBs(now);
    const years = getAvailableYears();
    
    if (todayBs.outOfRange) {
      currentYear = years[0];
      currentMonth = 0;
    } else {
      currentYear = todayBs.year;
      currentMonth = todayBs.month;
    }
    
    populateMonthYearAndRender();
    
    // Update converter inputs
    document.getElementById('bs-year-input').value = todayBs.year;
    document.getElementById('bs-month-input').value = todayBs.month;
    document.getElementById('bs-day-input').value = todayBs.day;
    
    document.getElementById('ad-year-input').value = now.getFullYear();
    document.getElementById('ad-month-input').value = now.getMonth() + 1;
    document.getElementById('ad-day-input').value = now.getDate();
    
    // Trigger conversion
    setTimeout(() => {
      if (bsToAdForm.classList.contains('active')) {
        convertBsToAdBtn.click();
      } else {
        convertAdToBsBtn.click();
      }
      performCurrencyConversion();
    }, 100);
  });
  
  yearSelector.addEventListener("change", () => {
    currentYear = parseInt(yearSelector.value, 10);
    populateMonthYearAndRender();
  });
  
  monthSelector.addEventListener("change", () => {
    currentMonth = parseInt(monthSelector.value, 10);
    populateMonthYearAndRender();
  });
  
  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") prevButton.click();
    if (e.key === "ArrowRight") nextButton.click();
    if (e.key === "Enter" && modal.classList.contains("show") && document.activeElement === noteInput) {
      saveNoteBtn.click();
    }
  });
  
  // Add loading animation
  document.body.classList.remove('loading');
  
  // Handle window resize for responsive updates
  window.addEventListener('resize', () => {
    // Re-render calendar on resize to adjust for mobile/desktop views
    const now = new Date();
    const todayBs = adToBs(now);
    generateCalendar(currentMonth, currentYear, todayBs);
  });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
