import { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  Actor,
  AnyStateMachine,
  ActorOptions,
  createActor,
  EventFrom,
  Subscription,
  SnapshotFrom,
} from 'xstate';

export class UseMachine<TMachine extends AnyStateMachine>
  implements ReactiveController
{
  private host: ReactiveControllerHost;
  private machine: TMachine;
  private options?: ActorOptions<TMachine>;
  private callback?: (snapshot: SnapshotFrom<TMachine>) => void;
  private actorRef = {} as Actor<TMachine>;
  private subs: Subscription = { unsubscribe: () => {} };
  private currentSnapshot: SnapshotFrom<TMachine>;

  #sendHandler?: () => void;

  // @ts-ignore
  #sendHandlerNoNullish?: () => void;

  constructor(
    host: ReactiveControllerHost,
    {
      machine,
      options,
      callback,
    }: {
      machine: TMachine;
      options?: ActorOptions<TMachine>;
      callback?: (snapshot: SnapshotFrom<TMachine>) => void;
    }
  ) {
    this.machine = machine;
    this.options = options;
    this.callback = callback;
    this.currentSnapshot = this.snapshot;

    (this.host = host).addController(this);
  }

  get actor() {
    return this.actorRef;
  }

  get snapshot() {
    return this.actorRef?.getSnapshot?.();
  }

  // the function is invoked as soon as the template is processed, rather than in response to a click event.
  sendHandlerCache(ev: EventFrom<TMachine>) {
    console.log('#sendHandler::', ev);
    // the use of "nullish assignment (??=)" causes it to be assigned only once
    return (this.#sendHandler ??= () => this.sendEventFrom(ev));
  }

  // the function is invoked as soon as the template is processed, rather than in response to a click event.
  sendHandler(ev: EventFrom<TMachine>) {
    console.log('#sendHandlerNoNullish::', ev);
    // In this way it works, but does it make sense to create a class field?
    return (this.#sendHandlerNoNullish = () => this.sendEventFrom(ev));
  }

  // the function is invoked as soon as the template is processed, rather than in response to a click event.
  send(ev: EventFrom<TMachine>) {
    console.log('send - arrow function::', ev);
    // It works, the question is does it improve the DX?
    // And does it eliminate the closure creation on every render for a small performance gain?
    return () => this.sendEventFrom(ev);
  }

  sendEventFrom(ev: EventFrom<TMachine>) {
    console.log('click::', ev);
    this.actorRef?.send(ev);
  }

  unsubscribe() {
    this.subs.unsubscribe();
  }

  protected onNext = (snapshot: SnapshotFrom<TMachine>) => {
    if (this.currentSnapshot !== snapshot) {
      this.currentSnapshot = snapshot;
      this.callback?.(snapshot);
      this.host.requestUpdate();
    }
  };

  private startService() {
    this.actorRef = createActor(this.machine, this.options);
    this.subs = this.actorRef?.subscribe(this.onNext);
    this.actorRef?.start();
  }

  private stopService() {
    this.actorRef?.stop();
  }

  hostConnected() {
    this.startService();
  }

  hostDisconnected() {
    this.stopService();
  }
}
