import '../src/define/feedback-element.ts';
import '../src/define/counter-element.ts';

// The public events each machine emits, dispatched on the elements (`dispatchEmitted`).
// They do not bubble (`{ composed: true }`), so the document listens in the capture phase.
for (const type of ['counterchange', 'disabledchange', 'feedbacksubmit']) {
  document.addEventListener(type, (ev) => console.info(type, ev.detail), { capture: true });
}
