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
const themeToggle = document.getElementById("theme-toggle");
const headerTodayEl = document.getElementById("header-today");
const pageTitleEl = document.getElementById("page-title");

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

/* Epoch & conversions */
const EPOCH_AD = { y: 2025, m: 4, d: 14 };
const EPOCH_WEEKDAY_SUN0 = 1;

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
let currentNoteDate = null; // Format: "YYYY-MM-DD-BSYear-BSMonth-BSDay"

// Save notes to localStorage
function saveNotes() {
  localStorage.setItem('np_notes', JSON.stringify(notes));
}

// Get note for specific date
function getNote(dateKey) {
  return notes[dateKey] || null;
}

// Save note for specific date
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

// Delete note for specific date
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

// Generate date key
function generateDateKey(year, month, day) {
  return `${year}-${month}-${day}`;
}

// Update calendar with note indicators
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

// Render notes list in sidebar
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
  
  // Sort notes by creation date (newest first)
  noteEntries.sort((a, b) => {
    const dateA = new Date(b[1].created || 0);
    const dateB = new Date(a[1].created || 0);
    return dateA - dateB;
  });
  
  // Display only latest 5 notes
  noteEntries.slice(0, 5).forEach(([dateKey, note]) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const monthName = nepaliMonths[month];
    
    const li = document.createElement('li');
    li.className = 'note-item';
    li.dataset.dateKey = dateKey;
    
    li.innerHTML = `
      <div class="note-item-header">
        <div class="note-date">${monthName} ${toNepNum(day)}, ${toNepNum(year)}</div>
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
    
    // Add event listeners for sidebar note actions
    li.querySelector('.edit-note-sidebar').addEventListener('click', (e) => {
      e.stopPropagation();
      openNoteEditor(dateKey, year, month, day);
    });
    
    li.querySelector('.delete-note-sidebar').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this note?')) {
        deleteNote(dateKey);
      }
    });
    
    // Click on note item to open modal
    li.addEventListener('click', () => {
      openDayModalForDate(year, month, day);
    });
    
    notesList.appendChild(li);
  });
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
  // Clear table
  while (tableEl.firstChild) {
    tableEl.firstChild.remove();
  }
  
  // Add header
  tableEl.appendChild(buildHeaderRow());
  
  // Create tbody
  const tbody = document.createElement("tbody");
  tableEl.appendChild(tbody);
  
  const dim = bsMonthDays(year, month);
  const start = getStartDay(year, month);
  const yearHolidays = holidaysByYear[year] || [];
  
  // Helper to get holiday info for a specific day
  const getHolidayInfo = (m, d) => {
    const items = yearHolidays.filter(h => h.month === m && h.day === d);
    return {
      names: items.map(i => i.name),
      anyRed: items.some(i => i.red)
    };
  };
  
  let date = 1;
  
  // Generate calendar rows (max 6 rows)
  for (let row = 0; row < 6; row++) {
    const tr = document.createElement("tr");
    
    for (let col = 0; col < 7; col++) {
      const td = document.createElement("td");
      
      // Empty cells at the beginning
      if (row === 0 && col < start) {
        td.className = "empty";
        td.setAttribute("aria-hidden", "true");
        tr.appendChild(td);
        continue;
      }
      
      // Empty cells after the month ends
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
      
      // Build CSS classes
      const classes = [];
      if (col === 6) classes.push("is-sat");
      if (isToday) classes.push("today");
      if (holiday.anyRed) classes.push("holiday-red");
      if (hasNote) classes.push("has-note");
      td.className = classes.join(" ");
      
      // Cell content
      td.innerHTML = `
        <div class="cell-top">
          <span class="bs-day">${toNepNum(dayVal)}</span>
        </div>
        ${festival ? `<span class="festival" title="${festival}">${festival}</span>` : ''}
        <span class="tithi">${tithi}</span>
        <span class="ad-date">${adLabel}</span>
      `;
      
      // Click handler for day details
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
      
      // Touch device optimizations
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
  
  // Update period label
  periodLabelEl.textContent = getADMonthSpanWithYear(month, year);
}

/* Sunrise/Sunset functionality */
const SUN_LAT = 28.108393;
const SUN_LON = 84.091713;
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
    
    // Schedule next update for midnight NPT
    const now = new Date();
    const nowNPT = new Date(now.toLocaleString('en-US', { timeZone: NPT_TZ }));
    const tomorrowNPT = new Date(nowNPT);
    tomorrowNPT.setDate(tomorrowNPT.getDate() + 1);
    tomorrowNPT.setHours(0, 0, 0, 0);
    
    const nextUpdateUTC = new Date(tomorrowNPT.toLocaleString('en-US', { timeZone: 'UTC' }));
    const delay = nextUpdateUTC.getTime() - now.getTime() + 10000; // +10 seconds buffer
    
    setTimeout(loadSunTimesTodayAndSchedule, Math.max(delay, 60000));
  } catch (error) {
    console.error('Error in sun times schedule:', error);
    // Retry after 5 minutes on error
    setTimeout(loadSunTimesTodayAndSchedule, 300000);
  }
}

/* Forex Rate Functionality - Using Working NRB API */
const API_BASE = 'https://www.nrb.org.np/api/forex/v1';

const forexDatePicker = document.getElementById('forex-date-picker');
const forexLoadBtn = document.getElementById('forex-load-btn');
const forexLoader = document.getElementById('forex-loader');
const forexContent = document.getElementById('forex-content');
const forexRates = document.getElementById('forex-rates');
const forexError = document.getElementById('forex-error');
const forexRetry = document.getElementById('forex-retry');
const forexUpdateTime = document.getElementById('forex-update-time');

function todayYMD() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// Set default date to today
forexDatePicker.value = todayYMD();

async function fetchRates(date) {
  const url = `${API_BASE}/rates?from=${date}&to=${date}&per_page=100&page=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API Error " + res.status);
  return await res.json();
}

