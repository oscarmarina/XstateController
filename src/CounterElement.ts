import { html, LitElement } from 'lit';
import { type InspectionEvent } from 'xstate';
import { counterMachine } from './counterMachine.js';
import { UseMachine, type EmittedEventMap } from '../xstate-lit/src/index.js';
import { TickController } from './TickController.js';
import { styles } from './styles/counter-element-styles.css.js';

export class CounterElement extends LitElement {
  static override styles = [styles];

  #inspectEventsHandler: (inspEvent: InspectionEvent) => void =
    this.#inspectEvents.bind(this);

  // The machine emits the element's public events (`counterchange`, `disabledchange`), and
  // `dispatchEmitted` dispatches them on the element: no `@state` mirror or `updated()` needed
  counterController: UseMachine<typeof counterMachine> = new UseMachine(this, {
    machine: counterMachine,
    // Moving the element in the DOM keeps the counter (and the `disabled` timer deadline)
    reconnect: 'restore',
    dispatchEmitted: true,
    options: {
      inspect: this.#inspectEventsHandler,
    },
  });

  // Re-renders the countdown while `disabled`. The deadline comes from the machine's
  // `context`, so it survives a move in the DOM with `reconnect: 'restore'`.
  countdownController = new TickController(this, {
    interval: 100,
    while: () => this.#disabled,
  });

  #inspectEvents(inspEvent: InspectionEvent) {
    console.info('inspect event', inspEvent);
  }

  get #disabled() {
    return this.counterController.snapshot.matches('disabled');
  }

  /** Seconds left in the `disabled` state, from the deadline the machine stored. */
  get #secondsLeft() {
    const { disabledUntil } = this.counterController.snapshot.context;
    return (Math.max(0, disabledUntil - Date.now()) / 1000).toFixed(1);
  }

  override render() {
    // `can.X()` is `false` when the event would be ignored (guards, `disabled` state) or the
    // actor has finished. `trigger` and `can` always target the current actor.
    const { can, trigger, snapshot } = this.counterController;
    return html`
      <div aria-disabled="${this.#disabled}">
        <span>
          <button
            ?disabled="${!can.INC()}"
            data-counter="increment"
            @click=${() => trigger.INC()}
          >
            Increment
          </button>
          <button
            ?disabled="${!can.DEC()}"
            data-counter="decrement"
            @click=${() => trigger.DEC()}
          >
            Decrement
          </button>
        </span>
        <p>${snapshot.context.counter}</p>
      </div>
      <div>
        <button @click=${() => trigger.TOGGLE()}>
          ${this.#disabled ? 'Enabled counter' : 'Disabled counter'}
        </button>
        ${
          this.#disabled
            ? html`<span class="countdown" role="timer"
                >${this.#secondsLeft} s</span
              >`
            : ''
        }
      </div>
      <span>
        <slot></slot>
        <span
          >The “Disabled counter” disables the counter for: <br />
          ${snapshot.context.counter * 1000}
          milliseconds.</span
        >
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'counter-element': CounterElement;
  }
  // `addEventListener('counterchange', (ev) => ev.detail.counter)` is typed
  interface HTMLElementEventMap extends EmittedEventMap<typeof counterMachine> {}
}
