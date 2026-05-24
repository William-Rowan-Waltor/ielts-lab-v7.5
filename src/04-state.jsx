const SK = "ielts_writing_lab_v1";
const CK = "ielts_lab_configs";
const AK = "ielts_lab_active";
// LOCAL date (not UTC) — was UTC-based which gave wrong "today" in UTC+7 timezones near midnight.
// Same shape (YYYY-MM-DD) so existing completedDays state remains compatible.
const localDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};
const TODAY = () => localDateStr(new Date());
const DAY_MS = 86400000;
// Subtract N calendar days from a date (DST-safe — uses date arithmetic, not millis).
const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

function defaultState() {
  return {
    startDate:TODAY(),
    completedDays:{},
    wordCache:{},
    mastery:{},
    priorityWords:[],
    bandHistory:[],
    wordsPerDay:3,
    activeSublists:[1,2,3,4,5,6,7,8,9,10],
    targetBand:7.0,
    examDate:null,
    customVocab:{},
    feedbackStyle:"coach",
    writingGoal:"",
    essays:[],   // FEATURE: archive of saved practice essays (drafts + graded)
    writingDrafts:{}, // unsaved in-progress Writing work, restored when switching tabs/pages
    writingTests:[],
    readingTests:[],
    readingDraft:{},
    readingDataset:[],
    // V5 — Per-day learning telemetry. Persists REAL progress (not just "done" boolean).
    // Shape: { "2026-05-22": { target: 3, extra: 5, words: ["analyse","approach", ...] } }
    //   target: how many words the scheduled session asked for
    //   extra:  how many ADDITIONAL words user studied past the daily limit
    //   words:  unique list of words studied today (used to dedupe & display)
    dailyStats:{}
  };
}
function loadState() {
  try {
    const r = localStorage.getItem(SK);
    if (!r) return defaultState();
    const stored = JSON.parse(r);
    // Migration: ensure new fields exist for old state
    const migrated = {
      ...defaultState(),
      ...stored,
      wordsPerDay: stored.wordsPerDay || 3,
      activeSublists: Array.isArray(stored.activeSublists) && stored.activeSublists.length > 0
        ? stored.activeSublists
        : [1,2,3,4,5,6,7,8,9,10],
      essays: Array.isArray(stored.essays) ? stored.essays : [],   // FEATURE: archive migration
      writingDrafts: (stored.writingDrafts && typeof stored.writingDrafts === "object") ? stored.writingDrafts : {},
      writingTests: Array.isArray(stored.writingTests) ? stored.writingTests : [],
      readingTests: Array.isArray(stored.readingTests) ? stored.readingTests : [],
      readingDraft: (stored.readingDraft && typeof stored.readingDraft === "object") ? stored.readingDraft : {},
      readingDataset: Array.isArray(stored.readingDataset) ? stored.readingDataset : (
        // Migrate prior readingLibrary entries (older shape) to the new dataset format
        Array.isArray(stored.readingLibrary) ? stored.readingLibrary.map(e => ({
          id: e.id,
          source: "imported",
          title: e.title,
          topic: e.topic || "",
          topicTags: [],
          level: e.level || "",
          section: 2,
          questionCount: e.questionCount || 0,
          wordCount: e.wordCount || 0,
          paragraphLabels: (e.data?.sections?.[0]?.passage?.paragraphs || []).map((_,i)=>String.fromCharCode(65+i)),
          testData: e.data,
          useAsFewShot: true,
          createdAt: e.importedAt || new Date().toISOString()
        })) : []
      ),
      dailyStats: (stored.dailyStats && typeof stored.dailyStats === "object") ? stored.dailyStats : {}  // V5: telemetry
    };
    // v6 schema migration: drop cached word entries from previous versions so they get rebuilt
    // with: distinct per-form VI+EN, non-circular EN definitions, collocation panel data.
    if (migrated.wordCache && typeof migrated.wordCache === "object") {
      const cleaned = {};
      let dropped = 0;
      for (const [k,v] of Object.entries(migrated.wordCache)) {
        if (v && typeof v === "object" && (v.version || 0) >= 7) cleaned[k] = v;
        else dropped++;
      }
      if (dropped > 0) console.info(`[cache-migration] Dropped ${dropped} pre-v7 word cache entries to apply schema upgrade.`);
      migrated.wordCache = cleaned;
    }
    return migrated;
  } catch { return defaultState(); }
}
function saveState(s) { try { localStorage.setItem(SK, JSON.stringify(s)); } catch {} }
function loadConfigs() {
  try {
    const r = localStorage.getItem(CK);
    const arr = r ? JSON.parse(r) : [];
    // Migration: auto-correct format based on URL (fixes configs saved before the format-bug fix)
    return arr.map(c => {
      if (c.url?.includes("generativelanguage.googleapis.com")) c.format = "gemini";
      else if (c.url?.includes("api.anthropic.com")) c.format = "anthropic";
      else if (!c.format) c.format = "openai";
      return c;
    });
  } catch { return []; }
}
function saveConfigs(c) { try { localStorage.setItem(CK,JSON.stringify(c)); } catch {} }
function loadActiveId() { try { return localStorage.getItem(AK)||null; } catch { return null; } }
function saveActiveId(id) { try { if (id) localStorage.setItem(AK,id); else localStorage.removeItem(AK); } catch {} }

