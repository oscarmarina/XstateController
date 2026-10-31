import { setup, types } from 'xstate';

const feedbackSetup = setup({
  // v6: `schemas` (Standard Schema). `types<T>()` is type-only, no runtime validation.
  schemas: {
    context: types<{ feedback: string }>(),
    events: {
      'feedback.good': types<void>(),
      'feedback.bad': types<void>(),
      'feedback.update': types<{ value: string }>(),
      submit: types<void>(),
      close: types<void>(),
      back: types<void>(),
      restart: types<void>(),
    },
    // The element's public events: `UseMachine` dispatches them on the host (`dispatchEmitted`)
    emitted: {
      feedbacksubmit: types<{ rating: 'good' | 'bad'; feedback: string }>(),
    },
  },
  guards: {
    feedbackValid: ({ context }) => context.feedback.length > 0,
  },
});

export const feedbackMachine = feedbackSetup.createMachine({
  id: 'feedback',
  initial: 'prompt',
  context: { feedback: '' },
  states: {
    prompt: {
      on: {
        'feedback.good': (_, enq) => {
          enq.emit({ type: 'feedbacksubmit', rating: 'good', feedback: '' });
          return { target: 'thanks' };
        },
        'feedback.bad': { target: 'form' },
      },
    },
    form: {
      on: {
        'feedback.update': ({ event }) => ({
          context: { feedback: event.value },
        }),
        back: { target: 'prompt' },
        // The guard comes first: a function that calls `enq` handles the event even when it
        // returns nothing
        submit: ({ context, guards }, enq) => {
          if (!guards.feedbackValid({ context })) {
            return undefined;
          }
          enq.emit({ type: 'feedbacksubmit', rating: 'bad', feedback: context.feedback });
          return { target: 'thanks' };
        },
      },
    },
    thanks: {},
    closed: {
      on: {
        restart: () => ({ target: 'prompt', context: { feedback: '' } }),
      },
    },
  },
  on: {
    close: { target: '.closed' },
  },
});
