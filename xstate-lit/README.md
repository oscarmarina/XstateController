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
    return this.toggleController.snapshot?.matches('inactive');
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
import { state } from 'lit/decorators.js';
import { UseMachine } from '@xstate/lit';
import { setup, types, type EventFrom } from 'xstate';

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
  counterController = new UseMachine(this, {
    machine: counterMachine,
    callback: (snapshot) => {
      this.xstate = snapshot;
    },
  });

  @state()
  xstate = this.counterController.snapshot;

  #send(event: EventFrom<typeof counterMachine>) {
    this.counterController.send(event);
  }

  override render() {
    return html`
      <span>Count: ${this.counterController.snapshot?.context.counter}</span>
      <button @click=${() => this.#send({ type: 'INC' })}>+</button>
      <button @click=${() => this.#send({ type: 'DEC' })}>-</button>
      <button @click=${() => this.#send({ type: 'TOGGLE' })}>
        ${this.counterController.snapshot?.matches('enabled') ? 'Disable' : 'Enable'}
      </button>
    `;
  }
}
```
