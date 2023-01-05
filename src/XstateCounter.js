import { html, LitElement } from 'lit';
import { XstateController } from './XstateController.js';
import { counterMachine } from './counterMachine.js';
import { styles } from './styles/xstate-counter-styles.css.js';

export class XstateCounter extends LitElement {
  static is = 'xstate-counter';

  static properties = {
    _xstate: {
      type: Object,
      state: true,
    },
  };

  static styles = [styles];

  constructor() {
    super();
    this.counterController = new XstateController(this, counterMachine, '_xstate');
  }

  updated(props) {
    super.updated && super.updated(props);
    if (props.has('_xstate')) {
      const { context, event } = this._xstate;
      const counterEvent = new CustomEvent('counterchange', {
        bubbles: true,
        detail: { ...context, ...event },
      });
      this.dispatchEvent(counterEvent);
    }
  }

  get #disabled() {
    return this.counterController.state.value === 'disabled';
  }

  render() {
    return html`
      <slot></slot>
      <div aria-disabled="${this.#disabled}">
        <span>
          <button
            ?disabled="${this.#disabled}"
            data-counter="increment"
            @click=${() => this.counterController.send('INC')}
          >
            Increment
          </button>
          <button
            ?disabled="${this.#disabled}"
            data-counter="decrement"
            @click=${() => this.counterController.send('DEC')}
          >
            Decrement
          </button>
        </span>
        <p>${this.counterController.state.context.counter}</p>
      </div>
      <div>
        <button @click=${() => this.counterController.send('TOGGLE')}>
          ${this.#disabled ? 'Enabled counter' : 'Disabled counter'}
        </button>
      </div>
    `;
  }
}
