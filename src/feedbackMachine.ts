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
        'feedback.good': { target: 'thanks' },
        'feedback.bad': { target: 'form' },
      },
    },
    form: {
      on: {
        'feedback.update': ({ event }) => ({
          context: { feedback: event.value },
        }),
        back: { target: 'prompt' },
        submit: ({ context, guards }) =>
          guards.feedbackValid({ context }) ? { target: 'thanks' } : undefined,
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
