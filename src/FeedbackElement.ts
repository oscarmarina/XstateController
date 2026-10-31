import { html, LitElement } from 'lit';
// import { createBrowserInspector } from '@statelyai/inspect';
import { feedbackMachine } from './feedbackMachine.js';
import { UseMachine, type EmittedEventMap } from '../xstate-lit/src/index.js';
import { styles } from './styles/feedback-element-styles.css.js';

/* const { inspect } = createBrowserInspector({
  autoStart: false
}); */

export class FeedbackElement extends LitElement {
  static override styles = [styles];

  // The controller re-renders the host on every snapshot: no `@state` mirror is needed.
  // The machine emits `feedbacksubmit`, dispatched on the element (`dispatchEmitted`).
  feedbackController: UseMachine<typeof feedbackMachine> = new UseMachine(
    this,
    // Moving the element in the DOM keeps the current step and the comment being written
    { machine: feedbackMachine, reconnect: 'restore', dispatchEmitted: true },
  );

  get #snapshot() {
    return this.feedbackController.snapshot;
  }

  // A stable proxy: it can be kept, it always sends to the current actor
  #trigger = this.feedbackController.trigger;

  override render() {
    return html`
      ${this.#snapshot.matches('closed') ? this._closedTpl : this._feedbackTpl}
    `;
  }

  get _feedbackTpl() {
    return html`
      <div class="feedback">
        ${this._closeFeedbackTpl}
        ${this.#snapshot.matches('prompt') ? this._promptTpl : ''}
        ${this.#snapshot.matches('thanks') ? this._thanksTpl : ''}
        ${this.#snapshot.matches('form') ? this._formTpl : ''}
      </div>
      ${this._slotTpl}
    `;
  }

  get _slotTpl() {
    return html`<div><slot></slot></div>`;
  }

  get _closeFeedbackTpl() {
    return html`
      <div class="close-feedback">
        <button
          class="close-button"
          @click=${() => this.#trigger.close()}
        >
          Close
        </button>
      </div>
    `;
  }

  get _promptTpl() {
    return html`
      <div class="step">
        <h2>How was your experience?</h2>

        <button
          class="button"
          @click=${() => this.#trigger['feedback.good']()}
        >
          Good
        </button>

        <button
          class="button"
          @click=${() => this.#trigger['feedback.bad']()}
        >
          Bad
        </button>
      </div>
    `;
  }

  get _thanksTpl() {
    return html`
      <div class="step">
        <h2>Thanks for your feedback.</h2>

        ${
          this.#snapshot.context.feedback
            ? html`<p>"${this.#snapshot.context.feedback}"</p>`
            : ''
        }
      </div>
    `;
  }

  get _formTpl() {
    return html`
      <form
        class="step"
        @submit=${(ev: Event) => {
          ev.preventDefault();
          this.#trigger.submit();
        }}
      >
        <h2>What can we do better?</h2>

        <textarea
          name="feedback"
          rows="4"
          placeholder="So many things..."
          .value=${this.#snapshot.context.feedback}
          @input=${(ev: InputEvent) =>
            this.#trigger['feedback.update']({
              value: (ev.target as HTMLTextAreaElement).value,
            })}
        ></textarea>

        <button
          class="button"
          ?disabled=${!this.feedbackController.can.submit()}
        >
          Submit
        </button>

        <button
          type="button"
          class="button"
          @click=${() => this.#trigger.back()}
        >
          Back
        </button>
      </form>
    `;
  }

  get _closedTpl() {
    return html`
      <div>
        <em>Feedback form closed.</em>
        <button class="button" @click=${() => this.#trigger.restart()}>
          Provide more feedback
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'feedback-element': FeedbackElement;
  }
  // `addEventListener('feedbacksubmit', (ev) => ev.detail.rating)` is typed
  interface HTMLElementEventMap extends EmittedEventMap<typeof feedbackMachine> {}
}
