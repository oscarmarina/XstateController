import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TickController } from '../src/TickController.js';

const createHost = () => {
  const controllers: TickController[] = [];
  return {
    addController: (c: TickController) => controllers.push(c),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
    updated: () => controllers.forEach((c) => c.hostUpdated()),
    disconnect: () => controllers.forEach((c) => c.hostDisconnected()),
  };
};

describe('TickController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests updates while the condition is true', () => {
    let on = true;
    const host = createHost();
    const tick = new TickController(host, { interval: 100, while: () => on });

    host.updated();
    host.updated(); // does not start a second interval
    vi.advanceTimersByTime(300);
    expect(tick.running).toBe(true);
    expect(host.requestUpdate).toHaveBeenCalledTimes(3);

    on = false;
    host.updated();
    vi.advanceTimersByTime(300);
    expect(tick.running).toBe(false);
    expect(host.requestUpdate).toHaveBeenCalledTimes(3);
  });

  it('does not start while the condition is false', () => {
    const host = createHost();
    const tick = new TickController(host, { interval: 100, while: () => false });

    host.updated();
    vi.advanceTimersByTime(300);

    expect(tick.running).toBe(false);
    expect(host.requestUpdate).not.toHaveBeenCalled();
  });

  it('stops when the host is disconnected', () => {
    const host = createHost();
    const tick = new TickController(host, { interval: 100, while: () => true });

    host.updated();
    host.disconnect();
    vi.advanceTimersByTime(300);

    expect(tick.running).toBe(false);
    expect(host.requestUpdate).not.toHaveBeenCalled();
  });
});
