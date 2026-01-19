const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const feedbackEl = document.getElementById("feedback");
const progressEl = document.getElementById("progress");
const progressFillEl = document.getElementById("progress-fill");
const nextBtn = document.getElementById("next");
const exitBtn = document.getElementById("exit-quiz");
const modeEl = document.getElementById("mode");
const profileSelect = document.getElementById("profile-select");

const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const reportScreen = document.getElementById("report-screen");

const startQuizBtn = document.getElementById("start-quiz");
const resumeQuizBtn = document.getElementById("resume-quiz");
const openReportBtn = document.getElementById("open-report");
const backToMenuBtn = document.getElementById("back-to-menu");

const reportSummaryEl = document.getElementById("report-summary");
const reportListEl = document.getElementById("report-list");
const reportModeFiltersEl = document.getElementById("report-mode-filters");
const reportFiltersEl = document.getElementById("report-filters");
const exportStatsBtn = document.getElementById("export-stats");
const importStatsBtn = document.getElementById("import-stats");
const importFileInput = document.getElementById("import-file");
const resetStatsBtn = document.getElementById("reset-stats");
const backToMenuTopBtn = document.getElementById("back-to-menu-top");
const reportPrevTopBtn = document.getElementById("report-prev-top");
const reportNextTopBtn = document.getElementById("report-next-top");
const reportPageInfoTop = document.getElementById("report-page-info-top");
const reportPrevBottomBtn = document.getElementById("report-prev-bottom");
const reportNextBottomBtn = document.getElementById("report-next-bottom");
const reportPageInfoBottom = document.getElementById("report-page-info-bottom");
const filterAllEl = document.getElementById("filter-all");
const filterWrongEl = document.getElementById("filter-wrong");
const filterNeverEl = document.getElementById("filter-never");
const noteInputEl = document.getElementById("note-input");

let allQuestions = [];
let sessionQuestions = [];
let current = 0;
let answered = false;
let score = 0;
let sessionMode = "start";
let sessionComplete = false;
let reportFilter = "all";
let reportMode = "all";
let reportPage = 1;

let currentQuestion = null;
let currentAnswers = [];
let selectedSet = new Set();

const DATA_FILE = "IHK_WiSo_Winter_2024_25_ALLE_Fragen_Loesungen.json";
const STATS_KEY = "wirtschaftsquiz_stats";
const PROFILE_KEY = "wirtschaftsquiz_profile";
const NOTES_KEY = "wirtschaftsquiz_notes";
const SESSION_KEY = "wirtschaftsquiz_session";
const SESSION_SIZE = 30;
const OFTEN_FALSCH_THRESHOLD = 2;
const REPORT_PAGE_SIZE = 20;
const PROFILES = ["Daniel", "Gast"];

let currentProfile = PROFILES[0];
let noteSaveTimer = null;

