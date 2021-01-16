export class Iterator<T> {
  private _end = false;
  private _cache: T[] = [];
  private _next: (i: number) => T | void;

  constructor(next: (i: number) => T | void) {
    this._next = next;
  }

  public each(cb: (item: T) => boolean | void): void {
    let idx = 0;
    while (true) {
      let val;
      if (this._cache.length <= idx) {
        if (this._end) {
          break;
        }
        val = this._next(idx++);
        if (val === undefined) {
          this._end = true;
          break;
        }
        this._cache.push(val);
      } else {
        val = this._cache[idx++];
      }

      if (cb(val) === false) {
        break;
      }
    }
  }

  public find(test: (item: T) => boolean): T | undefined {
    let out: T | undefined = undefined;
    this.each((item) => {
      if (test(item)) {
        out = item;
        return false;
      }
    });
    return out;
  }

  public filter(test: (item: T) => boolean): T[] {
    let out: T[] = [];
    this.each((item) => {
      if (test(item)) {
        out.push(item);
      }
    });
    return out;
  }

  public map<P>(cb: (item: T) => P): P[] {
    let out: P[] = [];
    this.each((item) => {
      out.push(cb(item));
    });
    return out;
  }
}
