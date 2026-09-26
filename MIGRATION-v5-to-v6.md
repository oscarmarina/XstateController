# XState v5 → v6 Migration Guide

> Compares XState v5 (`^5.32.5`, commit `c9bb982`) and v6 (`^6.0.0-alpha.59`, the version used for the migration examples).
> The v6 examples reflect the repository implementation at the time of the migration; the v5 blocks are reconstructed reference versions.

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
import { setup, types } from 'xstate';

const counterSetup = setup({
  // v6: `schemas` (Standard Schema). `types<T>()` is type-only, no runtime validation.
  schemas: {
    context: types<{ counter: number }>(),
    events: {
      INC: types<void>(),
      DEC: types<void>(),
      TOGGLE: types<void>(),
    },
  },
  guards: {
    canIncrement: ({ context }) => context.counter < 10,
    canDecrement: ({ context }) => context.counter > 0,
  },
  delays: {
    backoff: ({ context }) => context.counter * 1000,
  },
});

export const counterMachine = counterSetup.createMachine({
  context: { counter: 0 },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        // Transition functions: return the next `context`, or `undefined` to ignore the event
        INC: ({ context, guards }) =>
          guards.canIncrement({ context })
            ? { context: { counter: context.counter + 1 } }
            : undefined,
        DEC: ({ context, guards }) =>
          guards.canDecrement({ context })
            ? { context: { counter: context.counter - 1 } }
            : undefined,
        TOGGLE: { target: 'disabled' },
      },
    },
    disabled: {
      after: {
        backoff: { target: 'enabled' },
      },
      on: {
        TOGGLE: { target: 'enabled' },
      },
    },
  },
});
```

**Key changes:**
| v5 | v6 |
|---|---|
| `import { setup, assign } from 'xstate'` | `import { setup, types } from 'xstate'` |
| `setup({ types: { context: {} as C, events: {} as E } })` | `setup({ schemas: { context: types<C>(), events: { INC: types<void>(), ... } } })` — events are a map keyed by `type` |
| Actions declared as `assign({ key: fn })` inside `setup({ actions })` | Transition functions return updates such as `{ context: {...} }`; guards can be read from `setup` |
| Transitions use `{ actions: { type }, guard: { type } }` | Transitions can use **functions** that call `guards.xxx({ context })` and return `{ context: {...} }` |
| `assign` is a named export | `assign` is **not** exported in v6 |
| String target shorthand `TOGGLE: 'disabled'` | Use `{ target: 'disabled' }` (the string shorthand is rejected by the v6 types) |

> **`types` vs `schemas`:** v6 `setup()` does not have a `types` option. When `guards`/`delays`
> are present TypeScript does not report it as an unknown property, but it is ignored: `context`,
> `event` and `guards` stay untyped (hence the `any`/casts that were needed before). `schemas` takes
> any [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType...) for runtime validation,
> or `types<T>()` from `xstate` for type-only declarations. With `schemas`, transition functions
> can be written inline and are fully typed, and `actor.send()` rejects unknown events or payloads.

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
import { setup, types } from 'xstate';

const feedbackSetup = setup({
  // v6: `schemas` (Standard Schema). `types<T>()` is type-only, no runtime validation.
  schemas: {
    context: types<{ feedback: string }>(),
    events: {
      'feedback.good': types<void>(),
      'feedback.bad': types<void>(),
      'feedback.update': types<{ value: string }>(),
      submit: types<void>(),
      close: types<void>(),
      back: types<void>(),
      restart: types<void>(),
    },
  },
  guards: {
    feedbackValid: ({ context }) => context.feedback.length > 0,
  },
});

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
        'feedback.update': ({ event }) => ({ context: { feedback: event.value } }),
        back: { target: 'prompt' },
        submit: ({ context, guards }) =>
          guards.feedbackValid({ context }) ? { target: 'thanks' } : undefined,
      },
    },
    thanks: {},
    closed: {
      on: {
        restart: () => ({ target: 'prompt', context: { feedback: '' } }),
      },
    },
  },
  on: {
    close: { target: '.closed' },
  },
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
// v6 — InspectionEvent is still exported, but does not include @xstate.snapshot
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

In `xstate@6.0.0-alpha.59`, `InspectionEvent` is still exported. However, its
type union does not correctly include the `@xstate.snapshot` event, even though
the runtime can pass it to `options.inspect`. Extend the type locally with the
snapshot event rather than degrading the entire parameter to `any`. The `event`
property should be treated as optional.

Starting with alpha.60, the inspection protocol changed: `InspectionEvent` uses
`@xstate.transition` (which carries a snapshot) instead of a separate
`@xstate.snapshot` event. This workaround is specific to alpha.59 and should
not be carried forward unchanged.

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
| **`InspectionEvent`** | Exported from `xstate` | Still exported; extend locally for `@xstate.snapshot` |
| **`@statelyai/inspect`** | Compatible | Incompatible (requires xstate v5) |
| **`FeedbackElement`** | Constructor-assigned controller | Field-initialized controller with callback |
| **TypeScript** | `setup({ types: { context: {} as C, events: {} as E } })` | `setup({ schemas: { context: types<C>(), events: { NAME: types<Payload>() } } })` (Standard Schema) |
