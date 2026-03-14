import {
  createInitialState,
  hashPoint,
  queueDirection,
  step,
  togglePause
} from './gameLogic.js';

const TICK_MS = 120;

const board = document.querySelector('#game-board');
const scoreEl = document.querySelector('#score');
const statusEl = document.querySelector('#status');
const restartBtn = document.querySelector('#restart-btn');
const pauseBtn = document.querySelector('#pause-btn');
const controls = document.querySelector('.controls');

let state = createInitialState(16);

function render() {
  const { size, snake, food, score, isGameOver, isPaused } = state;
  scoreEl.textContent = `${score}`;

  board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  board.textContent = '';

  const snakeSet = new Set(snake.map(hashPoint));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      if (snakeSet.has(`${x},${y}`)) {
        cell.classList.add('cell--snake');
      } else if (food && food.x === x && food.y === y) {
        cell.classList.add('cell--food');
      }

      board.appendChild(cell);
    }
  }

  if (isGameOver) {
    statusEl.textContent = 'Game over. Press Restart to try again.';
  } else if (isPaused) {
    statusEl.textContent = 'Paused.';
  } else {
    statusEl.textContent = 'Use Arrow keys or WASD to move.';
  }

  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

function setDirection(direction) {
  state = queueDirection(state, direction);
}

document.addEventListener('keydown', (event) => {
  const keyMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right'
  };

  if (event.key.toLowerCase() === 'p') {
    state = togglePause(state);
    render();
    return;
  }

  const mapped = keyMap[event.key] || keyMap[event.key.toLowerCase()];
  if (mapped) {
    event.preventDefault();
    setDirection(mapped);
  }
});

controls.addEventListener('click', (event) => {
  const target = event.target.closest('button[data-dir]');
  if (!target) {
    return;
  }

  setDirection(target.dataset.dir);
});

restartBtn.addEventListener('click', () => {
  state = createInitialState(state.size);
  render();
});

pauseBtn.addEventListener('click', () => {
  state = togglePause(state);
  render();
});

setInterval(() => {
  state = step(state);
  render();
}, TICK_MS);

render();
