import { setup, types } from 'xstate';

const counterSetup = setup({
  // v6: `schemas` (Standard Schema). `types<T>()` is type-only, no runtime validation.
  schemas: {
    context: types<{ counter: number }>(),
    events: {
      INC: types<void>(),
      DEC: types<void>(),
      TOGGLE: types<void>(),
    },
  },
  guards: {
    canIncrement: ({ context }) => context.counter < 10,
    canDecrement: ({ context }) => context.counter > 0,
  },
  delays: {
    backoff: ({ context }) => context.counter * 1000,
  },
});

export const counterMachine = counterSetup.createMachine({
  context: { counter: 0 },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        // Transition functions: return the next `context`, or `undefined` to ignore the event
        INC: ({ context, guards }) =>
          guards.canIncrement({ context })
            ? { context: { counter: context.counter + 1 } }
            : undefined,
        DEC: ({ context, guards }) =>
          guards.canDecrement({ context })
            ? { context: { counter: context.counter - 1 } }
            : undefined,
        TOGGLE: { target: 'disabled' },
      },
    },
    disabled: {
      after: {
        backoff: { target: 'enabled' },
      },
      on: {
        TOGGLE: { target: 'enabled' },
      },
    },
  },
});
