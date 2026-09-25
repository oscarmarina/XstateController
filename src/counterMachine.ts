import { setup, type MachineContext } from 'xstate';

type CounterContext = { counter: number };

type CounterGuards = {
  canIncrement: (args: { context: CounterContext }) => boolean;
  canDecrement: (args: { context: CounterContext }) => boolean;
};

type CounterActionArgs = {
  context: MachineContext;
  guards: CounterGuards;
};

const counterSetup = setup({
  types: {
    context: {} as CounterContext,
    events: {} as { type: 'INC' } | { type: 'DEC' } | { type: 'TOGGLE' },
  },
  guards: {
    canIncrement: ({ context }) => context.counter < 10,
    canDecrement: ({ context }) => context.counter > 0,
  },
  delays: {
    backoff: ({ context }) => context.counter * 1000,
  },
});

const incAction = ({ context, guards }: CounterActionArgs) => {
  const counterContext = context as CounterContext;

  if (guards.canIncrement({ context: counterContext })) {
    return {
      context: {
        counter: counterContext.counter + 1,
      },
    };
  }

  return undefined;
};

const decAction = ({ context, guards }: CounterActionArgs) => {
  const counterContext = context as CounterContext;

  if (guards.canDecrement({ context: counterContext })) {
    return {
      context: {
        counter: counterContext.counter - 1,
      },
    };
  }

  return undefined;
};

export const counterMachine = counterSetup.createMachine({
  context: { counter: 0 },
  initial: 'enabled',
  states: {
    enabled: {
      on: {
        INC: incAction,
        DEC: decAction,
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
