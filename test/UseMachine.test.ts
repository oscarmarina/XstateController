import { afterEach, describe, expect, it, vi } from 'vitest';
import { html, LitElement } from 'lit';
import { createMachine, setup, types, type SnapshotFrom } from 'xstate';
import { UseMachine, type EmittedEventMap } from '../xstate-lit/src/index.js';

const toggleMachine = setup({
  schemas: {
    context: types<{ count: number; label: string }>(),
    events: {
      INC: types<void>(),
      TOGGLE: types<void>(),
      RENAME: types<{ label: string }>(),
    },
    emitted: {
      renamed: types<{ label: string }>(),
      incremented: types<{ count: number }>(),
    },
  },
}).createMachine({
  context: { count: 0, label: '' },
  initial: 'off',
  states: {
    off: {
      on: {
        TOGGLE: { target: 'on' },
      },
    },
    on: {
      on: {
        INC: ({ context }, enq) => {
          if (context.count >= 2) {
            return undefined;
          }
          enq.emit({ type: 'incremented', count: context.count + 1 });
          return { context: { count: context.count + 1 } };
        },
        RENAME: ({ event }, enq) => {
          enq.emit({ type: 'renamed', label: event.label });
          return { context: { label: event.label } };
        },
        TOGGLE: { target: 'off' },
      },
    },
  },
});

const boomMachine = createMachine({
  initial: 'idle',
  states: {
    idle: {
      on: {
        go: () => {
          throw new Error('boom');
        },
      },
    },
  },
});

type ToggleSnapshot = SnapshotFrom<typeof toggleMachine>;

class TestHost extends LitElement {
  statuses: string[] = [];
  renders = 0;
  controller = new UseMachine(this, {
    machine: toggleMachine,
    onSnapshot: (snapshot: ToggleSnapshot) => this.statuses.push(snapshot.status),
  });

  override render() {
    this.renders++;
    return html`${this.controller.snapshot.context.count}`;
  }
}
customElements.define('test-host', TestHost);

const mount = async <T extends HTMLElement>(el: T): Promise<T> => {
  document.body.append(el);
  await (el as unknown as LitElement).updateComplete;
  return el;
};

/** Waits past the macrotask XState uses to report unhandled errors. */
const nextMacrotask = () => new Promise((resolve) => setTimeout(resolve, 20));

