import { html, fixture, assert, expect, fixtureCleanup } from '@open-wc/testing';
import '../define/xstate-counter.js';

suite('XstateCounter', () => {
  /**
   * @type {import('../index').XstateCounter}
   */
  let el;

  teardown(() => fixtureCleanup());

  suite('Default', () => {
    setup(async () => {
      el = await fixture(html` <xstate-counter>light-dom</xstate-counter> `);
    });

    test('default counter 0', () => {
      assert.equal(el.counterController.state.context.counter, 0);
    });

    suite('Semantic Dom and a11y', () => {
      test('SHADOW DOM - Structure test', async () => {
        await expect(el).shadowDom.to.equalSnapshot({ ignoreAttributes: ['id'] });
      });

      test('LIGHT DOM - Structure test', async () => {
        await expect(el).lightDom.to.equalSnapshot({ ignoreAttributes: ['id'] });
      });
      test('a11y', async () => {
        await assert.isAccessible(el);
      });
    });
  });

  suite('Events ', () => {
    setup(async () => {
      el = await fixture(html` <xstate-counter></xstate-counter> `);
    });

    test('increases the counter on Increment button click', () => {
      el.shadowRoot?.querySelector('button')?.click();
      assert.equal(el.counterController.state.context.counter, 1);
    });

    test('decreases the counter on Decrement button click', () => {
      el.shadowRoot?.querySelector('button')?.click();
      /** @type {HTMLButtonElement} */ (el.shadowRoot?.querySelector('button + button'))?.click();
      assert.equal(el.counterController.state.context.counter, 0);
    });

    test('disable the counter on Enabled/Disabled button click', () => {
      let lastCounter = el.counterController.state.context.counter;
      const counterButton = el.shadowRoot?.querySelector('button');
      const disabledButton = el.shadowRoot?.querySelector('div + div button');

      counterButton?.click();
      assert.equal(el.counterController.state.context.counter, lastCounter + 1);
      lastCounter = el.counterController.state.context.counter;

      /** @type {HTMLButtonElement} */ (disabledButton)?.click();
      assert.equal(el.counterController.state.value, 'disabled');

      counterButton?.click();
      assert.equal(el.counterController.state.context.counter, lastCounter);
    });
  });
});
