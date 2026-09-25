import { html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { type InspectionEvent, type SnapshotFrom } from 'xstate';
import { counterMachine } from './counterMachine.js';
import { UseMachine } from '../xstate-lit/src/index.js';
import { styles } from './styles/counter-element-styles.css.js';

type SnapshotInspectionEvent = {
  type: '@xstate.snapshot';
  event?: { type: string };
};

type CounterSnapshot = SnapshotFrom<typeof counterMachine>;

export class CounterElement extends LitElement {
  static override styles = [styles];

  #inspectEventsHandler: (inspEvent: InspectionEvent) => void =
    this.#inspectEvents.bind(this);

  #callbackHandler: (snapshot: SnapshotFrom<any>) => void =
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

  #callbackCounterController(snapshot: typeof this.counterController.snapshot) {
    this.xstate = snapshot;
    if (snapshot?.status === 'stopped') {
      this.xstate = {} as unknown as CounterSnapshot;
    }
  }

  #inspectEvents(inspEvent: InspectionEvent | SnapshotInspectionEvent) {
    console.info('inspect event', inspEvent);
  }

  get #disabled() {
    return this.counterController.snapshot?.matches('disabled');
  }

  #send(event: any) {
    this.counterController.send(event);
  }

  override render() {
    return html`
      <div aria-disabled="${this.#disabled}">
        <span>
          <button
            ?disabled="${this.#disabled}"
            data-counter="increment"
            @click=${() => this.#send({ type: 'INC' })}
          >
            Increment
          </button>
          <button
            ?disabled="${this.#disabled}"
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
        <span><slot></slot></span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'counter-element': CounterElement;
  }
}