async function loadQuestions() {
  let data = null;
  try {
    if (window.QUESTIONS_DATA) {
      data = window.QUESTIONS_DATA;
    } else {
      const res = await fetch(DATA_FILE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    }
    const rawQuestions = Array.isArray(data)
      ? data
      : Array.isArray(data.questions)
      ? data.questions
      : [];
    allQuestions = rawQuestions.map(normalizeQuestion).filter(Boolean);
  } catch (err) {
    console.error("Fragen laden fehlgeschlagen:", err);
    allQuestions = [];
  }

  if (!allQuestions.length) {
    questionEl.textContent = "Noch keine Fragen hinterlegt.";
    answersEl.innerHTML = `<div class="empty">Trage Fragen in ${DATA_FILE} ein (siehe IDEAS.md).</div>`;
    progressEl.textContent = "0 / 0";
    nextBtn.disabled = true;
  }

  initProfiles();
  updateResumeButton();
  updateStartButtonLabel();
  setScreen("start");
  updateModeLabel("Start");
}

function normalizeQuestion(raw) {
  if (!raw) return null;
  const qText = raw.question || "";
  const type = (raw.type || "single").toLowerCase();

  if (type === "number") {
    const solution = typeof raw.solution === "number" ? raw.solution : null;
    if (solution === null) return null;
    return {
      id: createQuestionId(qText, type, []),
      question: qText,
      type,
      solution,
      hasSolution: true,
    };
  }

  if (type === "match") {
    return {
      id: createQuestionId(qText, type, []),
      question: qText,
      type,
      solution: raw.solution || {},
      hasSolution: true,
    };
  }

  const answers = Array.isArray(raw.answers) ? raw.answers : [];
  const solutionIndex =
    typeof raw.solution === "number" ? raw.solution - 1 : null;
  const solutionSet =
    Array.isArray(raw.solution) && raw.solution.length
      ? new Set(raw.solution.map((n) => n - 1))
      : null;

  const normalizedAnswers = answers
    .map((ans, idx) => {
      if (typeof ans === "string") {
        const correct = solutionSet
          ? solutionSet.has(idx)
          : solutionIndex === idx;
        return { text: ans, correct };
      }
      if (ans && typeof ans === "object") {
        const text = ans.text ?? "";
        const correct =
          ans.correct === true ||
          (solutionSet ? solutionSet.has(idx) : solutionIndex === idx);
        return { text, correct };
      }
      return null;
    })
    .filter((ans) => ans && ans.text);

  if (!normalizedAnswers.length) return null;
  const hasSolution = normalizedAnswers.some((ans) => ans.correct);

  return {
    id: createQuestionId(qText, type, normalizedAnswers.map((a) => a.text)),
    question: qText,
    type,
    answers: normalizedAnswers,
    hasSolution,
  };
}

function createQuestionId(question, type, answers) {
  const base = [question, type, ...answers].join("||");
  return `q_${hashString(base)}`;
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function setScreen(name) {
  startScreen.classList.toggle("hidden", name !== "start");
  quizScreen.classList.toggle("hidden", name !== "quiz");
  reportScreen.classList.toggle("hidden", name !== "report");
}

function updateModeLabel(label) {
  if (modeEl) modeEl.textContent = label;
}

function initProfiles() {
  if (!profileSelect) return;
  profileSelect.innerHTML = "";
  PROFILES.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    profileSelect.appendChild(opt);
  });
  const saved = localStorage.getItem(PROFILE_KEY);
  if (saved && PROFILES.includes(saved)) {
    currentProfile = saved;
  }
  profileSelect.value = currentProfile;
}

function setProfile(name) {
  if (!PROFILES.includes(name)) return;
  currentProfile = name;
  localStorage.setItem(PROFILE_KEY, name);
}

function getStatsKey() {
  return `${STATS_KEY}_${currentProfile}`;
}

function getNotesKey() {
  return `${NOTES_KEY}_${currentProfile}`;
}

function getSessionKey() {
  return `${SESSION_KEY}_${currentProfile}`;
}

function resetSessionState() {
  sessionComplete = false;
  score = 0;
  current = 0;
  selectedSet = new Set();
  currentQuestion = null;
  currentAnswers = [];
  answered = false;
}

function startSession(mode) {
  sessionMode = mode;
  resetSessionState();
  if (mode === "practice") {
    sessionQuestions = getPracticeQuestions(SESSION_SIZE);
    updateModeLabel("Uebungsmodus");
  } else {
    sessionQuestions = getRandomQuestions(SESSION_SIZE);
    updateModeLabel("Quiz");
  }

  setScreen("quiz");
  clearSavedSession();

  if (!sessionQuestions.length) {
    renderEmptySession();
    return;
  }

  renderQuestion();
}

function startFilteredQuiz() {
  const filters = getPracticeFilters();
  if (!filters.all && (filters.wrong || filters.never)) {
    sessionMode = "practice";
    resetSessionState();
    sessionQuestions = getPracticeQuestions(SESSION_SIZE);
    updateModeLabel("Uebungsmodus");
    setScreen("quiz");
    clearSavedSession();
    if (!sessionQuestions.length) {
      renderEmptySession();
      return;
    }
    renderQuestion();
    return;
  }
  startSession("quiz");
}

function getRandomQuestions(count) {
  const pool = [...allQuestions];
  shuffle(pool);
  return pool.slice(0, Math.min(count, pool.length));
}

function getPracticeQuestions(count) {
  const stats = getStats();
  const filters = getPracticeFilters();
  const withStats = allQuestions
    .map((q) => ({
      question: q,
      stats: stats[q.id] || { attempts: 0, correct: 0, incorrect: 0 },
    }))
    .filter((entry) => matchesPracticeFilter(entry, filters));

  withStats.sort((a, b) => {
    if (b.stats.incorrect !== a.stats.incorrect) {
      return b.stats.incorrect - a.stats.incorrect;
    }
    return b.stats.attempts - a.stats.attempts;
  });

  return withStats.slice(0, count).map((entry) => entry.question);
}

