import { interpret } from 'xstate/dist/xstate.web.js';

/**
 * # XstateController
 *
 * ![Lit](https://img.shields.io/badge/lit-3.0.0-blue.svg)
 *
 * Playground:
 * - [xstate.js.org](https://xstate.js.org/docs/)
 * - [xstate.js.org - examples](https://xstate.js.org/docs/examples/counter.html)
 * - [Original idea](https://codesandbox.io/s/z3o0s?file=/src/toggleMachine.ts)
 * - [Original idea](https://www.thisdot.co/blog/state-machines-using-xstate-and-svelte-part-1)
 * - [xstate.web.js](https://github.com/statelyai/xstate/issues/787#issuecomment-551940687)
 *
 * - [xstate-lit](https://github.com/InsightSoftwareConsortium/xstate-lit/tree/main)
 * 
 * ## Demo
 *
 * [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/oscarmarina/XstateController)
 *
 * ## Installation
 *
 * ```bash
 * npm i && npm start
 * ```
 *
 * - [Web Component with Lit - Scaffolding](https://github.com/oscarmarina/create-wc)
 * <hr>
 */
export class XstateController {
  constructor(host, machine, propKey) {
    (this.host = host).addController(this);
    this.service = interpret(machine).start();
    this.propKey = propKey;
  }

  get state() {
    return this.service.getSnapshot();
  }

  get send() {
    return this.service.send;
  }

  hostConnected() {
    this.service.onTransition(state => {
      if (state.changed) {
        this.propKey in this.host && (this.host[this.propKey] = state);
        this.host.requestUpdate();
      }
    });
  }

  hostDisconnected() {
    this.service.stop();
  }
}
