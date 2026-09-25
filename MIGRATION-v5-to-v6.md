# XState v5 → v6 Migration Guide

> Compares XState v5 (`^5.32.5`, commit `c9bb982`) and v6 (`^6.0.0-alpha.59`, current).
> The v6 examples reflect the current repository; the v5 blocks are reconstructed reference versions.

---

## 1. Machine Creation

### v5 — `setup()` with `assign` import

```ts
// src/counterMachine.ts — v5
import { setup, assign } from 'xstate';

export const counterMachine = setup({
  types: {
    context: {} as { counter: number; event: unknown },
    events: {} as { type: 'INC' } | { type: 'DEC' } | { type: 'TOGGLE' },
  },
  actions: {
    increment: assign({
      counter: ({ context }) => context.counter + 1,
      event: ({ event }) => event,
    }),
    decrement: assign({
      counter: ({ context }) => context.counter - 1,
      event: ({ event }) => event,
    }),
  },
  guards: {
    isNotMax: ({ context }) => context.counter < 10,
    isNotMin: ({ context }) => context.counter > 0,
  },
}).createMachine({
  id: 'counter',
  context: { counter: 0, event: undefined },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        INC: { actions: { type: 'increment' }, guard: { type: 'isNotMax' } },
        DEC: { actions: { type: 'decrement' }, guard: { type: 'isNotMin' } },
        TOGGLE: { target: 'disabled' },
      },
    },
    disabled: {
      on: { TOGGLE: { target: 'enabled' } },
    },
  },
});
```

### v6 — no `assign`, transition functions instead

```ts
// src/counterMachine.ts — v6
import { setup } from 'xstate';

const counterSetup = setup({
  types: {
    context: {} as { counter: number },
    events: {} as { type: 'INC' } | { type: 'DEC' } | { type: 'TOGGLE' },
  },
  guards: {
    canIncrement: ({ context }) => context.counter < 10,
    canDecrement: ({ context }) => context.counter > 0,
  },
});

const incAction: any = ({ context, guards }: any) => {
  if (guards.canIncrement({ context })) {
    return { context: { counter: context.counter + 1 } };
  }
  return undefined;
};
const decAction: any = ({ context, guards }: any) => {
  if (guards.canDecrement({ context })) {
    return { context: { counter: context.counter - 1 } };
  }
  return undefined;
};

export const counterMachine = counterSetup.createMachine({
  context: { counter: 0 },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        INC: incAction,
        DEC: decAction,
        TOGGLE: { target: 'disabled' },
      },
    },
    disabled: {
      on: { TOGGLE: { target: 'enabled' } },
    },
  },
});
```

**Key changes:**
| v5 | v6 |
|---|---|
| `import { setup, assign } from 'xstate'` | `import { setup } from 'xstate'` |
| Actions declared as `assign({ key: fn })` inside `setup({ actions })` | Actions are functions returned from `setup`, but **guards + assign are inlined** in transition functions |
| Transitions use `{ actions: { type }, guard: { type } }` | Transitions use **function calls** with `guards.xxx({ context })` and return `{ context: {...} }` |
| `assign` is a named export | `assign` is **not** exported in v6 |

---

## 2. Feedback Machine — inline `assign`

### v5

```ts
// src/feedbackMachine.ts — v5
import { assign, setup } from 'xstate';

export const feedbackMachine = setup({
  types: {
    context: {} as { feedback: string },
    events: {} as
      | { type: 'feedback.good' }
      | { type: 'feedback.bad' }
      | { type: 'feedback.update'; value: string }
      | { type: 'submit' }
      | { type: 'close' }
      | { type: 'back' }
      | { type: 'restart' },
  },
  guards: {
    feedbackValid: ({ context }) => context.feedback.length > 0,
  },
}).createMachine({
  id: 'feedback',
  initial: 'prompt',
  context: { feedback: '' },
  states: {
    prompt: {
      on: {
        'feedback.good': 'thanks',
        'feedback.bad': 'form',
      },
    },
    form: {
      on: {
        'feedback.update': {
          actions: assign({ feedback: ({ event }) => event.value }),
        },
        back: { target: 'prompt' },
        submit: { guard: 'feedbackValid', target: 'thanks' },
      },
    },
    thanks: {},
    closed: {
      on: {
        restart: { target: 'prompt', actions: assign({ feedback: '' }) },
      },
    },
  },
  on: { close: '.closed' },
});
```

### v6

```ts
// src/feedbackMachine.ts — v6
import { setup } from 'xstate';

const feedbackSetup = setup({
  types: {
    context: {} as { feedback: string },
    events: {} as
      | { type: 'feedback.good' }
      | { type: 'feedback.bad' }
      | { type: 'feedback.update'; value: string }
      | { type: 'submit' }
      | { type: 'close' }
      | { type: 'back' }
      | { type: 'restart' },
  },
  guards: {
    feedbackValid: ({ context }) => context.feedback.length > 0,
  },
});

const updateAction: any = ({ event }: any) => {
  return { context: { feedback: event.value } };
};
const submitAction: any = ({ context, guards }: any) => {
  if (guards.feedbackValid({ context })) {
    return { target: 'thanks' };
  }
  return undefined;
};
const restartAction: any = () => {
  return { target: 'prompt', context: { feedback: '' } };
};

export const feedbackMachine = feedbackSetup.createMachine({
  id: 'feedback',
  initial: 'prompt',
  context: { feedback: '' },
  states: {
    prompt: {
      on: {
        'feedback.good': { target: 'thanks' },
        'feedback.bad': { target: 'form' },
      },
    },
    form: {
      on: {
        'feedback.update': updateAction,
        back: { target: 'prompt' },
        submit: submitAction,
      },
    },
    thanks: {},
    closed: {
      on: { restart: restartAction },
    },
  },
  on: { close: { target: '.closed' } },
});
```