function getPracticeFilters() {
  return {
    all: filterAllEl?.checked ?? true,
    wrong: filterWrongEl?.checked ?? false,
    never: filterNeverEl?.checked ?? false,
  };
}

function matchesPracticeFilter(entry, filters) {
  const isWrong = entry.stats.incorrect > 0;
  const isNever = entry.stats.attempts === 0;

  if (filters.all) return true;

  const anySelected = filters.wrong || filters.never;
  if (!anySelected) return true;

  let statusMatch = true;
  if (filters.wrong || filters.never) {
    statusMatch = (filters.wrong && isWrong) || (filters.never && isNever);
  }

  return statusMatch;
}

function getFilterLabel(filters) {
  if (filters.wrong) return "Nur falsch";
  if (filters.never) return "Nur nie";
  return "Alles";
}

function updateStartButtonLabel() {
  if (!startQuizBtn) return;
  const label = getFilterLabel(getPracticeFilters());
  startQuizBtn.textContent = `Quiz starten (${label})`;
}

function updateProgress(currentIndex, total) {
  if (total <= 0) {
    progressEl.textContent = "0 / 0";
    if (progressFillEl) progressFillEl.style.width = "0%";
    return;
  }
  const shown = currentIndex + 1;
  const remaining = Math.max(total - shown, 0);
  progressEl.textContent = `Frage ${shown} von ${total} • Rest: ${remaining}`;
  if (progressFillEl) {
    const pct = Math.round((shown / total) * 100);
    progressFillEl.style.width = `${pct}%`;
  }
}

function renderQuestion() {
  if (!sessionQuestions.length) {
    renderEmptySession();
    return;
  }

  currentQuestion = sessionQuestions[current];
  updateProgress(current, sessionQuestions.length);
  questionEl.textContent = currentQuestion.question || "(Frage fehlt)";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  answersEl.innerHTML = "";
  answered = false;
  currentAnswers = [];
  selectedSet = new Set();
  nextBtn.disabled = true;
  nextBtn.textContent = "Pruefen";

  if (currentQuestion.type === "match") {
    renderMatchQuestion();
    return;
  }

  if (currentQuestion.type === "number") {
    renderNumberQuestion(currentQuestion);
    nextBtn.textContent = "Weiter";
    loadNoteForQuestion(currentQuestion);
    saveSessionState();
    return;
  }

  const shuffled = [...(currentQuestion.answers || [])];
  shuffle(shuffled);
  currentAnswers = shuffled;
  shuffled.forEach((ans, idx) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = ans.text || "(Antwort fehlt)";
    btn.addEventListener("click", () => {
      if (answered) return;
      if (selectedSet.has(idx)) {
        selectedSet.delete(idx);
        btn.classList.remove("selected");
      } else {
        selectedSet.add(idx);
        btn.classList.add("selected");
      }
      nextBtn.disabled = selectedSet.size === 0;
      nextBtn.textContent = "Pruefen";
    });
    answersEl.appendChild(btn);
  });

  loadNoteForQuestion(currentQuestion);
  saveSessionState();
}

function renderEmptySession() {
  currentQuestion = null;
  sessionComplete = true;
  updateProgress(0, 0);
  questionEl.textContent =
    sessionMode === "practice"
      ? "Noch keine falsch beantworteten Fragen."
      : "Keine Fragen verfuegbar.";
  answersEl.innerHTML = `<div class="empty">Wiederhole ein Quiz, um Daten zu sammeln.</div>`;
  feedbackEl.textContent = "";
  if (noteInputEl) {
    noteInputEl.value = "";
    noteInputEl.disabled = true;
  }
  nextBtn.disabled = false;
  nextBtn.textContent = "Zur Startseite";
}

function showSessionEnd() {
  sessionComplete = true;
  updateProgress(sessionQuestions.length - 1, sessionQuestions.length);
  questionEl.textContent = "Quiz beendet.";
  const total = sessionQuestions.length;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const modeLabel = sessionMode === "practice" ? "Uebung" : "Quiz";
  answersEl.innerHTML = `
    <div class="result-card">
      <div class="result-score">${score} / ${total}</div>
      <div class="result-percent">${pct}% richtig</div>
      <div class="result-meta">Modus: ${modeLabel} • ${total - score} falsch</div>
    </div>
  `;
  feedbackEl.textContent = "";
  if (noteInputEl) {
    noteInputEl.value = "";
    noteInputEl.disabled = true;
  }
  nextBtn.disabled = false;
  nextBtn.textContent = "Zur Startseite";
  clearSavedSession();
}

