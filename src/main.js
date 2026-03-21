import {
  accuracy,
  ensureProgress,
  formatDateKey,
  markModeResult,
  maskSentence,
  normalizeWord,
  pickTodayQueue,
  tokenizeSentence
} from './appLogic.js';

const BANK_ENDPOINTS = {
  ielts:
    'https://raw.githubusercontent.com/words-analyzer/open-vocab-data/main/ielts.json',
  toefl:
    'https://raw.githubusercontent.com/words-analyzer/open-vocab-data/main/toefl.json'
};

const FALLBACK_BANKS = {
  ielts: [
    {
      word: 'consecutive',
      chinese: '连续的',
      sentence: 'She worked for five consecutive days before taking a break.',
      sentenceChinese: '她连续工作了五天后才休息。'
    },
    {
      word: 'allocate',
      chinese: '分配',
      sentence: 'The government plans to allocate more funds to education.',
      sentenceChinese: '政府计划将更多资金分配给教育。'
    },
    {
      word: 'coherent',
      chinese: '连贯的',
      sentence: 'Your argument is clear and coherent in the final paragraph.',
      sentenceChinese: '你的论点在最后一段清晰且连贯。'
    }
  ],
  toefl: [
    {
      word: 'subsequent',
      chinese: '随后的',
      sentence: 'The subsequent chapter explains the experiment in detail.',
      sentenceChinese: '后续章节详细解释了这个实验。'
    },
    {
      word: 'justify',
      chinese: '证明…合理',
      sentence: 'Researchers must justify each step in their methodology.',
      sentenceChinese: '研究人员必须证明其方法中每一步都是合理的。'
    },
    {
      word: 'compensate',
      chinese: '补偿',
      sentence: 'The company offered free lessons to compensate for the delay.',
      sentenceChinese: '公司提供免费课程来补偿延迟。'
    }
  ]
};

const BUILTIN_WORD_HINTS = {
  she: '她',
  worked: '工作（过去式）',
  for: '为了/持续',
  five: '五',
  days: '天',
  before: '在…之前',
  taking: '进行/采取',
  break: '休息',
  the: '这/该（定冠词）',
  government: '政府',
  plans: '计划',
  more: '更多',
  funds: '资金',
  to: '到/用于',
  education: '教育',
  your: '你的',
  argument: '论点',
  is: '是',
  clear: '清晰的',
  and: '并且',
  in: '在…中',
  final: '最后的',
  paragraph: '段落'
};

const STORAGE_KEY = 'vocab-review-app-v2';

const bankSelect = document.querySelector('#bank-select');
const loadBtn = document.querySelector('#load-btn');
const statusEl = document.querySelector('#status');
const sentenceEl = document.querySelector('#sentence');
const meaningEl = document.querySelector('#meaning');
const promptEl = document.querySelector('#prompt');
const sentenceZhEl = document.querySelector('#sentence-zh');
const answerInput = document.querySelector('#answer');
const submitBtn = document.querySelector('#submit-btn');
const skipBtn = document.querySelector('#skip-btn');
const hintBtn = document.querySelector('#hint-btn');
const speakWordBtn = document.querySelector('#speak-word-btn');
const speakSentenceBtn = document.querySelector('#speak-sentence-btn');
const modeBadge = document.querySelector('#mode-badge');
const dueCountEl = document.querySelector('#due-count');
const newCountEl = document.querySelector('#new-count');
const todayTargetEl = document.querySelector('#today-target');
const rememberedTodayEl = document.querySelector('#remembered-today');
const accuracyEl = document.querySelector('#accuracy');
const wrongEl = document.querySelector('#wrong-count');
const attemptsEl = document.querySelector('#attempt-count');
const wordHintEl = document.querySelector('#word-hint');

const state = {
  words: [],
  progressMap: {},
  today: formatDateKey(new Date()),
  queue: [],
  queueMeta: { reviewCount: 0, freshCount: 0 },
  activeWord: null,
  activeMode: 'meaning',
  translationHintUsed: false,
  rememberedToday: new Set(),
  wordMeaningCache: {}
};