---

## 3. Controller — `UseMachine`

### v5

```ts
// xstate-lit/src/UseMachine.ts — v5
get snapshot(): SnapshotFrom<TMachine> | undefined {
  return this.actorRef?.getSnapshot?.();
}
```

### v6

```ts
// xstate-lit/src/UseMachine.ts — v6
get snapshot(): SnapshotFrom<TMachine> | undefined {
  return this.actorRef?.getSnapshot(); // no optional chaining on method call
}
```

Only one change: `getSnapshot?.()` → `getSnapshot()`. The method is guaranteed to exist in v6.

---

## 4. Components — `InspectionEvent` type

### v5 — `CounterElement.ts`

```ts
// v5
import { type InspectionEvent, type SnapshotFrom } from 'xstate';

#inspectEvents(inspEvent: InspectionEvent) {
  if (
    inspEvent.type === '@xstate.snapshot' &&
    inspEvent.event.type === 'xstate.stop'
  ) { /* ... */ }
}
```

### v6

```ts
// v6 — InspectionEvent sigue exportado, pero no cubre @xstate.snapshot
import { type InspectionEvent, type SnapshotFrom } from 'xstate';

type SnapshotInspectionEvent = {
  type: '@xstate.snapshot';
  event?: { type: string };
};

#inspectEvents(inspEvent: InspectionEvent | SnapshotInspectionEvent) {
  if (
    inspEvent.type === '@xstate.snapshot' &&
    inspEvent.event?.type === 'xstate.stop'
  ) { /* ... */ }
}
```

En `xstate@6.0.0-alpha.59`, `InspectionEvent` sigue exportado. Sin embargo,
su unión de tipos no incluye correctamente el evento `@xstate.snapshot`, aunque
el runtime puede entregarlo a `options.inspect`. Por eso conviene extenderlo
localmente con el tipo del snapshot, en lugar de degradar todo el parámetro a
`any`. La propiedad `event` debe tratarse como opcional.

---

## 5. Components — `FeedbackElement` and `@statelyai/inspect`

### v5

```ts
// src/FeedbackElement.ts — v5
import { createBrowserInspector } from '@statelyai/inspect';

const { inspect } = createBrowserInspector({ autoStart: false });

export class FeedbackElement extends LitElement {
  feedbackController = new UseMachine(this, {
    machine: feedbackMachine,
    options: { inspect },
  });
}
```

### v6

```ts
// src/FeedbackElement.ts — v6
// @statelyai/inspect removed — incompatible peer dep (needs xstate@^5)
export class FeedbackElement extends LitElement {
  feedbackController = new UseMachine(this, {
    machine: feedbackMachine,
    options: { inspect: this.#inspectEventsHandler },
    callback: this.#callbackHandler,
  });
}
```

`@statelyai/inspect@0.7.2` requires `xstate@^5`, so it cannot be used with v6.
Replace with the built-in `options.inspect` callback on the actor.

---

## 6. Package Dependencies

### v5 — `package.json`

```json
{
  "dependencies": {
    "@statelyai/inspect": "^0.7.2",
    "lit": "^3.3.3",
    "xstate": "^5.32.5"
  }
}
```

### v6

```json
{
  "dependencies": {
    "lit": "^3.3.3",
    "xstate": "^6.0.0-alpha.59"
  }
}
```

- `xstate` bumped from `^5.32.5` to `^6.0.0-alpha.59`
- `@statelyai/inspect` removed (incompatible with xstate v6)

---

## Summary

| Area | v5 | v6 |
|---|---|---|
| **Import** | `import { setup, assign } from 'xstate'` | `import { setup } from 'xstate'` |
| **`assign`** | Named export, used inside `setup({ actions })` | **Not exported** — use `{ context: {...} }` return from transition functions |
| **Guards** | `{ guard: 'name' }` or `{ guard: { type } }` in config | Inline `guards.xxx({ context })` inside transition functions |
| **Transition actions** | `{ actions: { type } }` in config | Function transitions returning `{ context }` or `{ target, context }` |
| **`getSnapshot`** | `actorRef?.getSnapshot?.()` | `actorRef?.getSnapshot()` |
| **`InspectionEvent`** | Exported from `xstate` | Sigue exportado; ampliar localmente para `@xstate.snapshot` |
| **`@statelyai/inspect`** | Compatible | Incompatible (requires xstate v5) |
| **`FeedbackElement`** | Constructor-assigned controller | Field-initialized controller with callback |
| **TypeScript** | Both used TS with `setup({ types })` | Same, but `assign` import removed |
