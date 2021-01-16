let SEQ_SYSTEM = 1;
export class System {
    constructor(componentTypes, frequence = 0) {
        this._componentTypes = [];
        this._callbacks = {};
        this.world = undefined;
        this.trigger = undefined;
        this.id = SEQ_SYSTEM++;
        this._componentTypes = componentTypes;
        this.frequence = frequence;
    }
    query(compoentTypes) {
        return this.world.query(compoentTypes);
    }
    listenTo(event, callback, once = false) {
        if (!this._callbacks[event]) {
            this._callbacks[event] = [];
        }
        if (once) {
            let tmp = callback.bind(this);
            callback = (data, entities) => {
                tmp(data, entities);
                let idx = this._callbacks[event].indexOf(callback);
                if (idx >= 0)
                    this._callbacks[event].splice(idx, 1);
                if (this._callbacks[event].length === 0)
                    delete this._callbacks[event];
            };
        }
        this._callbacks[event].push(callback);
    }
}
