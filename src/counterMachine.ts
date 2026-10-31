import { setup, types } from 'xstate';

const counterSetup = setup({
  // v6: `schemas` (Standard Schema). `types<T>()` is type-only, no runtime validation.
  schemas: {
    // `disabledUntil`: when the `disabled` state ends (epoch ms), so the UI can count down.
    // It is in `context`, so it is persisted and restored with the `after` timer it mirrors.
    context: types<{ counter: number; disabledUntil: number }>(),
    events: {
      INC: types<void>(),
      DEC: types<void>(),
      TOGGLE: types<void>(),
    },
    // The element's public events: `UseMachine` dispatches them on the host (`dispatchEmitted`)
    emitted: {
      counterchange: types<{ counter: number }>(),
      disabledchange: types<{ disabled: boolean; disabledUntil: number }>(),
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
  context: { counter: 0, disabledUntil: 0 },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        // Transition functions: return the next `context`, or `undefined` to ignore the event.
        // The guard comes first: a function that calls `enq` handles the event even when it
        // returns nothing.
        INC: ({ context, guards }, enq) => {
          if (!guards.canIncrement({ context })) {
            return undefined;
          }
          const counter = context.counter + 1;
          enq.emit({ type: 'counterchange', counter });
          return { context: { counter } };
        },
        DEC: ({ context, guards }, enq) => {
          if (!guards.canDecrement({ context })) {
            return undefined;
          }
          const counter = context.counter - 1;
          enq.emit({ type: 'counterchange', counter });
          return { context: { counter } };
        },
        TOGGLE: { target: 'disabled' },
      },
    },
    disabled: {
      // The only clock read in the machine: the `after` timer below is scheduled with the same
      // `backoff`, so both end at the same instant
      entry: (args, enq) => {
        const disabledUntil = Date.now() + args.delays.backoff(args);
        enq.emit({ type: 'disabledchange', disabled: true, disabledUntil });
        return { context: { disabledUntil } };
      },
      // Not run when the actor stops (the host is disconnected): only on leaving `disabled`
      exit: (_, enq) => {
        enq.emit({ type: 'disabledchange', disabled: false, disabledUntil: 0 });
      },
      after: {
        backoff: { target: 'enabled' },
      },
      on: {
        TOGGLE: { target: 'enabled' },
      },
    },
  },
});
