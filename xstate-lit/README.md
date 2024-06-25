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
    this.toggleController = new UseMachine({
      host: this,
      machine: toggleMachine
    });
  }

  private get _turn() {
    return this.toggleController.snapshot.matches('inactive');
  }

  render() {
    return html`
      <button @click=${() => this.machineController.send({ type: 'TOGGLE' })}>
        ${this._turn ? 'Turn on' : 'Turn off'}
      </button>
      `;
  }
}
```
