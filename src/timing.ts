export class Timing {
  lastInterval: number;
  lastProgress: number;
  displayValue: string;
  interval: number;
  startTime: number;

  constructor(interval: number) {
    this.startTime = Date.now();
    this.lastInterval = Date.now();
    this.lastProgress = 0;
    this.displayValue = '';
    this.interval = interval;
  }

  private renderTime(millis: number): string {
    const date = new Date(millis);
    const seconds = date.getUTCSeconds().toString(10).padStart(2, '0');
    const minutes = date.getUTCMinutes().toString(10).padStart(2, '0');
    const hours = date.getUTCHours().toString(10);
    return `${hours}h${minutes}m${seconds}s`
  }

  remaining(progress: number): string {
    if (Date.now() - this.lastInterval < this.interval) {
      return this.displayValue;
    }

    if (progress < 0 || progress > 100) {
      this.lastInterval = Date.now();
      this.lastProgress = progress;
      return this.displayValue;
    }

    const percentPerUpdateInterval = progress - this.lastProgress
    const millisPerPercent = this.interval / percentPerUpdateInterval;
    const remainingPercent = 100 - progress;
    this.displayValue = this.renderTime(remainingPercent * millisPerPercent);

    this.lastInterval = Date.now();
    this.lastProgress = progress;
    return this.displayValue;
  }

  get elapsed(): string {
    return this.renderTime(Date.now() - this.startTime);
  }
}
