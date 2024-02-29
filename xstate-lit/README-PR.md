
"test:lit": "jest packages/xstate-lit",
"format": "npx prettier --write './**/*.{js,ts}'",


This pull request adds compatibility for linking XState with Lit.

## Motivation

XState's state machines offer a structured and predictable approach to handle complex logic, while Lit facilitates reactive UI updates in response to state changes.

## Changes

It follows the established structure of the xstate repository, including:

### 📂 packages/xstate-lit/src/

Adds xstate-lit to packages with code, tests, and documentation.

▨  **UseMachine.ts**

Implements the @xstate/lit controller, referencing other packages for guidance as much as possible.
@xstate/svelte, @xstate/vue and [Lifecycle: reactive controller adapters for other frameworks](https://github.com/lit/lit/issues/1682#issue-836224813)

- Provides get `actor`,  get `snapshot`, and `send(ev: EventFrom<TMachine>)` method for interacting with the XState actor.
- Exposes an `unsubscribe` method 
- Option to pass a reactive property for use in the actor's subscribe method.
- Documentation of the API in the README file.

```js
this.toggleController = new UseMachine(this, {
  machine: toggleMachine,
  options: { inspect },
  subscriptionProperty: '_xstate',
});

// ...

private get _turn() {
    return this.toggleController.snapshot.matches('inactive');
  }

render() {
  return html`
    <button @click=${() => this.toggleController.send({ type: 'TOGGLE' })}>
      ${this._turn ? 'Turn on' : 'Turn off'}
    </button>
  `;
}

```

▨  **useActorRef.ts**

Creates and returns the XState actor without Lit-specific dependencies (handled in UseMachine.js).

▨  **index.ts:**

Exports only UseMachine.ts.

> It is a structure more in line with the working approach used by Lit's controllers.

### 📂 packages/xstate-lit/test
Leverages @open-wc/testing-helpers for unit testing components, drawing inspiration from existing tests in Svelte and Vue integrations.

▨  **useActor.test.ts**

```js
it('should be able to spawn an actor from actor logic', async () => {
    const el: UseActorWithTransitionLogic = await fixture(
      html`<use-actor-with-transition-logic></use-actor-with-transition-logic>`
    );
    const buttonEl = getByTestId(el, 'count');
    await waitFor(() => expect(buttonEl.textContent?.trim()).toEqual('0'));
    await fireEvent.click(buttonEl);
    await el.updateComplete;
    await waitFor(() => expect(buttonEl.textContent?.trim()).toEqual('1'));
  });
```

▨  **useActorRef.test.ts**
```js
it('observer should be called with next state', async () => {
    const el: UseActorRef = await fixture(
      html`<use-actor-ref></use-actor-ref>`
    );
    const buttonEl = getByTestId(el, 'button');
    await waitFor(() => expect(buttonEl.textContent?.trim()).toBe('Turn on'));
    await fireEvent.click(buttonEl);
    await el.updateComplete;
    await waitFor(() => expect(buttonEl.textContent?.trim()).toBe('Turn off'));
  });
```

### 📂 templates/lit-ts/
Adds examples and documentation.

#### Usage:
```bash
npm i && npm start
```

**Provides two demos:**
- `<lit-ts>` & feedbackMachine: Equal to existing templates in other packages.
- `<lit-ts-counter>` & counterMachine: Illustrates using a reactive property and the [inspect API](https://stately.ai/docs/inspection#snapshot-inspection-events) to listen for events that caused transitions and reset reactive property.

| <lit-ts>                           | <lit-ts-counter>                           |
|---------------------------------|---------------------------------|
|  ![<lit-ts>](https://github.com/statelyai/xstate/assets/3649029/8a15a56d-b871-4c12-967b-cf9f41d58e47)    | ![<lit-ts-counter>](https://github.com/statelyai/xstate/assets/3649029/7674ea65-24a2-473a-a809-dd8fd3346bb8) |

<hr>

>  ⚠ **Update before "publish"**

```js
import { UseMachine } from '../../../packages/xstate-lit/src/index.js';
// import { UseMachine } from '@xstate/lit';
```

- templates/lit-ts/src/LitTs.ts (line 4 and 5)
- templates/lit-ts/src/LitTsCounter.ts (line 5 and 6)

<hr>

## Other Modified Files:

**▨  jest.config.js**

Add transformIgnorePatterns to accommodate Lit and Open-WC.

```js
transformIgnorePatterns: [
  'node_modules/(?!(@open-wc|lit-html|lit-element|lit|@lit)/)'
],
```

### 📂 scripts/jest-utils/

**▨  setup.js**

Filters out Lit's "Lit is in dev mode..." console logs during tests.

<hr>