function renderRates(payload) {
  forexRates.innerHTML = '';

  if (!payload || !payload.length) {
    showError("No forex data available for selected date.");
    return;
  }

  const day = payload[0];
  const rates = day.rates || [];

  if (!rates.length) {
    showError("No rates available.");
    return;
  }

  // Hide loader and error, show content
  forexLoader.style.display = 'none';
  forexError.style.display = 'none';
  forexContent.style.display = 'block';

  // Sort rates: USD first, then EUR, GBP, then others
  const sortedRates = [...rates].sort((a, b) => {
    const order = { 'USD': 1, 'EUR': 2, 'GBP': 3, 'INR': 4 };
    const aOrder = order[a.currency?.iso3] || 99;
    const bOrder = order[b.currency?.iso3] || 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.currency?.iso3 || '').localeCompare(b.currency?.iso3 || '');
  });

  // Display rates
  sortedRates.forEach(r => {
    const rateItem = document.createElement('div');
    rateItem.className = 'forex-rate-item';
    
    const currencyCode = r.currency?.iso3 || 'N/A';
    const currencyName = r.currency?.name || currencyCode;
    const unit = r.currency?.unit || 1;
    const buy = r.buy ? parseFloat(r.buy).toFixed(2) : '—';
    const sell = r.sell ? parseFloat(r.sell).toFixed(2) : '—';
    
    rateItem.innerHTML = `
      <div class="forex-currency" title="${currencyName}">
        <span>${currencyCode}</span>
      </div>
      <div class="forex-unit">${unit}</div>
      <div class="forex-rate">${buy}</div>
      <div class="forex-rate">${sell}</div>
    `;
    
    forexRates.appendChild(rateItem);
  });

  // Update timestamp
  const now = new Date();
  const updateTime = now.toLocaleTimeString('en-NP', {
    timeZone: 'Asia/Kathmandu',
    hour: '2-digit',
    minute: '2-digit'
  });
  forexUpdateTime.textContent = `Rates for ${day.date} | Updated: ${updateTime}`;
}

function showError(message) {
  forexLoader.style.display = 'none';
  forexContent.style.display = 'none';
  forexError.style.display = 'flex';
  forexError.querySelector('span').textContent = message;
}

