import { createMachine, assign } from 'xstate';

const states = {
  enabled: 'enabled',
  disabled: 'disabled',
};

const increment = {
  counter: ({ context }) => context.counter + 1,
  event: ({ event }) => event,
};
const decrement = {
  counter: ({ context }) => context.counter - 1,
  event: ({ event }) => event,
};

const isNotMax = ({ context }) => context.counter < 10;
const isNotMin = ({ context }) => context.counter > 0;

export const counterMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMD2BXAdgFzAJwDoxMBDAIwBtIBiASQDkBhAbQAYBdRUAB1VgEts-VJi4gAHogAsATgIAOeQCZ5ARiUBWADQgAnolUB2eQVaGZANg2t5xmawuaAvk51osuQsXJUI1ACIAoiwcYrwCQiJikgiyBOqqrDIAzIbaeohqBBoubhg4+ESklDQAKgDyAOKVADKBbJxIIOGCwqJNMaoWyQTJSqzJ6un6CCqGBErJMhryyXPzc7kg7gWEEPywPmVVtfWhTS2R7aCd3b39g5o6I5MWBIZTMwsLqi6uIJioEHBiK55hfFaUQ6iAAtKprmCLEs-oVvCUIACIm1otJDJDRuYCFZHDl3rC1hstoiDoCjqjRvI7hZzBZbMNEColPENLi3k4gA */
  id: 'counter',
  context: { counter: 0, event: undefined },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        INC: {
          actions: assign(increment),
          guard: isNotMax,
        },
        DEC: {
          actions: assign(decrement),
          guard: isNotMin,
        },
        TOGGLE: {
          target: states.disabled,
        },
      },
    },
    disabled: {
      on: {
        TOGGLE: {
          target: states.enabled,
        },
      },
    },
  },
});
