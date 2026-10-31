# @xstate/lit

This package contains utilities for using [XState](https://github.com/statelyai/xstate) with [Lit](https://github.com/litjs/lit).

- [Read the full documentation in the XState docs](https://xstate.js.org/docs/packages/xstate-lit/).
- [Read our contribution guidelines](https://github.com/statelyai/xstate/blob/main/CONTRIBUTING.md).

## Quick Start

1. Install `xstate` and `@xstate/lit`:

```bash
npm i xstate @xstate/lit
```

**Via CDN**

```html
<script src="https://unpkg.com/@xstate/lit/dist/xstate-lit.min.js"></script>
```

By using the global variable `XStatelit`

2. Import `UseMachine`

```ts
import { html, LitElement } from 'lit';
import { UseMachine } from '@xstate/lit';
import { createMachine } from 'xstate';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: { target: 'active' } },
    },
    active: {
      on: { TOGGLE: { target: 'inactive' } },
    },
  },
});

export class ToggleComponent extends LitElement {
  toggleController = new UseMachine(this, {
    machine: toggleMachine,
  });

  private get _turn() {
    return this.toggleController.snapshot.matches('inactive');
  }

  override render() {
    return html`
      <button @click=${() => this.toggleController.send({ type: 'TOGGLE' })}>
        ${this._turn ? 'Turn on' : 'Turn off'}
      </button>
    `;
  }
}
```

`createMachine` is still exported in XState v6. Note that in v6 the string
shorthand for targets (`TOGGLE: 'active'`) is not accepted by the types; use
`{ target: 'active' }`. The v6 example below uses `setup(...).createMachine(...)`
with `schemas` to type context, events and named guards.

### Usage with XState v6

The `UseMachine` controller works with XState v6's new `setup` API and transition functions.
In v6, types are declared with `schemas` ([Standard Schema](https://standardschema.dev)) instead of
`types`. `types<T>()` from `xstate` is a type-only schema (no runtime validation); you can also use
Zod, Valibot, ArkType, etc. to validate at runtime.

```ts
import { html, LitElement } from 'lit';
import { UseMachine } from '@xstate/lit';
import { setup, types } from 'xstate';

const counterSetup = setup({
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
});

const counterMachine = counterSetup.createMachine({
  context: { counter: 0 },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        // `context`, `event` and `guards` are typed from `schemas`
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
      on: { TOGGLE: { target: 'enabled' } },
    },
  },
});

export class CounterElement extends LitElement {
  // The controller re-renders the element on every snapshot
  counterController = new UseMachine(this, { machine: counterMachine });

  override render() {
    const { can, trigger, snapshot } = this.counterController;
    return html`
      <span>Count: ${snapshot.context.counter}</span>
      <button ?disabled=${!can.INC()} @click=${() => trigger.INC()}>
        +
      </button>
      <button ?disabled=${!can.DEC()} @click=${() => trigger.DEC()}>
        -
      </button>
      <button @click=${() => trigger.TOGGLE()}>
        ${snapshot.matches('enabled') ? 'Disable' : 'Enable'}
      </button>
    `;
  }
}
```

### `trigger` and `can`

`trigger` sends typed events generated from `schemas.events`: `trigger.INC()`,
`trigger.RENAME({ label })`, like `send({ type: 'RENAME', label })`. It has the same signatures
as XState v6's `actor.trigger`, with one difference: XState's belongs to one actor, while the
controller's is a stable proxy (`ControllerTrigger`) that always sends to the current actor.

That matters because a new actor is created each time the host is connected again (stopped
actors cannot restart). `actor.trigger` kept from the first connection would send to a stopped
actor, and the event would be lost; `controller.trigger` can be kept or destructured safely.

`can` (`ControllerCan`) has the same shape, is also a stable proxy, and returns
`snapshot.can(event)` for the current actor: `can.INC()`,
`can.RENAME({ label })`. It is `false` when the transition function ignores the event (returns
`undefined`) or the actor has finished (`'stopped'`, `'done'` or `'error'`), so `+` is disabled at 10, `-` at 0, and both in the
`disabled` state. The machine still rejects invalid events: `can` only drives the UI.

`snapshot`, `actor`, `send`, `trigger` and `can` are available from the constructor, before the
host is connected.

### Disconnect and reconnect: `restart` or `restore`

A Lit element is disconnected and connected again more often than it seems: moving it in the
DOM, reordering a `repeat`, changing its parent. The actor is stopped on disconnect, and a
stopped actor cannot restart, so a new actor is created on reconnect. The `reconnect` option
decides what it starts from:

| `reconnect` | The new actor starts from |
| --- | --- |
| `'restart'` (default) | the initial state, or `options.snapshot` |
| `'restore'` | the state the previous actor had: its persisted snapshot |

```ts
counter = new UseMachine(this, { machine: counterMachine, reconnect: 'restore' });
```

With `'restore'`, the snapshot is persisted before the actor stops (`actor.getPersistedSnapshot()`)
and the new actor is created from it (`createActor(machine, { snapshot })`). It keeps:

- `context`, the state value and children.
- Pending timers, with their original deadlines: a `disabled` state with `after: { 3000: ... }`
  left after 1 second and restored 1 second later fires 1 second after reconnecting; a timer
  that expired while disconnected fires right away.
- Invoked work in flight, such as a `createAsyncLogic` request: stopping aborts it, and the new
  actor runs it again.

An actor that had finished (`'done'` or `'error'`) restarts, and so does one whose `machine` was
reassigned meanwhile. `onSnapshot` still receives the `'stopped'` snapshot on disconnect, then the
restored one.

### Emitted events: `on` and `dispatchEmitted`

A machine emits events with `enq.emit(...)` to say that something happened once: the counter
changed, a form was submitted. Declare them in `schemas.emitted`, and the element's public
events live in the machine, typed and testable without a DOM:

```ts
const counterMachine = setup({
  schemas: {
    context: types<{ counter: number }>(),
    events: { INC: types<void>() },
    emitted: { counterchange: types<{ counter: number }>() },
  },
}).createMachine({
  context: { counter: 0 },
  on: {
    INC: ({ context }, enq) => {
      const counter = context.counter + 1;
      enq.emit({ type: 'counterchange', counter });
      return { context: { counter } };
    },
  },
});
```

`dispatchEmitted: true` dispatches each emitted event on the host as a `CustomEvent`: the
emitted `type` is the event name and the rest is its `detail`, with `{ composed: true }` (pass
an object to change it). The event does not bubble: listen on the element itself, or on an
ancestor in the capture phase (`{ capture: true }`). `EmittedEventMap` types `addEventListener`:

```ts
export class CounterElement extends LitElement {
  counter = new UseMachine(this, { machine: counterMachine, dispatchEmitted: true });
}

declare global {
  interface HTMLElementEventMap extends EmittedEventMap<typeof counterMachine> {}
}

el.addEventListener('counterchange', (ev) => ev.detail.counter); // `number`
```

To handle emitted events in code, use `controller.on(type, handler)` (or `'*'`). It has the
signature of `actor.on`, but XState removes `actor.on` handlers when the actor stops, while
`controller.on` handlers keep receiving events from the actors created on reconnect.

When they are delivered:

- After the transition is applied: `controller.snapshot` already has the new state (the host
  has not re-rendered yet).
- Not when the host is disconnected (stopping the actor does not run `exit`), nor when an actor
  is restored with `reconnect: 'restore'` (`entry` does not run again): moving an element in the
  DOM dispatches nothing.
- `can.X()` does not emit: it only evaluates the transition.

Listeners run synchronously, inside the `trigger` (or `send`) that caused the event:

- `controller.snapshot` is already the new state, but the host has not re-rendered yet. To read
  its rendered DOM, `await el.updateComplete` first.
- A `trigger` called from a listener is queued: it is processed when the current event is done,
  so `controller.snapshot` right after it is still the current state. Its own emitted events
  follow, in order.
- A listener that throws is reported as an uncaught error. Other listeners still receive the
  event, and the actor keeps running.

Emit for things that happen once; render current state from `snapshot`.

### `controller.trigger` vs `controller.actor.trigger`

Both have the same typed signatures. They differ in which actor receives the event:

| | Sends to | After the host is connected again |
| --- | --- | --- |
| `controller.trigger` | the current actor, looked up on each call | reaches the new actor |
| `controller.actor.trigger` | the actor that was current when it was read | reaches the stopped actor: the event is dropped (a warning in development builds) |

Use `controller.trigger` for events from the UI. For a response to a request made from the
component, it depends on `reconnect`:

- `'restore'`: the new actor continues the same session, so a response that arrives after a
  reconnection is still valid. Use `controller.trigger`.
- `'restart'`: the new actor starts a new session, so the response belongs to the old one. Read
  `controller.actor.trigger` before the `await`: the response is dropped instead of reaching the
  new actor.

Example: a search box fetches suggestions as the user types. With `'restart'`, if the element is
moved in the DOM while a request is pending, a new actor starts with an empty query:

```ts
const searchMachine = setup({
  schemas: {
    context: types<{ query: string; items: string[] }>(),
    events: {
      typed: types<{ query: string }>(),
      results: types<{ items: string[] }>(),
    },
  },
}).createMachine({
  context: { query: '', items: [] },
  on: {
    typed: ({ event }) => ({ context: { query: event.query, items: [] } }),
    results: ({ event }) => ({ context: { items: event.items } }),
  },
});

export class SearchBox extends LitElement {
  search = new UseMachine(this, { machine: searchMachine, reconnect: 'restart' });

  async #onInput(ev: InputEvent) {
    const query = (ev.target as HTMLInputElement).value;
    this.search.trigger.typed({ query });

    // Bound to this session: read before the `await`
    const session = this.search.actor.trigger;
    const items = await fetchSuggestions(query);

    // ✅ Dropped if the actor that asked was stopped in the meantime
    session.results({ items });
    // ❌ `this.search.trigger.results({ items })` would show results for `query`
    //    in the new session, whose query is empty
    //    (with `reconnect: 'restore'` the query is kept, and `this.search.trigger` is right)
  }

  override render() {
    const { query, items } = this.search.snapshot.context;
    return html`
      <input .value=${query} @input=${this.#onInput} />
      <ul>${items.map((item) => html`<li>${item}</li>`)}</ul>
    `;
  }
}
```

Moving the request into the machine (an invoked `createAsyncLogic`) avoids the choice: the
request belongs to the actor, and stopping the actor cancels it (its `AbortSignal` is aborted).
With `'restore'` the new actor runs it again; with `'restart'` it is gone with the old session.

### Options and required input

`options` are the `createActor` options (`input`, `inspect`, `snapshot`, ...). As in
`createActor`, they are required when the machine's input does not accept `undefined`:

```ts
import { setup, types } from 'xstate';

const userMachine = setup({
  schemas: {
    input: types<{ userId: string }>(),
    context: types<{ userId: string }>(),
  },
}).createMachine({
  context: ({ input }) => ({ userId: input.userId }),
});

// Type error: `options.input` is required
new UseMachine(this, { machine: userMachine });

// OK
new UseMachine(this, {
  machine: userMachine,
  options: { input: { userId: '123' } },
});
```

Machines whose input accepts `undefined` (or that declare no input) can omit `options`.
The `options` property of the controller has the same type, so it cannot be reassigned without
`input`: a new actor is created with it each time the host is connected again.
