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
const toNepNum  = (num) => String(num).replace(/\d/g, d => nepDigits[d]);
const pad2      = (n) => String(n).padStart(2, "0");

/* DOM */
const yearSelector  = document.getElementById("year-selector");
const monthSelector = document.getElementById("month-selector");
const prevButton    = document.getElementById("prev");
const nextButton    = document.getElementById("next");
const todayBtn      = document.getElementById("today-btn");
const periodLabelEl = document.getElementById("period-label");
const tableEl       = document.getElementById("calendar-table");
const upcomingList  = document.getElementById("upcoming-list");
const themeToggle   = document.getElementById("theme-toggle");
const themeLabel    = themeToggle.querySelector(".theme-label");
const headerTodayEl = document.getElementById("header-today");

/* epoch & conversions */
const EPOCH_AD = { y: 2025, m: 4, d: 14 };
const EPOCH_WEEKDAY_SUN0 = 1;
function isLeapAD(y){ return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0); }
function adMonthLens(y){ return [31, isLeapAD(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; }
function adMonthLensAt(y,m){ return adMonthLens(y)[m-1]; }
function getAvailableYears(){ return Object.keys(bsData).map(Number).sort((a,b)=>a-b); }
function hasYear(y){ return !!bsData[y]; }
function bsMonthDays(year,month){ return bsData[year][month]; }
function getStartDay(year,month){ return startDays[year]?.[month] ?? 0; }
function bsOffsetFromEpoch(year,month,day){
  let offset=0;
  for (const y of getAvailableYears()){ if (y>=year) break; offset+=bsData[y].reduce((a,b)=>a+b,0); }
  for (let i=0;i<month;i++) offset+=bsData[year][i];
  return offset+(day-1);
}
function offsetToADParts(offset){
  let y=EPOCH_AD.y,m=EPOCH_AD.m,d=EPOCH_AD.d,rem=offset;
  while(rem>0){ const ml=adMonthLensAt(y,m), left=ml-d;
    if(rem<=left){ d+=rem; rem=0; } else { rem-=(left+1); d=1; m++; if(m>12){ m=1; y++; } }
  }
  const w=(EPOCH_WEEKDAY_SUN0+offset)%7;
  return { y, m, d, w };
}
function bsToAdParts(y,m,d){ if(!hasYear(y)) return null; return offsetToADParts(bsOffsetFromEpoch(y,m,d)); }
function adToBs(adDate){
  const ms=86400000, t=Date.UTC(adDate.getFullYear(),adDate.getMonth(),adDate.getDate());
  const e=Date.UTC(EPOCH_AD.y,EPOCH_AD.m-1,EPOCH_AD.d);
  let delta=Math.floor((t-e)/ms);
  if(delta<0) return { year:getAvailableYears()[0], month:0, day:1, outOfRange:true };
  const years=getAvailableYears(); let y=years[0], m=0;
  outer: for(const Y of years){ for(let mi=0;mi<12;mi++){ const len=bsData[Y][mi];
      if(delta<len){ y=Y; m=mi; break outer; } delta-=len; } }
  const d=delta+1; const last=years[years.length-1];
  return { year:y, month:m, day:d, outOfRange:(y===last && d>bsData[last][m]) };
}

/* tithi approx */
const SYNODIC=29.530588853;
function daysSince2000(y,m,d){ const dateUTC=Date.UTC(y,m-1,d), baseUTC=Date.UTC(2000,0,1); return (dateUTC-baseUTC)/86400000; }
function lunarAgeDays(y,m,d){ const D=daysSince2000(y,m,d)-5.097; let a=D%SYNODIC; if(a<0)a+=SYNODIC; return a; }
const TITHI_NAMES={ shukla:["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पूर्णिमा"],
                    krishna:["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","औँसी"] };
function tithiForAD(y,m,d){ const age=lunarAgeDays(y,m,d); const t=Math.floor(age/(SYNODIC/30))+1; return t<=15?`शुक्ल ${TITHI_NAMES.shukla[t-1]}`:`कृष्ण ${TITHI_NAMES.krishna[t-16]}`; }

/* header row */
function buildHeaderRow(){
  const thead=document.createElement("thead"); const tr=document.createElement("tr");
  nepaliWeekdaysFull.forEach((np,i)=>{ const th=document.createElement("th"); if(i===6) th.className="sat";
    th.innerHTML=`<div class="th-wrap"><div class="th-nep">${np}</div><div class="th-en">${englishWeekdaysUpper[i]}</div></div>`;
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  return thead;
}

/* label */
function getADMonthSpanWithYear(month,year){
  const s=bsToAdParts(year,month,1);
  const e=bsToAdParts(year,month,bsMonthDays(year,month));
  const span=(adMonthsShort[s.m-1]===adMonthsShort[e.m-1])?adMonthsShort[s.m-1]:`${adMonthsShort[s.m-1]}/${adMonthsShort[e.m-1]}`;
  return `${nepaliMonths[month]} ${toNepNum(year)} | ${span} ${e.y}`;
}

/* grid */
function generateCalendar(month,year,todayBs){
  tableEl.innerHTML=""; tableEl.appendChild(buildHeaderRow());
  const tbody=document.createElement("tbody"); tableEl.appendChild(tbody);
  const dim=bsMonthDays(year,month), start=getStartDay(year,month), yearH=(holidaysByYear[year]||[]);
  const holidayInfo=(m,d)=>{ const items=yearH.filter(h=>h.month===m&&h.day===d); return {names:items.map(i=>i.name), anyRed:items.some(i=>i.red)}; };
  let date=1;
  for(let i=0;i<6;i++){
    const tr=document.createElement("tr");
    for(let j=0;j<7;j++){
      const td=document.createElement("td");

      if(i===0&&j<start){ td.className="empty"; td.setAttribute("aria-hidden","true"); tr.appendChild(td); continue; }
      if(date>dim){ td.className="empty"; td.setAttribute("aria-hidden","true"); tr.appendChild(td); continue; }

      const dayVal = date;
      const isToday=todayBs && (todayBs.year===year && todayBs.month===month && todayBs.day===dayVal) && !todayBs.outOfRange;
      const hol=holidayInfo(month, dayVal);

      const cls=[]; if(j===6) cls.push("is-sat"); if(isToday) cls.push("today"); if(hol.anyRed) cls.push("holiday-red"); td.className=cls.join(" ");

      const ad=bsToAdParts(year,month,dayVal);
      const adLabel=`${adMonthsShort[ad.m-1]} ${ad.d}`;
      const fest=hol.names.join(" | ");
      const tithi=tithiForAD(ad.y,ad.m,ad.d);

      td.innerHTML = `
        <div class="cell-top"><span class="bs-day">${toNepNum(dayVal)}</span></div>
        ${fest ? `<span class="festival" title="${fest}">${fest}</span>` : ``}
        <span class="tithi">${tithi}</span>
        <span class="ad-date">${adLabel}</span>
      `;

      td.addEventListener("click", ()=>{
        const adParts = bsToAdParts(year, month, dayVal);
        openDayModal({
          year, month, day: dayVal,
          adParts,
          weekday: nepaliWeekdaysFull[adParts.w],
          tithi: tithiForAD(adParts.y, adParts.m, adParts.d),
          festival: fest
        });
      });

      tr.appendChild(td);
      date++;
    }
    tbody.appendChild(tr);
    if(date>dim) break;
  }

  periodLabelEl.textContent=getADMonthSpanWithYear(month,year);
}

/* sunrise/sunset */
const SUN_LAT=28.108393, SUN_LON=84.091713, NPT_TZ='Asia/Kathmandu';
const timeFmt=new Intl.DateTimeFormat('en-NP',{timeZone:NPT_TZ,hour:'2-digit',minute:'2-digit',hour12:false});
function nptDateISO(d=new Date()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:NPT_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const g=k=>p.find(x=>x.type===k)?.value; return `${g('year')}-${g('month')}-${g('day')}`;
}
async function fetchSunTimesForISO(iso){
  try{
    const res=await fetch(`https://api.sunrise-sunset.org/json?lat=${SUN_LAT}&lng=${SUN_LON}&date=${iso}&formatted=0`);
    if(!res.ok) throw 0;
    const j=await res.json();
    if(j.status!=='OK') throw 0;
    return {sunrise:timeFmt.format(new Date(j.results.sunrise)), sunset:timeFmt.format(new Date(j.results.sunset))};
  }catch{ return {sunrise:'--:--', sunset:'--:--'} }
}
async function loadSunTimesTodayAndSchedule(){
  const out=await fetchSunTimesForISO(nptDateISO());
  const sr=document.getElementById('sunrise'), ss=document.getElementById('sunset');
  if(sr) sr.textContent=out.sunrise; if(ss) ss.textContent=out.sunset;

  // update around NPT midnight
  const now=new Date(); let lo=now.getTime(), hi=lo+36*3600*1000, lab=nptDateISO(now);
  while(hi-lo>30000){ const mid=(lo+hi)>>1; nptDateISO(new Date(mid))===lab ? lo=mid : hi=mid; }
  setTimeout(loadSunTimesTodayAndSchedule, Math.max(hi-now.getTime()+30000,60000));
}

/* modal */
const modal=document.getElementById("day-modal");
const modalClose=document.getElementById("modal-close");
const elBs=document.getElementById("modal-title");
const elAd=document.getElementById("modal-ad");
const elSunR=document.getElementById("modal-sunrise");
const elSunS=document.getElementById("modal-sunset");
const elWeek=document.getElementById("dm-week");
const elTithi=document.getElementById("dm-tithi");
const elFest=document.getElementById("dm-fest");
const elFestLi=document.getElementById("dm-fest-li");
const elDiff=document.getElementById("dm-diff");
const elDiffLi=document.getElementById("dm-diff-li");

function getTodayNPT(){
  const iso=nptDateISO();
  const [y,m,d]=iso.split("-").map(n=>parseInt(n,10));
  return {y,m,d};
}
function diffFromTodayText(adY,adM,adD){
  const t=getTodayNPT();
  const todayUTC=Date.UTC(t.y,t.m-1,t.d);
  const dUTC=Date.UTC(adY,adM-1,adD);
  const diff=Math.round((dUTC-todayUTC)/86400000);
  if (diff===0) return "आज";
  if (diff>0)  return `${diff} दिन पछि`;
  return `${Math.abs(diff)} दिन पहिले`;
}

async function openDayModal({year,month,day,adParts,weekday,tithi,festival}){
  elBs.textContent=`${nepaliMonths[month]} ${toNepNum(day)}, ${toNepNum(year)} ${weekday}`;
  elAd.textContent=new Date(Date.UTC(adParts.y,adParts.m-1,adParts.d))
    .toLocaleDateString("en-GB",{day:'2-digit',month:'long',year:'numeric',weekday:'long'});

  const selISO=`${adParts.y}-${pad2(adParts.m)}-${pad2(adParts.d)}`;
  const modalSun=await fetchSunTimesForISO(selISO);
  elSunR.textContent=modalSun.sunrise; elSunS.textContent=modalSun.sunset;

  elWeek.textContent=weekday; elTithi.textContent=tithi;

  const diffText = diffFromTodayText(adParts.y, adParts.m, adParts.d);
  elDiff.textContent = diffText; elDiffLi.style.display = "";

  if(festival && festival.trim()){ elFest.textContent=festival; elFestLi.style.display=""; }
  else { elFestLi.style.display="none"; }

  modal.classList.add("show"); modal.setAttribute("aria-hidden","false");
}
function closeDayModal(){ modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); }
modalClose.addEventListener("click",closeDayModal);
modal.querySelector(".day-modal__scrim").addEventListener("click",closeDayModal);
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape"&&modal.classList.contains("show")) closeDayModal(); });

/* selectors / upcoming */
function populateSelectors(){
  const years=getAvailableYears();
  yearSelector.innerHTML=""; years.forEach(y=>{ const o=document.createElement("option"); o.value=y; o.textContent=toNepNum(y); yearSelector.appendChild(o); });
  monthSelector.innerHTML=""; nepaliMonths.forEach((m,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=m; monthSelector.appendChild(o); });

  document.querySelectorAll('.select-pill select').forEach(sel=>{
    const pill = sel.closest('.select-pill');
    sel.addEventListener('pointerdown', ()=> pill.classList.add('is-open'));
    sel.addEventListener('click',       ()=> pill.classList.add('is-open'));
    sel.addEventListener('change',      ()=> pill.classList.remove('is-open'));
    sel.addEventListener('blur',        ()=> pill.classList.remove('is-open'));
  });
}

function updateHeaderToday(todayBs,todayAd){
  const adStr=`${todayAd.getFullYear()}-${pad2(todayAd.getMonth()+1)}-${pad2(todayAd.getDate())}`;
  const weekFull=["आइतवार","सोमवार","मंगलवार","बुधवार","बिहीवार","शुक्रवार","शनिबार"][todayAd.getDay()];
  const bsText=`${nepaliMonths[todayBs.month]} ${toNepNum(todayBs.day)}, ${toNepNum(todayBs.year)} (${weekFull}) | AD: ${adStr}`;
  if (headerTodayEl) headerTodayEl.textContent = `आज: ${bsText}`;
}

function buildUpcomingFestivalsAllYears(todayAd,limit=100){
  const years=getAvailableYears();
  const todayUTC=Date.UTC(todayAd.getFullYear(),todayAd.getMonth(),todayAd.getDate());
  const items=[];
  for(const y of years){
    for(const h of (holidaysByYear[y]||[])){
      const ap=bsToAdParts(y,h.month,h.day); if(!ap) continue;
      const dUTC=Date.UTC(ap.y,ap.m-1,ap.d);
      const diff=Math.round((dUTC-todayUTC)/86400000);
      if(diff>=0){
        items.push({label:h.name, bsText:`${nepaliMonths[h.month]} ${toNepNum(h.day)}, ${toNepNum(y)}`,
                    adText:`${ap.y}-${pad2(ap.m)}-${pad2(ap.d)}`, inDays:diff, sortKey:dUTC});
      }
    }
  }
  items.sort((a,b)=>a.sortKey-b.sortKey);
  return items.slice(0,limit);
}
function renderUpcoming(todayAd){
  const list=buildUpcomingFestivalsAllYears(todayAd,100);
  upcomingList.innerHTML="";
  if(!list.length){
    const li=document.createElement("li"); li.className="upcoming-item";
    li.innerHTML=`<div class="up-sub">हाल आगामी पर्वहरू सूचीकृत छैनन्।</div>`;
    upcomingList.appendChild(li); return;
  }
  list.forEach(it=>{
    const li=document.createElement("li"); li.className="upcoming-item";
    li.innerHTML=`<div class="up-title">${it.label}</div>
      <div class="up-sub">BS: ${it.bsText}</div>
      <div class="up-sub">AD: ${it.adText}</div>
      <div class="up-sub"><span class="up-badge">${it.inDays===0?"आज":`${it.inDays} दिन बाँकी`}</span></div>`;
    upcomingList.appendChild(li);
  });
}

/* theme */
function applyTheme(t){ document.documentElement.setAttribute("data-theme",t); themeLabel.textContent=t==="dark"?"Dark":"Light"; }
function initTheme(){ const saved=localStorage.getItem("np_theme"); const prefers=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches; applyTheme(saved || (prefers?"dark":"light")); }
themeToggle.addEventListener("click",()=>{ const now=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark"; applyTheme(now); localStorage.setItem("np_theme",now); });

/* init */
let currentYear  = Math.min(...Object.keys(bsData).map(Number));
let currentMonth = 6;

function populateMonthYearAndRender(){
  const now=new Date(); const tBs=adToBs(now);
  generateCalendar(currentMonth,currentYear,tBs);
  updateHeaderToday(tBs,now);
  renderUpcoming(now);
}

function init(){
  initTheme();
  populateSelectors();

  const now=new Date(); const tBs=adToBs(now); const years=getAvailableYears(); const minY=years[0];
  if(!tBs.outOfRange && hasYear(tBs.year)){ currentYear=tBs.year; currentMonth=tBs.month; } else { currentYear=minY; currentMonth=0; }
  yearSelector.value=String(currentYear); monthSelector.value=String(currentMonth);

  populateMonthYearAndRender(); loadSunTimesTodayAndSchedule();

  prevButton.addEventListener("click", ()=>{
    currentMonth--;
    if(currentMonth<0){
      currentMonth=11;
      const ys=getAvailableYears(); const idx=ys.indexOf(currentYear);
      currentYear=ys[Math.max(0,idx-1)];
    }
    yearSelector.value=String(currentYear);
    monthSelector.value=String(currentMonth);
    populateMonthYearAndRender();
  });

  nextButton.addEventListener("click", ()=>{
    currentMonth++;
    if(currentMonth>11){
      currentMonth=0;
      const ys=getAvailableYears(); const idx=ys.indexOf(currentYear);
      currentYear=ys[Math.min(ys.length-1,idx+1)];
    }
    yearSelector.value=String(currentYear);
    monthSelector.value=String(currentMonth);
    populateMonthYearAndRender();
  });

  todayBtn.addEventListener("click", ()=>{
    const now=new Date(); const tBs=adToBs(now); const ys=getAvailableYears();
    if(tBs.outOfRange){ currentYear=ys[0]; currentMonth=0; } else { currentYear=tBs.year; currentMonth=tBs.month; }
    yearSelector.value=String(currentYear);
    monthSelector.value=String(currentMonth);
    populateMonthYearAndRender();
  });

  yearSelector.addEventListener("change", ()=>{
    currentYear=parseInt(yearSelector.value,10);
    populateMonthYearAndRender();
  });

  monthSelector.addEventListener("change", ()=>{
    currentMonth=parseInt(monthSelector.value,10);
    populateMonthYearAndRender();
  });

  window.addEventListener("keydown",(e)=>{
    if (e.key==="ArrowLeft") prevButton.click();
    if (e.key==="ArrowRight") nextButton.click();
  });
}

init();