async function loadForexRates() {
  const date = forexDatePicker.value;
  
  // Show loader, hide content and error
  forexLoader.style.display = 'flex';
  forexContent.style.display = 'none';
  forexError.style.display = 'none';

  try {
    const json = await fetchRates(date);
    const payload = json?.data?.payload ?? json?.data ?? null;
    renderRates(payload);
  } catch (err) {
    showError("Error: " + err.message);
  }
}

// Load forex rates initially
loadForexRates();

// Event listeners
forexLoadBtn.addEventListener('click', loadForexRates);
forexRetry.addEventListener('click', loadForexRates);

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
  if (diff > 0) return `${diff} दिन पछि`;
  return `${Math.abs(diff)} दिन पहिले`;
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
  // Update modal content
  elBs.textContent = `${nepaliMonths[month]} ${toNepNum(day)}, ${toNepNum(year)} ${weekday}`;
  elAd.textContent = new Date(Date.UTC(adParts.y, adParts.m - 1, adParts.d))
    .toLocaleDateString("en-GB", {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    });
  
  // Fetch sun times for the selected day
  const selISO = `${adParts.y}-${pad2(adParts.m)}-${pad2(adParts.d)}`;
  const modalSun = await fetchSunTimesForISO(selISO);
  elSunR.textContent = modalSun.sunrise;
  elSunS.textContent = modalSun.sunset;
  
  // Update other details
  elWeek.textContent = weekday;
  elTithi.textContent = tithi;
  
  // Update "days from today" info
  const diffText = diffFromTodayText(adParts.y, adParts.m, adParts.d);
  elDiff.textContent = diffText;
  elDiffLi.style.display = "";
  
  // Update festival info
  if (festival && festival.trim()) {
    elFest.textContent = festival;
    elFestLi.style.display = "";
  } else {
    elFestLi.style.display = "none";
  }
  
  // Update note info
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
  
  // Show modal
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  
  // Prevent body scrolling
  document.body.style.overflow = "hidden";
}

// Open modal for specific date (used by notes list)
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
  if (currentNoteDate && confirm('Delete this note?')) {
    if (deleteNote(currentNoteDate)) {
      dmNoteLi.style.display = "none";
      noteFormContainer.style.display = 'block';
      noteInput.value = '';
    }
  }
});

/* Update page title with current date */
function updatePageTitle(todayBs) {
  if (!pageTitleEl) return;
  
  const monthName = nepaliMonths[todayBs.month];
  const dayNum = toNepNum(todayBs.day);
  
  pageTitleEl.textContent = `Nepali Patro - ${monthName} ${dayNum}`;
}

/* Selector and upcoming festivals functionality */
function populateSelectors() {
  const years = getAvailableYears();
  
  // Populate year selector
  yearSelector.innerHTML = "";
  years.forEach(y => {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = toNepNum(y);
    yearSelector.appendChild(option);
  });
  
  // Populate month selector
  monthSelector.innerHTML = "";
  nepaliMonths.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = month;
    monthSelector.appendChild(option);
  });
  
  // Add focus styles for accessibility
  document.querySelectorAll('.select-input').forEach(select => {
    select.addEventListener('focus', () => {
      select.parentElement.classList.add('focused');
    });
    
    select.addEventListener('blur', () => {
      select.parentElement.classList.remove('focused');
    });
  });
}

function updateHeaderToday(todayBs, todayAd) {
  if (!headerTodayEl) return;
  
  const adStr = `${todayAd.getFullYear()}-${pad2(todayAd.getMonth() + 1)}-${pad2(todayAd.getDate())}`;
  const weekFull = ["आइतवार", "सोमवार", "मंगलवार", "बुधवार", "बिहीवार", "शुक्रवार", "शनिबार"][todayAd.getDay()];
  const bsText = `${nepaliMonths[todayBs.month]} ${toNepNum(todayBs.day)}, ${toNepNum(todayBs.year)} (${weekFull})`;
  
  headerTodayEl.textContent = `आज: ${bsText} | AD: ${adStr}`;
}

