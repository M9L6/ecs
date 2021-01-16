export class Iterator {
    constructor(next) {
        this._end = false;
        this._cache = [];
        this._next = next;
    }
    each(cb) {
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
            }
            else {
                val = this._cache[idx++];
            }
            if (cb(val) === false) {
                break;
            }
        }
    }
    find(test) {
        let out = undefined;
        this.each((item) => {
            if (test(item)) {
                out = item;
                return false;
            }
        });
        return out;
    }
    filter(test) {
        let out = [];
        this.each((item) => {
            if (test(item)) {
                out.push(item);
            }
        });
        return out;
    }
    map(cb) {
        let out = [];
        this.each((item) => {
            out.push(cb(item));
        });
        return out;
    }
}
