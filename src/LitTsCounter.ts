import { html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { type InspectionEvent, SnapshotFrom } from 'xstate';
import { counterMachine } from './counterMachine.js';
import { UseMachine } from '../xstate-lit/src/index.js';
// import { UseMachine } from '@xstate/lit';
import { styles } from './styles/lit-ts-counter-styles.css.js';

export class LitTsCounter extends LitElement {
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
  _xstate: typeof this.counterController.snapshot =
    {} as unknown as typeof this.counterController.snapshot;

  override updated(props: Map<string, unknown>) {
    super.updated && super.updated(props);
    if (props.has('_xstate')) {
      const { context, value } = this._xstate;
      const detail = { ...(context || {}), value };
      const counterEvent = new CustomEvent('counterchange', {
        bubbles: true,
        detail,
      });
      this.dispatchEvent(counterEvent);
    }
  }

  #callbackCounterController(snapshot: typeof this.counterController.snapshot) {
    this._xstate = snapshot;
  }

  #inspectEvents(inspEvent: InspectionEvent) {
    if (
      inspEvent.type === '@xstate.snapshot' &&
      inspEvent.event.type === 'xstate.stop'
    ) {
      this._xstate = {} as unknown as typeof this.counterController.snapshot;
    }
  }

  get #disabled() {
    return this.counterController.snapshot.matches('disabled');
  }

  override render() {
    return html`
      <div aria-disabled="${this.#disabled}">
        <span>
          <button
            ?disabled="${this.#disabled}"
            data-counter="increment"
            @click=${this.counterController.send({ type: 'INC' })}
          >


            Increment
          </button>
          <button
            ?disabled="${this.#disabled}"
            data-counter="decrement"
            @click=${this.counterController.send({ type: 'DEC' })}
          >
            Decrement
          </button>
        </span>
        <span class="mark-text">${this.counterController.snapshot.context.counter}</span>
        <hr />
      </div>
      <div class="row" aria-disabled="${this.#disabled}">
        <span>
          <button
            ?disabled="${this.#disabled}"
            data-counter="increment-handler"
            @click=${this.counterController.sendHandler({ type: 'INC' })}
          >
            Increment - (handler)
          </button>
          <button
            ?disabled="${this.#disabled}"
            data-counter="decrement-handler"
            @click=${this.counterController.sendHandler({ type: 'DEC' })}
          >
            Decrement - (handler)
          </button>
        </span>
      </div>
      <div class="row" aria-disabled="${this.#disabled}">
        <span>
          <button
            ?disabled="${this.#disabled}"
            data-counter="increment-cache"
            @click=${this.counterController.sendHandlerCache({ type: 'INC' })}
          >
            Increment - (cache)
          </button>
          <button
            ?disabled="${this.#disabled}"
            data-counter="decrement-cache"
            @click=${this.counterController.sendHandlerCache({ type: 'DEC' })}
          >
            Decrement - (cache)
          </button>
        </span>
      </div>
      <div class="mark">
        <button @click=${this.counterController.send({ type: 'TOGGLE' })}>
          ${this.#disabled ? 'Enabled counter' : 'Disabled counter'}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-ts-counter': LitTsCounter;
  }
}
