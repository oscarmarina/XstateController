import { interpret } from 'xstate/dist/xstate.web.js';

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
