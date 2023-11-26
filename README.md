![Lit](https://img.shields.io/badge/lit-3.0.0-blue.svg)

> This is an individual repository for the demo included in the Lit controller BlockquoteControllerXstate.

- [You can find this controller in the following monorepo](https://github.com/oscarmarina/blockquote-web-components/tree/main/packages/controllers/blockquote-controller-xstate)

***xstate-counter*** is a Lit component that uses a BlockquoteControllerXstate to connect a XState machine with Lit's reactive property.

The `BlockquoteControllerXstate` is a Lit Reactive Controller specifically designed for straightforward integration with XState. This controller allows you to subscribe to an XState actor, updating a specified reactive property whenever the state machine transitions.

- [XState 5](https://stately.ai/docs/installation)
- [Original idea](https://codesandbox.io/s/z3o0s?file=/src/toggleMachine.ts)

<hr>

### Demo

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/oscarmarina/XstateController)

[![Open in Stately.ai](https://img.shields.io/badge/Open%20in%20Stately.ai-black.svg)](https://stately.ai/registry/editor/154a7a42-9338-4cc0-8c0c-131c859d8349)

### Install:
```bash
npm install && npm start
```
### Usage

***counterMachine.js***

```javascript
import { createMachine, assign } from 'xstate';

const states = {
  enabled: 'enabled',
  disabled: 'disabled',
};

const increment = {
  counter: ({ context }) => context.counter + 1,
  event: ({ event }) => event,
};
const decrement = {
  counter: ({ context }) => context.counter - 1,
  event: ({ event }) => event,
};

const isNotMax = ({ context }) => context.counter < 10;
const isNotMin = ({ context }) => context.counter > 0;

export const counterMachine = createMachine(
  {
    id: 'counter',
    context: { counter: 0, event: undefined },
    initial: 'enabled',
    states: {
      enabled: {
        on: {
          INC: {
            actions: {
              type: 'increment',
            },
            guard: {
              type: 'isNotMax',
            },
          },
          DEC: {
            actions: {
              type: 'decrement',
            },
            guard: {
              type: 'isNotMin',
            },
          },
          TOGGLE: {
            target: states.disabled,
          },
        },
      },
      disabled: {
        on: {
          TOGGLE: {
            target: states.enabled,
          },
        },
      },
    },
  },
  {
    actions: {
      increment: assign(increment),
      decrement: assign(decrement),
    },
    guards: {
      isNotMax,
      isNotMin,
    },
  },
);
```

***xstate-counter.js***

```javascript
import { html, LitElement } from 'lit';
import { BlockquoteControllerXstate } from '@blockquote-web-components/blockquote-controller-xstate';
import { counterMachine } from './counterMachine.js';

export class XstateCounter extends LitElement {
  static properties = {
    _xstate: {
      type: Object,
      state: true,
    },
  };

  constructor() {
    super();
    this._xstate = {};
    this.counterController = new BlockquoteControllerXstate(this, counterMachine, '_xstate');
  }

  updated(props) {
    super.updated && super.updated(props);
    if (props.has('_xstate')) {
      const { context, value } = this._xstate;
      const counterEvent = new CustomEvent('counterchange', {
        bubbles: true,
        detail: { ...context, value },
      });
      this.dispatchEvent(counterEvent);
    }
  }

  // ...

  get #disabled() {
    return this.counterController.state.matches('disabled');
  }

  render() {
    return html`
      <button
        ?disabled="${this.#disabled}"
        data-counter="increment"
        \@click=${() => this.counterController.send({ type: 'INC' })}
      >
        Increment
      </button>
      <button
        ?disabled="${this.#disabled}"
        data-counter="decrement"
        \@click=${() => this.counterController.send({ type: 'DEC' })}
      >
        Decrement
      </button>
    `;
  }

  // ...
}
```

**Scaffold generated using**:

> [npm init @blockquote/wc](https://github.com/oscarmarina/create-wc)

<hr>


### `src/XstateCounter.js`:

#### class: `XstateCounter`, `xstate-counter`

##### Fields

| Name                | Privacy | Type     | Default                                                           | Description | Inherited From |
| ------------------- | ------- | -------- | ----------------------------------------------------------------- | ----------- | -------------- |
| `_xstate`           | public  | `object` | `{}`                                                              |             |                |
| `counterController` |         |          | `new BlockquoteControllerXstate(this, counterMachine, '_xstate')` |             |                |

##### Attributes

| Name      | Field    | Inherited From |
| --------- | -------- | -------------- |
| `_xstate` | \_xstate |                |

<details><summary>Private API</summary>

##### Fields

| Name        | Privacy | Type | Default | Description | Inherited From |
| ----------- | ------- | ---- | ------- | ----------- | -------------- |
| `#disabled` | private |      |         |             |                |

</details>

<hr/>

#### Exports

| Kind | Name            | Declaration   | Module               | Package |
| ---- | --------------- | ------------- | -------------------- | ------- |
| `js` | `XstateCounter` | XstateCounter | src/XstateCounter.js |         |

### `src/counterMachine.js`:

#### Variables

| Name             | Description | Type |
| ---------------- | ----------- | ---- |
| `counterMachine` |             |      |

<hr/>

#### Exports

| Kind | Name             | Declaration    | Module                | Package |
| ---- | ---------------- | -------------- | --------------------- | ------- |
| `js` | `counterMachine` | counterMachine | src/counterMachine.js |         |

### `src/styles/xstate-counter-styles.css.js`:

#### Variables

| Name     | Description | Type |
| -------- | ----------- | ---- |
| `styles` |             |      |

<hr/>

#### Exports

| Kind | Name     | Declaration | Module                                  | Package |
| ---- | -------- | ----------- | --------------------------------------- | ------- |
| `js` | `styles` | styles      | src/styles/xstate-counter-styles.css.js |         |

### `define/xstate-counter.js`:

#### Exports

| Kind                        | Name             | Declaration   | Module                | Package |
| --------------------------- | ---------------- | ------------- | --------------------- | ------- |
| `custom-element-definition` | `xstate-counter` | XstateCounter | /src/XstateCounter.js |         |

### `index.js`:

#### Exports

| Kind | Name            | Declaration   | Module                 | Package |
| ---- | --------------- | ------------- | ---------------------- | ------- |
| `js` | `XstateCounter` | XstateCounter | ./src/XstateCounter.js |         |
