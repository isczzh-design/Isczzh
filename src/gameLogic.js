export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITES = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

export function hashPoint(point) {
  return `${point.x},${point.y}`;
}

export function createInitialState(size = 16) {
  const mid = Math.floor(size / 2);
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid }
  ];

  return {
    size,
    snake,
    direction: 'right',
    queuedDirection: 'right',
    food: createFoodPosition(size, snake),
    score: 0,
    isGameOver: false,
    isPaused: false
  };
}

export function queueDirection(state, nextDirection) {
  if (!DIRECTIONS[nextDirection]) {
    return state;
  }

  if (OPPOSITES[state.direction] === nextDirection) {
    return state;
  }

  return { ...state, queuedDirection: nextDirection };
}

export function createFoodPosition(size, snake, random = Math.random) {
  const occupied = new Set(snake.map(hashPoint));
  const free = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        free.push({ x, y });
      }
    }
  }

  if (free.length === 0) {
    return null;
  }

  const idx = Math.floor(random() * free.length);
  return free[idx];
}

export function step(state, random = Math.random) {
  if (state.isGameOver || state.isPaused) {
    return state;
  }

  const direction = state.queuedDirection;
  const velocity = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead = {
    x: head.x + velocity.x,
    y: head.y + velocity.y
  };

  const hitsWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.size ||
    nextHead.y >= state.size;

  if (hitsWall) {
    return { ...state, isGameOver: true, direction };
  }

  const snakeWithoutTail = state.snake.slice(0, -1);
  const bodySet = new Set(snakeWithoutTail.map(hashPoint));
  const hitsSelf = bodySet.has(hashPoint(nextHead));

  if (hitsSelf) {
    return { ...state, isGameOver: true, direction };
  }

  const ateFood = state.food && hashPoint(nextHead) === hashPoint(state.food);
  const nextSnake = [nextHead, ...state.snake];

  if (!ateFood) {
    nextSnake.pop();
  }

  const nextScore = ateFood ? state.score + 1 : state.score;
  const nextFood = ateFood
    ? createFoodPosition(state.size, nextSnake, random)
    : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction,
    food: nextFood,
    score: nextScore
  };
}

export function togglePause(state) {
  if (state.isGameOver) {
    return state;
  }

  return { ...state, isPaused: !state.isPaused };
}
