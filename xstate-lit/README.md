# @xstate/lit

This package contains utilities for using [Xstate](https://github.com/statelyai/xstate) with [Lit](https://github.com/litjs/lit).

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

```js
import { html, LitElement } from 'lit';
import { UseMachine } from '@xstate/lit';
import { createMachine } from 'xstate';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' }
    },
    active: {
      on: { TOGGLE: 'inactive' }
    }
  }
});

export class ToggleComponent extends LitElement {
  constructor() {
    super();
    this.toggleController = new UseMachine(this, {
      machine: toggleMachine
    });
  }

  private get _turn() {
    return this.toggleController.snapshot.matches('inactive');
  }

  render() {
    return html`
      <button @click=${() => this.toggleController.send({ type: 'TOGGLE' })}>
        ${this._turn ? 'Turn on' : 'Turn off'}
        `;
  }
}
```

### Usage with XState v6

The `UseMachine` controller works with XState v6's new `setup` API and transition functions:

```js
import { html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { UseMachine } from '@xstate/lit';
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

const incAction = ({ context, guards }) => {
  if (guards.canIncrement({ context })) {
    return { context: { counter: context.counter + 1 } };
  }
};
const decAction = ({ context, guards }) => {
  if (guards.canDecrement({ context })) {
    return { context: { counter: context.counter - 1 } };
  }
};

const counterMachine = counterSetup.createMachine({
  context: { counter: 0 },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        INC: incAction,
        DEC: decAction,
        TOGGLE: 'disabled',
      },
    },
    disabled: {
      on: { TOGGLE: 'enabled' },
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

  #send(event) {
    this.counterController.send(event);
  }

  render() {
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