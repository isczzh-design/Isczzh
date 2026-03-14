export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDateKey(date = new Date()) {
  return startOfDay(date).toISOString().slice(0, 10);
}

export function addDays(dateKey, days) {
  const d = startOfDay(new Date(`${dateKey}T00:00:00`));
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

export function normalizeWord(raw, source = 'unknown') {
  return {
    id: raw.id || `${source}:${raw.word}`,
    source,
    word: raw.word,
    chinese: raw.chinese,
    sentence: raw.sentence,
    sentenceChinese: raw.sentenceChinese || '',
    level: raw.level || 'general'
  };
}

export function createWordProgress(id) {
  return {
    id,
    stage: -1,
    dueDate: null,
    modeStatus: {
      meaning: false,
      cloze: false
    },
    completed: false,
    attempts: 0,
    wrong: 0,
    lastStudiedAt: null,
    cycleCompletedAt: null
  };
}

export function ensureProgress(map, wordId) {
  if (!map[wordId]) {
    map[wordId] = createWordProgress(wordId);
  }
  return map[wordId];
}

export function advanceAfterCycle(progress, todayKey) {
  if (progress.stage === -1) {
    progress.stage = 0;
    progress.dueDate = addDays(todayKey, REVIEW_INTERVALS[0]);
  } else if (progress.stage < REVIEW_INTERVALS.length - 1) {
    progress.stage += 1;
    progress.dueDate = addDays(todayKey, REVIEW_INTERVALS[progress.stage]);
  } else {
    progress.stage = REVIEW_INTERVALS.length;
    progress.completed = true;
    progress.dueDate = null;
  }

  progress.modeStatus = { meaning: false, cloze: false };
  progress.lastStudiedAt = todayKey;
  progress.cycleCompletedAt = todayKey;
  return progress;
}

export function markModeResult(progress, mode, isCorrect, todayKey) {
  progress.attempts += 1;
  if (!isCorrect) {
    progress.wrong += 1;
    return { finishedCycle: false };
  }

  progress.modeStatus[mode] = true;

  if (progress.modeStatus.meaning && progress.modeStatus.cloze) {
    advanceAfterCycle(progress, todayKey);
    return { finishedCycle: true };
  }

  return { finishedCycle: false };
}

export function pickTodayQueue(words, progressMap, todayKey) {
  const review = [];
  const fresh = [];

  for (const word of words) {
    const progress = ensureProgress(progressMap, word.id);
    if (progress.completed) continue;

    if (progress.stage === -1) {
      fresh.push(word);
      continue;
    }

    if (progress.dueDate && progress.dueDate <= todayKey) {
      review.push(word);
    }
  }

  return { review, fresh };
}

export function accuracy(progressMap) {
  let attempts = 0;
  let wrong = 0;
  Object.values(progressMap).forEach((item) => {
    attempts += item.attempts || 0;
    wrong += item.wrong || 0;
  });

  if (attempts === 0) {
    return { attempts: 0, wrong: 0, accuracy: 100 };
  }

  return {
    attempts,
    wrong,
    accuracy: Number((((attempts - wrong) / attempts) * 100).toFixed(1))
  };
}

export function maskSentence(sentence, word) {
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  return sentence.replace(regex, '____');
}

export function tokenizeSentence(sentence) {
  const tokens = sentence.match(/[A-Za-z']+|[^A-Za-z']+/g) || [];
  return tokens;
}
