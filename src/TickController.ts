import type { ReactiveController, ReactiveControllerHost } from 'lit';

export type TickControllerOptions = {
  /** Milliseconds between updates. */
  interval: number;
  /** Ticks while it returns `true`; checked after each host update. */
  while: () => boolean;
};

/**
 * Requests a host update every `interval` ms while `while()` is `true`, for UI that depends on
 * the current time (a countdown). Stops when the condition turns `false` and on disconnect.
 */
export class TickController implements ReactiveController {
  readonly host: ReactiveControllerHost;
  readonly options: TickControllerOptions;
  #id?: ReturnType<typeof setInterval>;

  constructor(host: ReactiveControllerHost, options: TickControllerOptions) {
    this.options = options;
    (this.host = host).addController(this);
  }

  get running(): boolean {
    return this.#id !== undefined;
  }

  hostUpdated(): void {
    if (this.options.while()) {
      this.#id ??= setInterval(() => this.host.requestUpdate(), this.options.interval);
    } else {
      this.#stop();
    }
  }

  hostDisconnected(): void {
    this.#stop();
  }

  #stop(): void {
    clearInterval(this.#id);
    this.#id = undefined;
  }
}
