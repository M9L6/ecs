let SEQ_ENTITY = 1;
export class Entity {
    constructor() {
        this._subscriptions = [];
        this._components = {};
        this.active = true;
        this.id = SEQ_ENTITY++;
    }
    get components() {
        return this._components;
    }
    subscribe(handler) {
        this._subscriptions.push(handler);
        return () => {
            const idx = this._subscriptions.indexOf(handler);
            if (idx >= 0) {
                this._subscriptions.splice(idx, 1);
            }
            return this;
        };
    }
    add(component) {
        const type = component.type;
        if (!this._components[type]) {
            this._components[type] = [];
        }
        if (this._components[type].indexOf(component) >= 0) {
            return;
        }
        this._components[type].push(component);
        this._subscriptions.forEach((cb) => {
            cb(this, component, undefined);
        });
    }
    remove(component) {
        const type = component.type;
        if (!this._components[type]) {
            return;
        }
        const idx = this._components[type].indexOf(component);
        if (idx < 0)
            return;
        this._components[type].splice(idx, 1);
        if (this._components[type].length < 1) {
            delete this._components[type];
        }
        this._subscriptions.forEach((cb) => {
            cb(this, undefined, component);
        });
    }
}
