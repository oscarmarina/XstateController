import { html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { type EventFrom, type InspectionEvent, type SnapshotFrom } from 'xstate';
import { counterMachine } from './counterMachine.js';
import { UseMachine } from '../xstate-lit/src/index.js';
import { styles } from './styles/counter-element-styles.css.js';

type CounterSnapshot = SnapshotFrom<typeof counterMachine>;

export class CounterElement extends LitElement {
  static override styles = [styles];

  #inspectEventsHandler: (inspEvent: InspectionEvent) => void =
    this.#inspectEvents.bind(this);

  #callbackHandler: (snapshot: CounterSnapshot) => void =
    this.#callbackCounterController.bind(this);

  counterController: UseMachine<typeof counterMachine> = new UseMachine(this, {
    machine: counterMachine,
    options: {
      inspect: this.#inspectEventsHandler,
    },
    callback: this.#callbackHandler,
  });

  @state()
  xstate: CounterSnapshot | undefined = this.counterController.snapshot;

  override updated(props: Map<string, unknown>) {
    super.updated && super.updated(props);
    if (props.has('xstate') && this.xstate && 'value' in this.xstate) {
      const { context, value } = this.xstate;
      const detail = { ...(context || {}), value };
      const counterEvent = new CustomEvent('counterchange', {
        bubbles: true,
        detail,
      });
      this.dispatchEvent(counterEvent);
    }
  }

  #callbackCounterController(snapshot: CounterSnapshot) {
    this.xstate = snapshot.status === 'stopped' ? undefined : snapshot;
  }

  #inspectEvents(inspEvent: InspectionEvent) {
    console.info('inspect event', inspEvent);
  }

  get #disabled() {
    return this.counterController.snapshot?.matches('disabled');
  }

  // `false` when the event would be ignored (guards, `disabled` state) or the actor is stopped
  #can(type: 'INC' | 'DEC') {
    return this.counterController.snapshot?.can({ type }) ?? false;
  }

  #send(event: EventFrom<typeof counterMachine>) {
    this.counterController.send(event);
  }

  override render() {
    return html`
      <div aria-disabled="${this.#disabled}">
        <span>
          <button
            ?disabled="${!this.#can('INC')}"
            data-counter="increment"
            @click=${() => this.#send({ type: 'INC' })}
          >
            Increment
          </button>
          <button
            ?disabled="${!this.#can('DEC')}"
            data-counter="decrement"
            @click=${() => this.#send({ type: 'DEC' })}
          >
            Decrement
          </button>
        </span>
        <p>${this.counterController.snapshot?.context.counter}</p>
      </div>
      <div>
        <button @click=${() => this.#send({ type: 'TOGGLE' })}>
          ${this.#disabled ? 'Enabled counter' : 'Disabled counter'}
        </button>
      </div>
      <span>
        <slot></slot>
        <span
          >The “Disabled counter” disables the counter for: <br />
          ${(this.counterController.snapshot?.context.counter ?? 0) * 1000}
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
}
