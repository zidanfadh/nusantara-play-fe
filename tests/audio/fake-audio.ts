/**
 * A minimal fake of the Web Audio API for the Phase 21 tests (Node has none): records every source
 * start/stop and every parameter automation, with a settable `currentTime`.
 */

export interface ParamEvent {
  type: string;
  value?: number;
  time: number;
}

export class FakeParam {
  value: number;
  events: ParamEvent[] = [];
  constructor(value = 0) {
    this.value = value;
  }
  setValueAtTime(value: number, time: number) {
    this.events.push({ type: 'set', value, time });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'linear', value, time });
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'exp', value, time });
    return this;
  }
  setTargetAtTime(value: number, time: number) {
    this.events.push({ type: 'target', value, time });
    return this;
  }
  cancelScheduledValues(time: number) {
    this.events.push({ type: 'cancel', time });
    return this;
  }
  cancelAndHoldAtTime(time: number) {
    this.events.push({ type: 'hold', time });
    return this;
  }
}

class FakeNode {
  connections: unknown[] = [];
  connect(target: unknown) {
    this.connections.push(target);
    return target;
  }
  disconnect() {
    this.connections = [];
  }
}

export class FakeBuffer {
  private data: Float32Array[];
  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    if (sampleRate < 3000) throw new Error('NotSupportedError');
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration() {
    return this.length / this.sampleRate;
  }
  getChannelData(i: number) {
    return this.data[i];
  }
  copyToChannel(src: Float32Array, i: number) {
    this.data[i].set(src);
  }
}

export class FakeSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  playbackRate = new FakeParam(1);
  startedAt: number | null = null;
  offset = 0;
  stopAt: number | null = null;
  stopCalls = 0;
  onended: (() => void) | null = null;
  constructor(private ctx: FakeAudioContext) {
    super();
    ctx.sources.push(this);
  }
  start(when = 0, offset = 0) {
    this.startedAt = when;
    this.offset = offset;
  }
  stop(when?: number) {
    this.stopCalls += 1;
    this.stopAt = when ?? this.ctx.currentTime;
  }
}

export class FakeAudioContext {
  currentTime = 0;
  sampleRate: number;
  state: 'running' | 'suspended' | 'closed' = 'running';
  destination = new FakeNode();
  sources: FakeSource[] = [];
  resumeCalls = 0;
  suspendCalls = 0;
  /** When false, resume() never settles (a browser without user activation). */
  resumeAllowed = true;
  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
  }
  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam(1) });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { type: 'lowpass', frequency: new FakeParam(350), Q: new FakeParam(1) });
  }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), {
      threshold: new FakeParam(),
      knee: new FakeParam(),
      ratio: new FakeParam(),
      attack: new FakeParam(),
      release: new FakeParam(),
    });
  }
  createConvolver() {
    return Object.assign(new FakeNode(), { buffer: null as FakeBuffer | null });
  }
  createConstantSource() {
    return Object.assign(new FakeNode(), { offset: new FakeParam(1), start() {}, stop() {} });
  }
  createStereoPanner() {
    return Object.assign(new FakeNode(), { pan: new FakeParam(0) });
  }
  createBufferSource() {
    return new FakeSource(this);
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new FakeBuffer(channels, length, sampleRate);
  }
  resume() {
    this.resumeCalls += 1;
    if (!this.resumeAllowed) return new Promise<void>(() => {});
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.suspendCalls += 1;
    this.state = 'suspended';
    return Promise.resolve();
  }
  /** Sources started at or before `t` and not stopped before it (what is audible at `t`). */
  soundingAt(t: number) {
    return this.sources.filter(
      (s) => s.startedAt !== null && s.startedAt <= t && (s.stopAt === null || s.stopAt > t) && s.startedAt + (s.buffer?.duration ?? 0) > t,
    );
  }
}

/** The fake typed as the real thing for code under test. */
export const asCtx = (fake: FakeAudioContext) => fake as unknown as BaseAudioContext;
