import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFoodPosition,
  createInitialState,
  queueDirection,
  step
} from '../src/gameLogic.js';

test('snake moves forward in current direction', () => {
  const state = createInitialState(10);
  const next = step(state, () => 0);

  assert.deepEqual(next.snake[0], { x: 6, y: 5 });
  assert.equal(next.score, 0);
  assert.equal(next.isGameOver, false);
});

test('snake grows and score increments when food is eaten', () => {
  const state = createInitialState(10);
  state.food = { x: 6, y: 5 };

  const next = step(state, () => 0);

  assert.equal(next.snake.length, state.snake.length + 1);
  assert.equal(next.score, 1);
  assert.notDeepEqual(next.food, state.food);
});

test('collision with wall ends game', () => {
  const state = {
    ...createInitialState(5),
    snake: [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }],
    direction: 'right',
    queuedDirection: 'right'
  };

  const next = step(state);

  assert.equal(next.isGameOver, true);
});

test('cannot immediately reverse direction', () => {
  const state = createInitialState(10);
  const queued = queueDirection(state, 'left');

  assert.equal(queued.queuedDirection, 'right');
});

test('food placement avoids snake cells', () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 }
  ];
  const food = createFoodPosition(3, snake, () => 0);

  assert.deepEqual(food, { x: 0, y: 1 });
});

test('collision with self ends game', () => {
  const state = {
    ...createInitialState(6),
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    direction: 'left',
    queuedDirection: 'left'
  };

  const next = step(state);

  assert.equal(next.isGameOver, true);
});
