# Classic Snake

Small browser-based implementation of the classic Snake game.

## Run locally

1. Start a static server from this repository root (choose one):
   - `python3 -m http.server 4173`
   - `npx serve .`
2. Open `http://localhost:4173`.

## Controls

- Arrow keys or `WASD`: move snake
- `P` or Pause button: pause / resume
- Restart button: restart game

## Test core logic

```bash
npm test
```

## Manual verification checklist

- [ ] Snake responds to Arrow keys and WASD.
- [ ] Snake grows by one segment when eating food and score increments.
- [ ] Game ends when hitting boundaries or snake body.
- [ ] Pause/resume stops and restarts movement.
- [ ] Restart resets score and snake state.