/** Collects errors XState reports as unhandled (thrown from a `setTimeout`). */
const captureUnhandled = () => {
  const errors: unknown[] = [];
  const listener = (event: ErrorEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    errors.push(event.error);
  };
  window.addEventListener('error', listener, { capture: true });
  return {
    errors,
    dispose: () => window.removeEventListener('error', listener, { capture: true }),
  };
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('UseMachine', () => {
  it('exposes the actor before the host is connected', () => {
    const host = new TestHost();

    expect(host.controller.snapshot.status).toBe('active');
    expect(host.controller.snapshot.value).toBe('off');
    expect(host.controller.actor).toBe(host.controller.actorRef);
    expect(host.statuses).toEqual([]);
  });

  it('starts the actor on connect and re-renders on every snapshot', async () => {
    const host = await mount(new TestHost());
    const renders = host.renders;

    host.controller.trigger.TOGGLE();
    host.controller.trigger.INC();
    await host.updateComplete;

    expect(host.statuses).toEqual(['active', 'active', 'active']);
    expect(host.renders).toBe(renders + 1);
    expect(host.shadowRoot?.textContent).toBe('1');
  });

  it('sends events with payload through `trigger` and `send`', async () => {
    const host = await mount(new TestHost());

    host.controller.trigger.TOGGLE();
    host.controller.trigger.RENAME({ label: 'a' });
    expect(host.controller.snapshot.context.label).toBe('a');

    host.controller.send({ type: 'RENAME', label: 'b' });
    expect(host.controller.snapshot.context.label).toBe('b');
  });

  it('`can` follows the machine: states, inline guards and the actor status', async () => {
    const host = await mount(new TestHost());
    const { can, trigger } = host.controller;

    expect(can.INC()).toBe(false);
    expect(can.TOGGLE()).toBe(true);

    trigger.TOGGLE();
    expect(can.INC()).toBe(true);
    expect(can.RENAME({ label: 'x' })).toBe(true);

    trigger.INC();
    trigger.INC();
    expect(can.INC()).toBe(false);

    host.remove();
    expect(can.TOGGLE()).toBe(false);
  });

  it('ignores an event when `can` is false, and XState warns in development builds', async () => {
    const host = await mount(new TestHost());
    const { can, trigger } = host.controller;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(can.INC()).toBe(false);
    trigger.INC();

    expect(host.controller.snapshot.value).toBe('off');
    expect(host.controller.snapshot.context.count).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('received event "INC" in state "off" with no matching transition'),
    );
    warn.mockRestore();
  });

  it.each(['trigger', 'can'] as const)(
    '`%s` is not a thenable and ignores symbol keys',
    async (key) => {
      const proxy = new TestHost().controller[key];

      expect((proxy as Record<string, unknown>).then).toBeUndefined();
      expect((proxy as Record<symbol, unknown>)[Symbol.toPrimitive]).toBeUndefined();
      await expect(Promise.resolve(proxy)).resolves.toBe(proxy);
    },
  );

  it('keeps `trigger` and `can` usable across reconnections (stable proxies)', async () => {
    const host = await mount(new TestHost());
    const { trigger, can } = host.controller;
    const firstActor = host.controller.actor;

    trigger.TOGGLE();
    trigger.INC();
    expect(host.controller.snapshot.context.count).toBe(1);

    host.remove();
    expect(can.TOGGLE()).toBe(false);

    await mount(host);
    expect(host.controller.actor).not.toBe(firstActor);
    expect(can.TOGGLE()).toBe(true);

    // The kept proxies reach the new actor; XState's `actor.trigger` would reach the stopped one
    trigger.TOGGLE();
    trigger.INC();
    expect(host.controller.snapshot.context.count).toBe(1);
    expect(firstActor.getSnapshot().context.count).toBe(1);
    expect(host.controller.trigger).toBe(trigger);
  });

  it('notifies the stopped snapshot on disconnect and creates a new actor on reconnect', async () => {
    const host = await mount(new TestHost());
    host.controller.trigger.TOGGLE();
    const firstActor = host.controller.actor;

    host.remove();
    expect(host.statuses.at(-1)).toBe('stopped');
    expect(firstActor.getSnapshot().status).toBe('stopped');

    await mount(host);
    expect(host.controller.actor).not.toBe(firstActor);
    expect(host.controller.snapshot.value).toBe('off');
    expect(host.statuses.at(-1)).toBe('active');

    host.controller.trigger.TOGGLE();
    expect(host.controller.snapshot.value).toBe('on');
  });

  it('`actor.trigger` read before an `await` drops a response that arrives after a reconnection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const host = await mount(new TestHost());
    host.controller.trigger.TOGGLE();

    // A request starts in the first session
    const session = host.controller.actor.trigger;
    let respond!: (label: string) => void;
    const response = new Promise<string>((resolve) => (respond = resolve));
    const pending = response.then((label) => session.RENAME({ label }));

    // The element is moved in the DOM while the request is pending
    host.remove();
    await mount(host);
    host.controller.trigger.TOGGLE();

    respond('stale');
    await pending;

    expect(host.controller.snapshot.context.label).toBe('');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not delivered (stopped)'));

    // `controller.trigger` would have delivered it to the new session
    host.controller.trigger.RENAME({ label: 'stale' });
    expect(host.controller.snapshot.context.label).toBe('stale');
    warn.mockRestore();
  });

  it('does not subscribe twice when started again while connected', async () => {
    const host = await mount(new TestHost());
    const { subscription } = host.controller;

    host.controller.startService();

    expect(host.controller.subscription).toBe(subscription);
  });

  describe("reconnect: 'restore'", () => {
    const timerMachine = createMachine({
      initial: 'waiting',
      states: {
        waiting: { after: { 1000: { target: 'ready' } } },
        ready: {},
      },
    });

    /** A minimal host: connect and disconnect are driven by the test. */
    const createHost = () => {
      const controllers: { hostConnected?: () => void; hostDisconnected?: () => void }[] = [];
      const host = {
        addController: (c: (typeof controllers)[number]) => controllers.push(c),
        removeController: vi.fn(),
        requestUpdate: vi.fn(),
        updateComplete: Promise.resolve(true),
        connect:() => controllers.forEach((c) => c.hostConnected?.()),
        disconnect: () => controllers.forEach((c) => c.hostDisconnected?.()),
      };
      return host;
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    it('resumes the state the actor had when the host was disconnected', async () => {
      const statuses: string[] = [];
      const host = createHost();
      const controller = new UseMachine(host, {
        machine: toggleMachine,
        reconnect: 'restore',
        onSnapshot: (snapshot) => statuses.push(snapshot.status),
      });

      host.connect();
      controller.trigger.TOGGLE();
      controller.trigger.INC();
      controller.trigger.RENAME({ label: 'kept' });
      const firstActor = controller.actor;

      host.disconnect();
      host.connect();

      expect(controller.actor).not.toBe(firstActor);
      expect(controller.snapshot.value).toBe('on');
      expect(controller.snapshot.context).toEqual({ count: 1, label: 'kept' });
      expect(statuses.slice(-2)).toEqual(['stopped', 'active']);

      controller.trigger.INC();
      expect(controller.snapshot.context.count).toBe(2);
    });

    it('keeps the deadline of pending timers while disconnected', () => {
      vi.useFakeTimers();
      const host = createHost();
      const controller = new UseMachine(host, { machine: timerMachine, reconnect: 'restore' });

      host.connect();
      vi.advanceTimersByTime(300);
      host.disconnect();
      vi.advanceTimersByTime(200);
      host.connect();

      vi.advanceTimersByTime(499);
      expect(controller.snapshot.value).toBe('waiting');
      vi.advanceTimersByTime(1);
      expect(controller.snapshot.value).toBe('ready');
    });

    it('fires a timer that expired while disconnected', () => {
      vi.useFakeTimers();
      const host = createHost();
      const controller = new UseMachine(host, { machine: timerMachine, reconnect: 'restore' });

      host.connect();
      host.disconnect();
      vi.advanceTimersByTime(1500);
      host.connect();
      vi.advanceTimersByTime(0);

      expect(controller.snapshot.value).toBe('ready');
    });

    it('restarts an actor that had finished with an error', () => {
      const host = createHost();
      const controller = new UseMachine(host, {
        machine: boomMachine,
        reconnect: 'restore',
        onError: () => {},
      });

      host.connect();
      controller.send({ type: 'go' });
      expect(controller.snapshot.status).toBe('error');

      host.disconnect();
      host.connect();
      expect(controller.snapshot.status).toBe('active');
    });

    it('restarts when `machine` was reassigned while disconnected', () => {
      const host = createHost();
      const controller = new UseMachine(host, { machine: toggleMachine, reconnect: 'restore' });

      host.connect();
      controller.trigger.TOGGLE();
      host.disconnect();
      controller.machine = toggleMachine.provide({});
      host.connect();

      expect(controller.snapshot.value).toBe('off');
    });

    it('restarts by default', () => {
      const host = createHost();
      const controller = new UseMachine(host, { machine: toggleMachine });

      host.connect();
      controller.trigger.TOGGLE();
      host.disconnect();
      host.connect();

      expect(controller.reconnect).toBe('restart');
      expect(controller.snapshot.value).toBe('off');
    });
  });

  describe('emitted events', () => {
    it('`on` handles emitted events by type or with `*`, until unsubscribed', async () => {
      const host = await mount(new TestHost());
      const renamed: string[] = [];
      const all: string[] = [];
      const subscription = host.controller.on('renamed', (event) => renamed.push(event.label));
      host.controller.on('*', (event) => all.push(event.type));

      host.controller.trigger.TOGGLE();
      host.controller.trigger.INC();
      host.controller.trigger.RENAME({ label: 'a' });
      subscription.unsubscribe();
      host.controller.trigger.RENAME({ label: 'b' });

      expect(renamed).toEqual(['a']);
      expect(all).toEqual(['incremented', 'renamed', 'renamed']);
    });

    it('`on` keeps handling events after a reconnection, unlike `actor.on`', async () => {
      const host = await mount(new TestHost());
      const fromController: string[] = [];
      const fromActor: string[] = [];
      host.controller.on('renamed', (event) => fromController.push(event.label));
      host.controller.actor.on('renamed', (event) => fromActor.push(event.label));

      host.remove();
      await mount(host);
      host.controller.trigger.TOGGLE();
      host.controller.trigger.RENAME({ label: 'after' });

      expect(fromController).toEqual(['after']);
      expect(fromActor).toEqual([]);
    });

    it('one failing `on` handler does not keep the others from the event', async () => {
      vi.useFakeTimers();
      const host = await mount(new TestHost());
      const received: string[] = [];
      host.controller.on('renamed', () => {
        throw new Error('handler');
      });
      host.controller.on('renamed', (event) => received.push(event.label));

      host.controller.trigger.TOGGLE();
      host.controller.trigger.RENAME({ label: 'x' });

      expect(received).toEqual(['x']);
      expect(() => vi.runAllTimers()).toThrow('handler');
      vi.useRealTimers();
    });

    it('does not dispatch DOM events by default', async () => {
      const host = await mount(new TestHost());
      const listener = vi.fn();
      host.addEventListener('renamed', listener);

      host.controller.trigger.TOGGLE();
      host.controller.trigger.RENAME({ label: 'x' });

      expect(listener).not.toHaveBeenCalled();
    });

    describe('dispatchEmitted', () => {
      class EmittingHost extends LitElement {
        static init: boolean | { bubbles?: boolean; composed?: boolean } = true;
        controller = new UseMachine(this, {
          machine: toggleMachine,
          dispatchEmitted: EmittingHost.init,
        });
      }
      customElements.define('emitting-host', EmittingHost);

      it('dispatches each emitted event on the host, with the payload as `detail`', async () => {
        EmittingHost.init = true;
        const host = await mount(new EmittingHost());
        const events: CustomEvent<{ label: string }>[] = [];
        host.addEventListener('renamed', (ev) => events.push(ev as CustomEvent));

        host.controller.trigger.TOGGLE();
        host.controller.trigger.RENAME({ label: 'a' });

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(CustomEvent);
        expect(events[0]).toMatchObject({
          type: 'renamed',
          detail: { label: 'a' },
          bubbles: false,
          composed: true,
        });
      });

      it('uses the given `EventInit`', async () => {
        EmittingHost.init = { bubbles: true };
        const host = await mount(new EmittingHost());
        const events: Event[] = [];
        host.addEventListener('renamed', (ev) => events.push(ev));

        host.controller.trigger.TOGGLE();
        host.controller.trigger.RENAME({ label: 'a' });

        expect(events[0]).toMatchObject({ bubbles: true, composed: false });
      });

      it('queues a `trigger` called from a listener, and dispatches its events in order', async () => {
        EmittingHost.init = true;
        const host = await mount(new EmittingHost());
        const log: string[] = [];
        host.addEventListener('renamed', (ev) => {
          const { label } = (ev as CustomEvent<{ label: string }>).detail;
          log.push(`${label} (snapshot: ${host.controller.snapshot.context.label})`);
          if (label === 'a') {
            host.controller.trigger.RENAME({ label: 'b' });
            log.push(`after trigger (snapshot: ${host.controller.snapshot.context.label})`);
          }
        });

        host.controller.trigger.TOGGLE();
        host.controller.trigger.RENAME({ label: 'a' });

        expect(log).toEqual([
          'a (snapshot: a)',
          'after trigger (snapshot: a)',
          'b (snapshot: b)',
        ]);
      });

      it('a listener that throws does not stop the other listeners or the actor', async () => {
        EmittingHost.init = true;
        const unhandled = captureUnhandled();
        const host = await mount(new EmittingHost());
        const received = vi.fn();
        host.addEventListener('renamed', () => {
          throw new Error('listener');
        });
        host.addEventListener('renamed', received);

        host.controller.trigger.TOGGLE();
        host.controller.trigger.RENAME({ label: 'a' });
        unhandled.dispose();

        expect(received).toHaveBeenCalledOnce();
        expect(unhandled.errors).toEqual([expect.objectContaining({ message: 'listener' })]);
        expect(host.controller.snapshot.status).toBe('active');
      });

      it('requires a host that is an `EventTarget`', () => {
        const host = {
          addController: vi.fn(),
          removeController: vi.fn(),
          requestUpdate: vi.fn(),
          updateComplete: Promise.resolve(true),
        };

        expect(
          () => new UseMachine(host, { machine: toggleMachine, dispatchEmitted: true }),
        ).toThrow(TypeError);
      });
    });
  });

  describe('errors', () => {
    const createErrorHost = (onError?: (error: unknown) => void) => {
      const statuses: string[] = [];
      const host = document.createElement('div') as unknown as LitElement;
      const controllers: { hostConnected?: () => void; hostDisconnected?: () => void }[] = [];
      Object.assign(host, {
        addController: (c: (typeof controllers)[number]) => controllers.push(c),
        requestUpdate: vi.fn(),
      });
      const controller = new UseMachine(host, {
        machine: boomMachine,
        onSnapshot: (snapshot) => statuses.push(snapshot.status),
        onError,
      });
      controllers.forEach((c) => c.hostConnected?.());
      return { controller, statuses, host };
    };

    it('sends the error snapshot to `onSnapshot` and the error to `onError`', async () => {
      const unhandled = captureUnhandled();
      const onError = vi.fn();
      const { controller, statuses, host } = createErrorHost(onError);

      controller.send({ type: 'go' });
      await nextMacrotask();
      unhandled.dispose();

      expect(statuses).toEqual(['active', 'error']);
      expect(controller.can.go()).toBe(false);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
      expect(host.requestUpdate).toHaveBeenCalledTimes(2);
      expect(unhandled.errors).toEqual([]);
    });

    it('lets XState report the error as unhandled without `onError`', async () => {
      const unhandled = captureUnhandled();
      const { controller, statuses } = createErrorHost();

      controller.send({ type: 'go' });
      await nextMacrotask();
      unhandled.dispose();

      expect(statuses).toEqual(['active', 'error']);
      expect(unhandled.errors).toEqual([expect.objectContaining({ message: 'boom' })]);
    });

    it('does not report the error when another subscriber handles it', async () => {
      const unhandled = captureUnhandled();
      const { controller } = createErrorHost();
      const external = vi.fn();
      controller.actor.subscribe({ error: external });

      controller.send({ type: 'go' });
      await nextMacrotask();
      unhandled.dispose();

      expect(external).toHaveBeenCalledOnce();
      expect(unhandled.errors).toEqual([]);
    });
  });
});

// Type-level checks: `npm run typecheck`
export const typeChecks = (host: TestHost) => {
  const { trigger, can } = host.controller;
  // @ts-expect-error `RENAME` requires a payload
  trigger.RENAME();
  // @ts-expect-error `label` must be a string
  trigger.RENAME({ label: 1 });
  // @ts-expect-error unknown event
  trigger.NOPE();
  // @ts-expect-error `RENAME` requires a payload
  can.RENAME();
  // @ts-expect-error unknown event
  can.NOPE();
  // @ts-expect-error `INC` has no payload
  can.INC({ label: 'x' });

  host.controller.on('renamed', (event) => event.label.toUpperCase());
  // @ts-expect-error unknown emitted event
  host.controller.on('nope', () => {});

  // @ts-expect-error renamed to `onSnapshot`
  new UseMachine(host, { machine: toggleMachine, callback: () => {} });

  const map = {} as EmittedEventMap<typeof toggleMachine>;
  const label: string = map.renamed.detail.label;
  // @ts-expect-error the `type` is the DOM event name, not part of `detail`
  void map.renamed.detail.type;
  return label;
};
