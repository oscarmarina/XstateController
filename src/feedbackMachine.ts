import { setup } from 'xstate';

const feedbackSetup = setup({
  types: {
    context: {} as { feedback: string },
    events: {} as
      | { type: 'feedback.good' }
      | { type: 'feedback.bad' }
      | { type: 'feedback.update'; value: string }
      | { type: 'submit' }
      | { type: 'close' }
      | { type: 'back' }
      | { type: 'restart' },
  },
  guards: {
    feedbackValid: ({ context }) => context.feedback.length > 0,
  },
});

const updateAction: any = ({ event }: any) => {
  return { context: { feedback: event.value } };
};
const submitAction: any = ({ context, guards }: any) => {
  if (guards.feedbackValid({ context })) {
    return { target: 'thanks' };
  }
  return undefined;
};
const restartAction: any = () => {
  return { target: 'prompt', context: { feedback: '' } };
};

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
        'feedback.update': updateAction,
        back: { target: 'prompt' },
        submit: submitAction,
      },
    },
    thanks: {},
    closed: {
      on: {
        restart: restartAction,
      },
    },
  },
  on: {
    close: { target: '.closed' },
  },
});
