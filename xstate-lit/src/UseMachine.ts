import {createActor} from 'xstate';
import type {
  Actor,
  ActorOptions,
  AnyStateMachine,
  EventFrom,
  SnapshotFrom,
  Subscription,
} from 'xstate';
import type {ReactiveController, ReactiveControllerHost} from 'lit';

interface XstateOptions<TMachine extends AnyStateMachine> {
  machine: TMachine;
  options?: ActorOptions<TMachine>;
  callback?: (snapshot: SnapshotFrom<TMachine>) => void;
}

export class UseMachine<
  TMachine extends AnyStateMachine,
  THost extends ReactiveControllerHost = ReactiveControllerHost,
> implements ReactiveController {
  machine: TMachine;
  options?: ActorOptions<TMachine>;
  callback?: (snapshot: SnapshotFrom<TMachine>) => void;
  actorRef?: Actor<TMachine>;
  subscription?: Subscription;
  currentSnapshot: SnapshotFrom<TMachine> | undefined;
  readonly host: THost;

  /**
   * @param {THost} host - The host object.
   * @param {{ machine: TMachine; options?: ActorOptions<TMachine>; callback?: (snapshot: SnapshotFrom<TMachine>) => void }} arg - The arguments for the constructor.
   */
  constructor(
    host: THost,
    {machine, options, callback}: XstateOptions<TMachine>
  ) {
    this.machine = machine;
    this.options = options;
    this.callback = callback;
    this.currentSnapshot = this.snapshot;

    (this.host = host).addController(this);
  }

  /**
   * The underlying ActorRef from XState
   */
  get actor(): Actor<TMachine> | undefined {
    return this.actorRef;
  }

  /**
   * The latest snapshot of the actor's state
   */
  get snapshot(): SnapshotFrom<TMachine> | undefined {
    return this.actorRef?.getSnapshot?.();
  }

  /**
   * Send an event to the actor service
   * @param {import('xstate').EventFrom<typeof this.machine>} ev
   */
  send(ev: EventFrom<TMachine>): void {
    this.actorRef?.send(ev);
  }

  unsubscribe(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Internal subscriber for state changes
   * @param {import('xstate').SnapshotFrom<typeof this.machine>} snapshot
   */
  onNext = (snapshot: SnapshotFrom<TMachine>): void => {
    if (this.currentSnapshot !== snapshot) {
      this.currentSnapshot = snapshot;
      this.callback?.(snapshot);
      this.host.requestUpdate();
    }
  };

  startService(): void {
    this.actorRef = createActor(this.machine, this.options);
    this.subscription = this.actorRef?.subscribe(this.onNext);
    this.actorRef?.start();
  }

  stopService(): void {
    this.actorRef?.stop();
  }

  hostConnected(): void {
    this.startService();
  }

  hostDisconnected(): void {
    this.stopService();
  }
}