function saveLocal() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      progressMap: state.progressMap,
      selectedBank: bankSelect.value,
      rememberedToday: Array.from(state.rememberedToday),
      rememberedDate: state.today,
      wordMeaningCache: state.wordMeaningCache
    })
  );
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.progressMap = parsed.progressMap || {};
    state.wordMeaningCache = parsed.wordMeaningCache || {};

    if (parsed.selectedBank) {
      bankSelect.value = parsed.selectedBank;
    }

    if (parsed.rememberedDate === state.today) {
      state.rememberedToday = new Set(parsed.rememberedToday || []);
    }
  } catch {
    state.progressMap = {};
    state.wordMeaningCache = {};
  }
}

async function loadWordBank(bank) {
  const url = BANK_ENDPOINTS[bank];
  if (!url) return FALLBACK_BANKS[bank] || [];

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('remote bank unavailable');
    const payload = await resp.json();
    return payload;
  } catch {
    statusEl.textContent = '在线词库加载失败，已切换到内置词库。';
    return FALLBACK_BANKS[bank] || [];
  }
}

function buildQueue() {
  const { review, fresh } = pickTodayQueue(state.words, state.progressMap, state.today);
  state.queue = [...review, ...fresh];
  state.queueMeta = { reviewCount: review.length, freshCount: fresh.length };

  dueCountEl.textContent = String(review.length);
  newCountEl.textContent = String(fresh.length);
  todayTargetEl.textContent = String(review.length + fresh.length);
}

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    statusEl.textContent = '当前浏览器不支持语音朗读。';
    return;
  }

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