function checkChoiceAnswer() {
  if (answered) return;
  if (currentQuestion?.hasSolution === false) {
    answered = true;
    const buttons = Array.from(document.querySelectorAll(".answer-btn"));
    buttons.forEach((b) => (b.disabled = true));
    feedbackEl.textContent = "Keine Loesung hinterlegt.";
    nextBtn.disabled = false;
    nextBtn.textContent = "Weiter";
    recordAnswer(currentQuestion, false);
    return;
  }

  if (!selectedSet.size) {
    feedbackEl.textContent = "Bitte waehle mindestens eine Antwort.";
    feedbackEl.classList.add("fail");
    return;
  }

  answered = true;
  const buttons = Array.from(document.querySelectorAll(".answer-btn"));
  buttons.forEach((b) => (b.disabled = true));

  const allCorrect = currentAnswers.every((ans, idx) =>
    ans.correct ? selectedSet.has(idx) : !selectedSet.has(idx)
  );

  buttons.forEach((b, idx) => {
    const ans = currentAnswers[idx];
    if (!ans) return;
    if (ans.correct) b.classList.add("correct");
    if (selectedSet.has(idx) && !ans.correct) b.classList.add("incorrect");
  });

  feedbackEl.textContent = allCorrect ? "Richtig!" : "Falsch.";
  feedbackEl.classList.add(allCorrect ? "ok" : "fail");
  if (allCorrect) score += 1;
  recordAnswer(currentQuestion, allCorrect);
  nextBtn.disabled = false;
  nextBtn.textContent = "Weiter";
  saveSessionState();
}

function renderMatchQuestion() {
  feedbackEl.textContent =
    "Dieser Fragetyp (Zuordnung) wird derzeit nicht unterstuetzt.";
  feedbackEl.classList.add("fail");
  answersEl.innerHTML = `<div class="empty">Bitte Frage manuell pruefen.</div>`;
  answered = true;
  if (currentQuestion) loadNoteForQuestion(currentQuestion);
  nextBtn.disabled = false;
  nextBtn.textContent = "Weiter";
}

function renderNumberQuestion(q) {
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "numeric";
  input.placeholder = "Antwort eingeben";

  const btn = document.createElement("button");
  btn.className = "answer-btn";
  btn.textContent = "Pruefen";
  btn.addEventListener("click", () => handleNumericAnswer(input, btn, q));

  const wrapper = document.createElement("div");
  wrapper.className = "number-wrapper";
  wrapper.appendChild(input);

  answersEl.appendChild(wrapper);
  answersEl.appendChild(btn);
}

