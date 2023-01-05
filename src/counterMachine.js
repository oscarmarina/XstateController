import { createMachine, assign } from 'xstate/dist/xstate.web.js';

const states = {
  enabled: 'enabled',
  disabled: 'disabled',
};

const events = {
  increment: 'INC',
  decrement: 'DEC',
  toggle: 'TOGGLE',
};

const increment = context => context.counter + 1;
const decrement = context => context.counter - 1;

const isNotMax = context => context.counter < 10;
const isNotMin = context => context.counter > 0;

export const counterMachine = createMachine({
  id: 'counter',
  initial: 'enabled',
  context: {
    counter: 0,
  },
  states: {
    [states.enabled]: {
      on: {
        [events.increment]: {
          actions: assign({ counter: increment }),
          cond: isNotMax,
        },
        [events.decrement]: {
          actions: assign({ counter: decrement }),
          cond: isNotMin,
        },
        [events.toggle]: {
          target: states.disabled,
        },
      },
    },
    [states.disabled]: {
      on: {
        [events.toggle]: {
          target: states.enabled,
        },
      },
    },
  },
});
