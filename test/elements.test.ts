import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/define/counter-element.js';
import '../src/define/feedback-element.js';
import type { CounterElement } from '../src/CounterElement.js';
import type { FeedbackElement } from '../src/FeedbackElement.js';

const mount = async <K extends 'counter-element' | 'feedback-element'>(tag: K) => {
  const el = document.createElement(tag);
  document.body.append(el);
  await el.updateComplete;
  return el;
};

const query = <T extends Element = HTMLButtonElement>(el: Element, selector: string): T => {
  const node = el.shadowRoot?.querySelector<T>(selector);
  if (!node) {
    throw new Error(`No "${selector}" in <${el.localName}>`);
  }
  return node;
};

const buttonByText = (el: Element, text: string): HTMLButtonElement => {
  const button = [...(el.shadowRoot?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent?.trim() === text,
  );
  if (!button) {
    throw new Error(`No "${text}" button in <${el.localName}>`);
  }
  return button;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('counter-element', () => {
  it('increments and decrements within the guards', async () => {
    const el: CounterElement = await mount('counter-element');
    const inc = query(el, '[data-counter="increment"]');
    const dec = query(el, '[data-counter="decrement"]');

    expect(dec.disabled).toBe(true);
    expect(inc.disabled).toBe(false);

    for (let i = 0; i < 10; i++) {
      inc.click();
    }
    await el.updateComplete;

    expect(query(el, 'p').textContent).toBe('10');
    expect(inc.disabled).toBe(true);
    expect(dec.disabled).toBe(false);

    dec.click();
    await el.updateComplete;
    expect(query(el, 'p').textContent).toBe('9');
  });

  it('dispatches the `counterchange` the machine emits when the counter changes', async () => {
    const el: CounterElement = await mount('counter-element');
    const events: CustomEvent<{ counter: number }>[] = [];
    // Typed through `HTMLElementEventMap` (`EmittedEventMap<typeof counterMachine>`)
    el.addEventListener('counterchange', (ev) => events.push(ev));
    // `composed` without `bubbles`: ancestors only see it in the capture phase
    const bubbled = vi.fn();
    const captured = vi.fn();
    document.body.addEventListener('counterchange', bubbled);
    document.body.addEventListener('counterchange', captured, { capture: true });

    query(el, '[data-counter="increment"]').click();
    query(el, '[data-counter="increment"]').click();
    await el.updateComplete; // `decrement` is enabled once the counter is above 0
    query(el, '[data-counter="decrement"]').click();

    expect(events.map((ev) => ev.detail)).toEqual([{ counter: 1 }, { counter: 2 }, { counter: 1 }]);
    expect(events[0]).toMatchObject({ bubbles: false, composed: true, target: el });
    expect(bubbled).not.toHaveBeenCalled();
    expect(captured).toHaveBeenCalledTimes(3);
    document.body.removeEventListener('counterchange', bubbled);
    document.body.removeEventListener('counterchange', captured, { capture: true });
  });

  it('dispatches `disabledchange` on entering and leaving `disabled`, not on a move', async () => {
    vi.useFakeTimers();
    const el: CounterElement = await mount('counter-element');
    const details: { disabled: boolean; disabledUntil: number }[] = [];
    el.addEventListener('disabledchange', (ev) => details.push(ev.detail));
    query(el, '[data-counter="increment"]').click();

    buttonByText(el, 'Disabled counter').click();
    expect(details).toEqual([{ disabled: true, disabledUntil: Date.now() + 1000 }]);

    // Disconnecting does not run `exit`, and restoring does not run `entry`
    const container = document.createElement('div');
    document.body.append(container);
    container.append(el);
    expect(details).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(details.at(-1)).toEqual({ disabled: false, disabledUntil: 0 });
    vi.useRealTimers();
  });

  it('disables the counter on toggle', async () => {
    const el: CounterElement = await mount('counter-element');
    query(el, '[data-counter="increment"]').click();
    await el.updateComplete;

    buttonByText(el, 'Disabled counter').click();
    await el.updateComplete;

    expect(el.counterController.snapshot.matches('disabled')).toBe(true);
    expect(query(el, '[data-counter="increment"]').disabled).toBe(true);
    expect(query(el, '[aria-disabled]').getAttribute('aria-disabled')).toBe('true');

    buttonByText(el, 'Enabled counter').click();
    await el.updateComplete;
    expect(el.counterController.snapshot.matches('enabled')).toBe(true);
  });

  it('counts down while disabled, and keeps the deadline when it is moved in the DOM', async () => {
    vi.useFakeTimers();
    const el: CounterElement = await mount('counter-element');
    query(el, '[data-counter="increment"]').click();
    query(el, '[data-counter="increment"]').click();
    await el.updateComplete;

    buttonByText(el, 'Disabled counter').click();
    await el.updateComplete;
    expect(query(el, '.countdown').textContent).toBe('2.0 s');
    expect(el.countdownController.running).toBe(true);

    vi.advanceTimersByTime(500);
    await el.updateComplete;
    expect(query(el, '.countdown').textContent).toBe('1.5 s');

    const container = document.createElement('div');
    document.body.append(container);
    container.append(el); // disconnected and connected again: a restored actor
    await el.updateComplete;
    vi.advanceTimersByTime(500);
    await el.updateComplete;
    expect(query(el, '.countdown').textContent).toBe('1.0 s');

    vi.advanceTimersByTime(1000);
    await el.updateComplete;
    expect(el.counterController.snapshot.matches('enabled')).toBe(true);
    expect(el.shadowRoot?.querySelector('.countdown')).toBeNull();
    expect(el.countdownController.running).toBe(false);
    vi.useRealTimers();
  });

  it('keeps the counter when it is moved in the DOM', async () => {
    const el: CounterElement = await mount('counter-element');
    query(el, '[data-counter="increment"]').click();
    query(el, '[data-counter="increment"]').click();
    await el.updateComplete;

    const container = document.createElement('div');
    document.body.append(container);
    container.append(el); // disconnected and connected again
    await el.updateComplete;

    expect(query(el, 'p').textContent).toBe('2');
    expect(el.counterController.snapshot.context.counter).toBe(2);
  });
});

describe('feedback-element', () => {
  it('thanks right away for good feedback', async () => {
    const el: FeedbackElement = await mount('feedback-element');

    buttonByText(el, 'Good').click();
    await el.updateComplete;

    expect(query(el, 'h2').textContent).toBe('Thanks for your feedback.');
    expect(el.shadowRoot?.querySelector('p')).toBeNull();
  });

  it('dispatches `feedbacksubmit` for good feedback', async () => {
    const el: FeedbackElement = await mount('feedback-element');
    const details: { rating: 'good' | 'bad'; feedback: string }[] = [];
    el.addEventListener('feedbacksubmit', (ev) => details.push(ev.detail));

    buttonByText(el, 'Good').click();

    expect(details).toEqual([{ rating: 'good', feedback: '' }]);
  });

  it('asks for a comment for bad feedback and submits it', async () => {
    const el: FeedbackElement = await mount('feedback-element');
    const details: { rating: 'good' | 'bad'; feedback: string }[] = [];
    el.addEventListener('feedbacksubmit', (ev) => details.push(ev.detail));

    buttonByText(el, 'Bad').click();
    await el.updateComplete;

    const submit = buttonByText(el, 'Submit');
    expect(submit.disabled).toBe(true);

    const textarea = query<HTMLTextAreaElement>(el, 'textarea');
    textarea.value = 'Faster';
    textarea.dispatchEvent(new InputEvent('input'));
    await el.updateComplete;
    expect(submit.disabled).toBe(false);

    submit.click();
    await el.updateComplete;
    expect(query(el, 'p').textContent).toBe('"Faster"');
    expect(details).toEqual([{ rating: 'bad', feedback: 'Faster' }]);
  });

  it('goes back to the prompt from the form', async () => {
    const el: FeedbackElement = await mount('feedback-element');
    buttonByText(el, 'Bad').click();
    await el.updateComplete;

    buttonByText(el, 'Back').click();
    await el.updateComplete;

    expect(query(el, 'h2').textContent).toBe('How was your experience?');
  });

  it('keeps the step and the comment when it is moved in the DOM', async () => {
    const el: FeedbackElement = await mount('feedback-element');
    buttonByText(el, 'Bad').click();
    await el.updateComplete;
    const textarea = query<HTMLTextAreaElement>(el, 'textarea');
    textarea.value = 'Draft';
    textarea.dispatchEvent(new InputEvent('input'));

    const container = document.createElement('div');
    document.body.append(container);
    container.append(el);
    await el.updateComplete;

    expect(query<HTMLTextAreaElement>(el, 'textarea').value).toBe('Draft');
    expect(buttonByText(el, 'Submit').disabled).toBe(false);
  });

  it('closes from any step and restarts with an empty comment', async () => {
    const el: FeedbackElement = await mount('feedback-element');
    buttonByText(el, 'Bad').click();
    await el.updateComplete;
    const textarea = query<HTMLTextAreaElement>(el, 'textarea');
    textarea.value = 'Slow';
    textarea.dispatchEvent(new InputEvent('input'));

    buttonByText(el, 'Close').click();
    await el.updateComplete;
    expect(query(el, 'em').textContent).toBe('Feedback form closed.');

    buttonByText(el, 'Provide more feedback').click();
    await el.updateComplete;
    expect(el.feedbackController.snapshot.matches('prompt')).toBe(true);
    expect(el.feedbackController.snapshot.context.feedback).toBe('');
  });
});