function handleNumericAnswer(input, btn, question) {
  if (answered) return;
  const value = Number(input.value);
  if (Number.isNaN(value)) {
    feedbackEl.textContent = "Bitte gib eine Zahl ein.";
    feedbackEl.classList.add("fail");
    return;
  }
  answered = true;
  input.disabled = true;
  btn.disabled = true;
  const correct = value === Number(question.solution);
  feedbackEl.textContent = correct ? "Richtig!" : "Falsch.";
  feedbackEl.classList.add(correct ? "ok" : "fail");
  if (!correct) {
    const hint = document.createElement("div");
    hint.className = "feedback-hint";
    hint.textContent = `Korrekt: ${question.solution}`;
    feedbackEl.appendChild(hint);
  } else {
    score += 1;
  }
  recordAnswer(question, correct);
  nextBtn.disabled = false;
  nextBtn.textContent = "Weiter";
  saveSessionState();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getStats() {
  try {
    const data = localStorage.getItem(getStatsKey());
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.warn("Statistik konnte nicht geladen werden:", err);
    return {};
  }
}

function saveStats(stats) {
  localStorage.setItem(getStatsKey(), JSON.stringify(stats));
}

function recordAnswer(question, correct, mode = sessionMode) {
  if (!question?.id) return;
  const stats = getStats();
  const entry = stats[question.id] || {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    modes: {},
  };
  entry.attempts += 1;
  if (correct) entry.correct += 1;
  else entry.incorrect += 1;
  if (mode) {
    if (!entry.modes) entry.modes = {};
    const modeEntry = entry.modes[mode] || {
      attempts: 0,
      correct: 0,
      incorrect: 0,
    };
    modeEntry.attempts += 1;
    if (correct) modeEntry.correct += 1;
    else modeEntry.incorrect += 1;
    entry.modes[mode] = modeEntry;
  }
  stats[question.id] = entry;
  saveStats(stats);
}

function getNotes() {
  try {
    const data = localStorage.getItem(getNotesKey());
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.warn("Notizen konnten nicht geladen werden:", err);
    return {};
  }
}

function saveNotes(notes) {
  localStorage.setItem(getNotesKey(), JSON.stringify(notes));
}

function loadNoteForQuestion(question) {
  if (!noteInputEl) return;
  noteInputEl.disabled = false;
  const notes = getNotes();
  noteInputEl.value = notes[question.id] || "";
}

function scheduleNoteSave() {
  if (!noteInputEl || !currentQuestion) return;
  if (noteSaveTimer) window.clearTimeout(noteSaveTimer);
  noteSaveTimer = window.setTimeout(() => {
    const notes = getNotes();
    const value = noteInputEl.value.trim();
    if (value) notes[currentQuestion.id] = value;
    else delete notes[currentQuestion.id];
    saveNotes(notes);
  }, 300);
}

function saveSessionState() {
  if (!sessionQuestions.length || sessionComplete) return;
  const payload = {
    mode: sessionMode,
    ids: sessionQuestions.map((q) => q.id),
    current,
    score,
    savedAt: Date.now(),
  };
  localStorage.setItem(getSessionKey(), JSON.stringify(payload));
  updateResumeButton();
}

function loadSessionState() {
  try {
    const data = localStorage.getItem(getSessionKey());
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.warn("Session konnte nicht geladen werden:", err);
    return null;
  }
}

function clearSavedSession() {
  localStorage.removeItem(getSessionKey());
  updateResumeButton();
}

function resumeSession() {
  const data = loadSessionState();
  if (!data || !Array.isArray(data.ids) || !data.ids.length) return;
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
  const mapped = data.ids.map((id) => questionMap.get(id)).filter(Boolean);
  if (!mapped.length) return;

  sessionMode = data.mode || "quiz";
  sessionQuestions = mapped;
  current = Math.min(Math.max(Number(data.current) || 0, 0), mapped.length - 1);
  score = Number(data.score) || 0;
  sessionComplete = false;

  updateModeLabel(sessionMode === "practice" ? "Uebungsmodus" : "Quiz");
  setScreen("quiz");
  renderQuestion();
}

function updateResumeButton() {
  if (!resumeQuizBtn) return;
  const data = loadSessionState();
  resumeQuizBtn.disabled = !data;
}

function getStatsForMode(entry, mode) {
  if (mode === "all") return entry.stats;
  const modes = entry.stats.modes || {};
  return modes[mode] || { attempts: 0, correct: 0, incorrect: 0 };
}

function filterRows(rows, filter, mode) {
  if (filter === "correct") {
    return rows.filter((row) => getStatsForMode(row, mode).correct > 0);
  }
  if (filter === "wrong") {
    return rows.filter((row) => getStatsForMode(row, mode).incorrect > 0);
  }
  if (filter === "often") {
    return rows.filter(
      (row) => getStatsForMode(row, mode).incorrect >= OFTEN_FALSCH_THRESHOLD
    );
  }
  if (filter === "never") {
    return rows.filter((row) => getStatsForMode(row, mode).attempts === 0);
  }
  return rows;
}

function renderReport(filter = reportFilter, mode = reportMode) {
  const stats = getStats();
  reportListEl.innerHTML = "";
  reportFilter = filter;
  reportMode = mode;

  const rows = allQuestions.map((q) => {
    const entry = stats[q.id] || { attempts: 0, correct: 0, incorrect: 0 };
    return { question: q, stats: entry };
  });

  rows.sort((a, b) => {
    if (b.stats.attempts !== a.stats.attempts) {
      return b.stats.attempts - a.stats.attempts;
    }
    return b.stats.incorrect - a.stats.incorrect;
  });

  const totals = rows.reduce(
    (acc, row) => {
      const modeStats = getStatsForMode(row, reportMode);
      acc.attempts += modeStats.attempts;
      acc.correct += modeStats.correct;
      acc.incorrect += modeStats.incorrect;
      return acc;
    },
    { attempts: 0, correct: 0, incorrect: 0 }
  );

  const accuracy = totals.attempts
    ? Math.round((totals.correct / totals.attempts) * 100)
    : 0;

  reportSummaryEl.textContent =
    totals.attempts === 0
      ? "Noch keine Auswertungen vorhanden."
      : `Beantwortet: ${totals.attempts} | Richtig: ${totals.correct} | Falsch: ${totals.incorrect} | Treffer: ${accuracy}%`;

  const list = filterRows(rows, reportFilter, reportMode);
  const totalPages = Math.max(
    1,
    Math.ceil(list.length / REPORT_PAGE_SIZE)
  );
  reportPage = Math.min(Math.max(reportPage, 1), totalPages);
  const startIndex = (reportPage - 1) * REPORT_PAGE_SIZE;
  const pageItems = list.slice(startIndex, startIndex + REPORT_PAGE_SIZE);
  const filterLabel =
    reportFilter === "correct"
      ? "Filter: Nur richtig"
      : reportFilter === "wrong"
      ? "Filter: Nur falsch"
      : reportFilter === "often"
      ? `Filter: Oft falsch (>= ${OFTEN_FALSCH_THRESHOLD})`
      : reportFilter === "never"
      ? "Filter: Nie beantwortet"
      : "Filter: Alle";
  const modeLabel =
    reportMode === "quiz"
      ? "Modus: Quiz"
      : reportMode === "practice"
      ? "Modus: Uebung"
      : "Modus: Alle";

  if (totals.attempts > 0 || reportFilter !== "all" || reportMode !== "all") {
    reportSummaryEl.textContent = `${reportSummaryEl.textContent} • ${modeLabel} • ${filterLabel} • Eintraege: ${list.length}`;
  }

  pageItems.forEach((row) => {
    const modeStats = getStatsForMode(row, reportMode);
    const attempts = modeStats.attempts;
    const correct = modeStats.correct;
    const incorrect = modeStats.incorrect;
    const hitRate = attempts
      ? Math.round((correct / attempts) * 100)
      : 0;

    const item = document.createElement("div");
    item.className = "report-row";

    const question = document.createElement("div");
    question.className = "report-question";
    question.textContent = row.question.question || "(Frage fehlt)";

    const meta = document.createElement("div");
    meta.className = "report-meta";
    meta.textContent = `Beantwortet: ${attempts} | Richtig: ${correct} | Falsch: ${incorrect} | Treffer: ${hitRate}%`;

    item.appendChild(question);
    item.appendChild(meta);
    reportListEl.appendChild(item);
  });

  updateReportPager(totalPages);
}

function updateReportPager(totalPages) {
  const info = `Seite ${reportPage} / ${totalPages}`;
  if (reportPageInfoTop) reportPageInfoTop.textContent = info;
  if (reportPageInfoBottom) reportPageInfoBottom.textContent = info;
  const prevDisabled = reportPage <= 1;
  const nextDisabled = reportPage >= totalPages;
  if (reportPrevTopBtn) reportPrevTopBtn.disabled = prevDisabled;
  if (reportPrevBottomBtn) reportPrevBottomBtn.disabled = prevDisabled;
  if (reportNextTopBtn) reportNextTopBtn.disabled = nextDisabled;
  if (reportNextBottomBtn) reportNextBottomBtn.disabled = nextDisabled;
}

function setActiveFilter(filter) {
  const buttons = reportFiltersEl?.querySelectorAll(".filter-btn") || [];
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
}

function exportStats() {
  const stats = getStats();
  const payload = {
    profile: currentProfile,
    exportedAt: new Date().toISOString(),
    stats,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 10);
  link.href = URL.createObjectURL(blob);
  link.download = `wirtschaftsquiz-${currentProfile.toLowerCase()}-${ts}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function importStats(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const rawStats = data && data.stats ? data.stats : data;
      const sanitized = sanitizeStats(rawStats);
      saveStats(sanitized);
      renderReport(reportFilter);
      alert("Statistiken importiert.");
    } catch (err) {
      alert("Import fehlgeschlagen: Ungueltige Datei.");
      console.error("Import fehlgeschlagen:", err);
    }
  };
  reader.readAsText(file);
}

function sanitizeStats(data) {
  if (!data || typeof data !== "object") return {};
  const sanitized = {};
  Object.entries(data).forEach(([key, value]) => {
    if (!value || typeof value !== "object") return;
    const attempts = Number(value.attempts) || 0;
    const correct = Number(value.correct) || 0;
    const incorrect = Number(value.incorrect) || 0;
    sanitized[key] = {
      attempts: Math.max(attempts, 0),
      correct: Math.max(correct, 0),
      incorrect: Math.max(incorrect, 0),
    };
  });
  return sanitized;
}

function resetStats() {
  if (!confirm("Moechtest du alle Auswertungen wirklich loeschen?")) return;
  localStorage.removeItem(getStatsKey());
  renderReport(reportFilter);
}

startQuizBtn.addEventListener("click", startFilteredQuiz);
resumeQuizBtn?.addEventListener("click", resumeSession);
openReportBtn.addEventListener("click", () => {
  reportPage = 1;
  setActiveFilter(reportFilter);
  setActiveModeFilter(reportMode);
  renderReport(reportFilter, reportMode);
  setScreen("report");
  updateModeLabel("Auswertung");
});

backToMenuBtn.addEventListener("click", () => {
  setScreen("start");
  updateModeLabel("Start");
});

backToMenuTopBtn?.addEventListener("click", () => {
  setScreen("start");
  updateModeLabel("Start");
});

exitBtn.addEventListener("click", () => {
  setScreen("start");
  updateModeLabel("Start");
});

profileSelect?.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  const nextProfile = target.value;
  if (nextProfile === currentProfile) return;

  const inQuiz = !quizScreen.classList.contains("hidden") && !sessionComplete;
  if (inQuiz) {
    const ok = confirm("Profilwechsel beendet das aktuelle Quiz. Fortfahren?");
    if (!ok) {
      target.value = currentProfile;
      return;
    }
  }

  setProfile(nextProfile);
  updateResumeButton();
  setScreen("start");
  updateModeLabel("Start");
  if (!reportScreen.classList.contains("hidden")) {
    renderReport(reportFilter);
  }
});

noteInputEl?.addEventListener("input", scheduleNoteSave);
[filterAllEl, filterWrongEl, filterNeverEl].forEach((el) => {
  el?.addEventListener("change", updateStartButtonLabel);
});

reportFiltersEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("filter-btn")) return;
  const filter = target.dataset.filter || "all";
  setActiveFilter(filter);
  reportPage = 1;
  renderReport(filter, reportMode);
});

function setActiveModeFilter(mode) {
  const buttons = reportModeFiltersEl?.querySelectorAll(".filter-btn") || [];
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}

reportModeFiltersEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("filter-btn")) return;
  const mode = target.dataset.mode || "all";
  setActiveModeFilter(mode);
  reportPage = 1;
  renderReport(reportFilter, mode);
});

function goToReportPage(delta) {
  reportPage = Math.max(1, reportPage + delta);
  renderReport(reportFilter, reportMode);
}

reportPrevTopBtn?.addEventListener("click", () => goToReportPage(-1));
reportNextTopBtn?.addEventListener("click", () => goToReportPage(1));
reportPrevBottomBtn?.addEventListener("click", () => goToReportPage(-1));
reportNextBottomBtn?.addEventListener("click", () => goToReportPage(1));

exportStatsBtn?.addEventListener("click", exportStats);
importStatsBtn?.addEventListener("click", () => importFileInput?.click());
importFileInput?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importStats(file);
  event.target.value = "";
});
resetStatsBtn?.addEventListener("click", resetStats);

nextBtn.addEventListener("click", () => {
  if (!sessionQuestions.length) {
    setScreen("start");
    updateModeLabel("Start");
    return;
  }

  if (sessionComplete) {
    setScreen("start");
    updateModeLabel("Start");
    updateResumeButton();
    return;
  }

  if (currentQuestion && !["number", "match"].includes(currentQuestion.type)) {
    if (!answered) {
      checkChoiceAnswer();
      return;
    }
  }

  if (current >= sessionQuestions.length - 1) {
    showSessionEnd();
    return;
  }

  current += 1;
  renderQuestion();
});

loadQuestions();