function buildUpcomingFestivalsAllYears(todayAd, limit = 50) {
  const years = getAvailableYears();
  const todayUTC = Date.UTC(todayAd.getFullYear(), todayAd.getMonth(), todayAd.getDate());
  const items = [];
  
  for (const year of years) {
    const yearHolidays = holidaysByYear[year] || [];
    
    for (const holiday of yearHolidays) {
      const adParts = bsToAdParts(year, holiday.month, holiday.day);
      if (!adParts) continue;
      
      const dayUTC = Date.UTC(adParts.y, adParts.m - 1, adParts.d);
      const diff = Math.round((dayUTC - todayUTC) / 86400000);
      
      if (diff >= 0) {
        items.push({
          label: holiday.name,
          bsText: `${nepaliMonths[holiday.month]} ${toNepNum(holiday.day)}, ${toNepNum(year)}`,
          adText: `${adParts.y}-${pad2(adParts.m)}-${pad2(adParts.d)}`,
          inDays: diff,
          sortKey: dayUTC,
          isRed: holiday.red || false
        });
      }
    }
  }
  
  // Sort by date
  items.sort((a, b) => a.sortKey - b.sortKey);
  
  // Limit results
  return items.slice(0, limit);
}

function renderUpcoming(todayAd) {
  const festivals = buildUpcomingFestivalsAllYears(todayAd, 50);
  upcomingList.innerHTML = "";
  
  if (!festivals.length) {
    const li = document.createElement("li");
    li.className = "upcoming-item";
    li.innerHTML = `
      <div class="up-title">कुनै आगामी पर्वहरू फेला परेन</div>
      <div class="up-sub">तपाईंको चयनका लागि आगामी पर्वहरू उपलब्ध छैनन्</div>
    `;
    upcomingList.appendChild(li);
    return;
  }
  
  festivals.forEach(fest => {
    const li = document.createElement("li");
    li.className = "upcoming-item";
    
    const badgeText = fest.inDays === 0 ? "आज" : `${fest.inDays} दिन बाँकी`;
    const badgeClass = fest.isRed ? "up-badge red" : "up-badge";
    
    li.innerHTML = `
      <div class="up-title">${fest.label}</div>
      <div class="up-sub">BS: ${fest.bsText}</div>
      <div class="up-sub">AD: ${fest.adText}</div>
      <div class="up-sub"><span class="${badgeClass}">${badgeText}</span></div>
    `;
    
    upcomingList.appendChild(li);
  });
}

/* Theme functionality */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("np_theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("np_theme");
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
});

/* App state and initialization */
let currentYear = Math.min(...Object.keys(bsData).map(Number));
let currentMonth = 6; // Default to Ashwin

function populateMonthYearAndRender() {
  const now = new Date();
  const todayBs = adToBs(now);
  
  generateCalendar(currentMonth, currentYear, todayBs);
  updateHeaderToday(todayBs, now);
  updatePageTitle(todayBs);
  renderUpcoming(now);
  updateCalendarNotes();
}

function init() {
  // Initialize theme
  initTheme();
  
  // Initialize notes
  renderNotesList();
  
  // Populate selectors
  populateSelectors();
  
  // Set initial date
  const now = new Date();
  const todayBs = adToBs(now);
  const years = getAvailableYears();
  const minYear = years[0];
  
  if (!todayBs.outOfRange && hasYear(todayBs.year)) {
    currentYear = todayBs.year;
    currentMonth = todayBs.month;
  } else {
    currentYear = minYear;
    currentMonth = 0;
  }
  
  // Update selectors
  yearSelector.value = String(currentYear);
  monthSelector.value = String(currentMonth);
  
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
    
    yearSelector.value = String(currentYear);
    monthSelector.value = String(currentMonth);
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
    
    yearSelector.value = String(currentYear);
    monthSelector.value = String(currentMonth);
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
    
    yearSelector.value = String(currentYear);
    monthSelector.value = String(currentMonth);
    populateMonthYearAndRender();
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
  
  // Responsive optimizations
  window.addEventListener('resize', () => {
    // Re-render on orientation change for better mobile experience
    if (window.innerWidth <= 768) {
      populateMonthYearAndRender();
    }
  });
  
  // Add loading animation
  document.body.classList.add('loaded');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