const STORAGE_FILE_LABEL = "data/app-state.json";
const SERVER_STORAGE_ENDPOINT = "/api/storage";

function canUseFolderStorage() {
  try {
    return location.protocol.startsWith("http") && ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  } catch { return false; }
}

function makeStorageBundle(state=loadState(), configs=loadConfigs(), activeId=loadActiveId()) {
  return {
    version: 1,
    app: "ielts-writing-lab",
    updatedAt: new Date().toISOString(),
    keys: { state: SK, configs: CK, activeId: AK },
    state,
    configs,
    activeId
  };
}

function applyStorageBundle(bundle) {
  if (!bundle || typeof bundle !== "object") return null;
  const nextState = bundle.state && typeof bundle.state === "object" ? bundle.state : defaultState();
  const nextConfigs = Array.isArray(bundle.configs) ? bundle.configs : [];
  const nextActiveId = bundle.activeId || null;
  saveState(nextState);
  saveConfigs(nextConfigs);
  saveActiveId(nextActiveId);
  return { state: loadState(), configs: loadConfigs(), activeId: loadActiveId() };
}

async function loadFolderStorage() {
  if (!canUseFolderStorage()) return null;
  const res = await fetch(SERVER_STORAGE_ENDPOINT, { cache: "no-store" });
  if (!res.ok) throw new Error(`Folder storage load failed (${res.status})`);
  const data = await res.json();
  return data?.exists === false ? null : data;
}

async function saveFolderStorage(bundle) {
  if (!canUseFolderStorage()) return null;
  const res = await fetch(SERVER_STORAGE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bundle)
  });
  if (!res.ok) throw new Error(`Folder storage save failed (${res.status})`);
  return res.json();
}


function getSchedule(startDate, wordsPerDay=3, activeSublists=[1,2,3,4,5,6,7,8,9,10]) {
  const sch=[];
  const activeSet = new Set(activeSublists);
  // Pre-compute eligible word indices (filtered by active sublists, preserving AWL_WORDS order)
  const eligibleIndices = AWL_WORDS.map((w,i)=>activeSet.has(w.s)?i:-1).filter(i=>i>=0);
  // Dynamic cap: learn days = ceil(N/wpd); reviews add ~30%; +60 buffer. Min 300 for safety.
  const wpd = Math.max(1, wordsPerDay);
  const learnDays = Math.ceil(eligibleIndices.length / wpd);
  const maxIter = Math.max(300, Math.ceil(learnDays * 1.4) + 60);
  let wc=0,rg=[],al=[],dn=0;
  while (dn<maxIter) {
    const date = localDateStr(new Date(new Date(startDate).getTime()+dn*DAY_MS));
    dn++;
    const iW=dn%8===0, iR3=dn%4===0&&!iW;
    if (iW&&al.length>0) sch.push({date,type:"review7",wordIndices:[...al]});
    else if (iR3&&rg.length>0) sch.push({date,type:"review3",wordIndices:rg.slice(-3).flat()});
    else if (wc<eligibleIndices.length) {
      const ix=[];
      for (let j=0;j<wpd&&wc<eligibleIndices.length;j++,wc++) ix.push(eligibleIndices[wc]);
      rg.push(ix); if (rg.length>3) rg=rg.slice(-3); al.push(...ix);
      sch.push({date,type:"learn",wordIndices:ix});
    } else break;
  }
  return sch;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