function sanitize(word) {
  return word.toLowerCase().replace(/[^a-z']/g, '');
}

async function lookupWordMeaning(word) {
  const key = sanitize(word);
  if (!key) return '无法识别该词';
  if (state.wordMeaningCache[key]) return state.wordMeaningCache[key];
  if (BUILTIN_WORD_HINTS[key]) {
    state.wordMeaningCache[key] = BUILTIN_WORD_HINTS[key];
    return BUILTIN_WORD_HINTS[key];
  }

  try {
    const resp = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(key)}&langpair=en|zh-CN`
    );
    const data = await resp.json();
    const translated = data?.responseData?.translatedText || '暂无释义';
    state.wordMeaningCache[key] = translated;
    saveLocal();
    return translated;
  } catch {
    return '暂时无法查询该词中文释义';
  }
}

function sentenceTokensHTML(sentence, highlightWord) {
  const tokens = tokenizeSentence(sentence);
  return tokens
    .map((token) => {
      if (!/[A-Za-z']+/.test(token)) {
        return `<span>${token}</span>`;
      }

      const clean = sanitize(token);
      const isTarget = clean === sanitize(highlightWord);
      const classes = isTarget ? 'token token--word-highlight' : 'token';
      return `<button class="${classes}" type="button" data-word="${token}">${token}</button>`;
    })
    .join('');
}

function setSentenceChinese(text) {
  sentenceZhEl.textContent = text || '暂无句子中文释义';
}

function renderQuestion() {
  if (!state.activeWord) return;

  const word = state.activeWord;
  const progress = ensureProgress(state.progressMap, word.id);
  const isFreshWord = progress.stage === -1;

  answerInput.value = '';
  wordHintEl.textContent = '点击句子中的任意英文词，可查看中文释义。';
  hintBtn.disabled = isFreshWord;

  if (state.activeMode === 'meaning') {
    modeBadge.textContent = '模式1：句子 + 红词 -> 输入中文';
    sentenceEl.innerHTML = sentenceTokensHTML(word.sentence, word.word);
    meaningEl.textContent = `目标词：${word.word}（中文：${word.chinese}）`;
    promptEl.textContent = '请输入目标单词的中文意思（支持关键词匹配）。';
  } else {
    modeBadge.textContent = '模式2：中文 -> 句子填空';
    sentenceEl.innerHTML = sentenceTokensHTML(maskSentence(word.sentence, word.word), word.word);
    meaningEl.textContent = `中文提示：${word.chinese}`;
    promptEl.textContent = '请在空格处填写正确英文单词。';
  }

  if (isFreshWord) {
    setSentenceChinese(word.sentenceChinese);
  } else if (state.translationHintUsed) {
    setSentenceChinese(word.sentenceChinese);
  } else {
    sentenceZhEl.textContent = '复习中：可点击“句子提示”查看中文释义（一次显示）。';
  }

  const stats = accuracy(state.progressMap);
  accuracyEl.textContent = `${stats.accuracy}%`;
  wrongEl.textContent = String(stats.wrong);
  attemptsEl.textContent = String(stats.attempts);
  rememberedTodayEl.textContent = String(state.rememberedToday.size);

  if (!isFreshWord && progress.dueDate) {
    statusEl.textContent = `该词为复习任务，到期时间：${progress.dueDate}`;
  } else {
    statusEl.textContent = '新词学习：需完成两种模式后进入记忆曲线。';
  }
}

function setNextWord() {
  state.translationHintUsed = false;

  if (state.queue.length === 0) {
    state.activeWord = null;
    sentenceEl.textContent = '今天任务完成，明天继续！';
    meaningEl.textContent = '';
    promptEl.textContent = '';
    sentenceZhEl.textContent = '';
    modeBadge.textContent = 'Done';
    return;
  }

  state.activeWord = state.queue[0];
  const progress = ensureProgress(state.progressMap, state.activeWord.id);
  state.activeMode = progress.modeStatus.meaning ? 'cloze' : 'meaning';
  renderQuestion();
}

function isCorrectAnswer(word, input, mode) {
  const cleanedInput = input.trim().toLowerCase();
  if (!cleanedInput) return false;

  if (mode === 'meaning') {
    return word.chinese.toLowerCase().includes(cleanedInput);
  }

  return cleanedInput === word.word.toLowerCase();
}

function submitAnswer() {
  if (!state.activeWord) return;

  const progress = ensureProgress(state.progressMap, state.activeWord.id);
  const ok = isCorrectAnswer(state.activeWord, answerInput.value, state.activeMode);
  const result = markModeResult(progress, state.activeMode, ok, state.today);

  if (!ok) {
    statusEl.textContent = '回答不正确，请再试一次。';
    saveLocal();
    renderQuestion();
    return;
  }

  if (progress.modeStatus.meaning && !progress.modeStatus.cloze) {
    state.activeMode = 'cloze';
    statusEl.textContent = '模式1已通过，进入模式2。';
    saveLocal();
    renderQuestion();
    return;
  }

  if (result.finishedCycle) {
    state.rememberedToday.add(state.activeWord.id);
  }

  state.queue.shift();
  saveLocal();
  buildQueue();
  setNextWord();
}

function skipWord() {
  if (!state.activeWord || state.queue.length <= 1) return;
  state.queue.push(state.queue.shift());
  statusEl.textContent = '已略过当前词，稍后会再次出现。';
  setNextWord();
}

sentenceEl.addEventListener('click', async (event) => {
  const target = event.target.closest('button[data-word]');
  if (!target) return;

  const selected = target.dataset.word || '';
  const meaning = await lookupWordMeaning(selected);
  wordHintEl.textContent = `${selected}：${meaning}`;
});

hintBtn.addEventListener('click', () => {
  if (!state.activeWord) return;
  state.translationHintUsed = true;
  setSentenceChinese(state.activeWord.sentenceChinese);
  statusEl.textContent = '已显示句子中文提示。';
});

speakWordBtn.addEventListener('click', () => {
  if (!state.activeWord) return;
  speakText(state.activeWord.word);
});

speakSentenceBtn.addEventListener('click', () => {
  if (!state.activeWord) return;
  speakText(state.activeWord.sentence);
});

loadBtn.addEventListener('click', async () => {
  const bank = bankSelect.value;
  const rawWords = await loadWordBank(bank);
  state.words = rawWords.map((item, idx) =>
    normalizeWord({
      ...item,
      id: item.id || `${bank}-${idx}`,
      sentenceChinese: item.sentenceChinese || item.sentence_zh || ''
    }, bank)
  );

  state.words.forEach((word) => ensureProgress(state.progressMap, word.id));
  buildQueue();
  setNextWord();
  saveLocal();
  statusEl.textContent = `已载入 ${bank.toUpperCase()} 词库：${state.words.length} 个词。`;
});

submitBtn.addEventListener('click', submitAnswer);
skipBtn.addEventListener('click', skipWord);

answerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitAnswer();
  }
});

loadLocal();
loadBtn.click();
