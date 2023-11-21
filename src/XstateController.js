import { createActor } from 'xstate';

/**
 * # XstateController
 *
 * ![Lit](https://img.shields.io/badge/lit-3.0.0-blue.svg)
 *
 * `XstateReactiveController` is a Lit Reactive Controller designed for seamless integration with XState.
 *
 * This controller allows you to subscribe to an XState actor, updating a specified reactive property whenever the state machine transitions.
 * It simplifies the integration of XState's powerful state management into Lit components.
 *
 * - [xstate v5](https://stately.ai/docs/installation)
 * - [xstate v5 - examples](https://stately.ai/docs/examples)
 * - [Original idea](https://codesandbox.io/s/z3o0s?file=/src/toggleMachine.ts)
 *
 * ## Demo
 *
 * [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/oscarmarina/XstateController)
 *
 * ## Usage
 *
 * ***counterMachine.js***
 * 
 * ```javascript
 * import { createMachine, assign } from 'xstate';
 * 
 * const states = {
 *   enabled: 'enabled',
 *   disabled: 'disabled',
 * };
 * 
 * const increment = {
 *   counter: ({ context }) => context.counter + 1,
 *   event: ({ event }) => event,
 * };
 * const decrement = {
 *   counter: ({ context }) => context.counter - 1,
 *   event: ({ event }) => event,
 * };
 * 
 * const isNotMax = ({ context }) => context.counter < 10;
 * const isNotMin = ({ context }) => context.counter > 0;
 * 
 * export const counterMachine = createMachine({
 *   id: 'counter',
 *   context: { counter: 0, event: undefined },
 *   initial: 'enabled',
 *   states: {
 *     enabled: {
 *       on: {
 *         INC: {
 *           actions: assign(increment),
 *           guard: isNotMax,
 *         },
 *         DEC: {
 *           actions: assign(decrement),
 *           guard: isNotMin,
 *         },
 *         TOGGLE: {
 *           target: states.disabled,
 *         },
 *       },
 *     },
 *     disabled: {
 *       on: {
 *         TOGGLE: {
 *           target: states.enabled,
 *         },
 *       },
 *     },
 *   },
 * });
 *
 * ```
 * 
 * ***XstateCounter.js***
 * 
 * ```javascript
 * import { html, LitElement } from 'lit';
 * import { XstateController } from './XstateController.js';
 * import { counterMachine } from './counterMachine.js';
 *
 * export class XstateCounter extends LitElement {
 *   static properties = {
 *     _xstate: {
 *       type: Object,
 *       state: true,
 *     },
 *   };
 *
 *   constructor() {
 *     super();
 *     this._xstate = {};
 *     this.counterController = new XstateController(this, counterMachine, '_xstate');
 *   }
 *
 *   updated(props) {
 *     super.updated && super.updated(props);
 *     if (props.has('_xstate')) {
 *       const { context, value } = this._xstate;
 *       const counterEvent = new CustomEvent('counterchange', {
 *         bubbles: true,
 *         detail: { ...context, value },
 *       });
 *       this.dispatchEvent(counterEvent);
 *     }
 *   }
 *
 *   // ...
 *
 *   get #disabled() {
 *     return this.counterController.state.matches('disabled');
 *   }
 *
 *   render() {
 *     return html`
 *       <button
 *         ?disabled="${this.#disabled}"
 *         data-counter="increment"
 *         \@click=${() => this.counterController.send({ type: 'INC' })}
 *       >
 *         Increment
 *       </button>
 *       <button
 *         ?disabled="${this.#disabled}"
 *         data-counter="decrement"
 *         \@click=${() => this.counterController.send({ type: 'DEC' })}
 *       >
 *         Decrement
 *       </button>
 *     `;
 *   }
 *
 *   // ...
 * }
 * ```
 *
 * - [Web Component with Lit - Scaffolding](https://github.com/oscarmarina/create-wc)
 * <hr>
 */
export class XstateController {
  /**
   * @param {import('lit').ReactiveElement} host
   * @param {import('xstate').StateMachine} machine
   * @param {string} propKey
   */
  constructor(host, machine, propKey) {
    (this.host = host).addController(this);
    this.service = createActor(machine).start();
    this.propKey = propKey;
    this.tempObj = {};
  }

  get state() {
    return this.service.getSnapshot();
  }

  /**
   * @param {Object} ev
   */
  send(ev) {
    this.service.send(ev);
  }

  hostConnected() {
    /* Do not mutate the context object. Instead, you should use the assign(...) action to update context immutably.
     * https://stately.ai/docs/context#updating-context-with-assign
     * https://lit.dev/docs/components/properties/#mutating-properties
     */
    this.service.subscribe(state => {
      this.propKey in this.host && (this.host[this.propKey] = state);
    });
  }

  hostDisconnected() {
    this.service.stop();
  }
}
