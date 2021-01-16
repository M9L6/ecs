import { Iterator } from "./iterator.js";
import { NOW } from "./polyfill.js";
export class World {
    constructor(systems) {
        this.timeScale = 1;
        this._lateUpdate = NOW();
        this._gameTime = 0;
        this._systems = [];
        this._entities = [];
        this._entitySystems = {};
        this._entitySystemLastUpdate = {};
        this._entitySystemLastUpdateGame = {};
        this._entitySubscription = {};
        this._systemTrigger = (event, data) => {
            this._systems.forEach((system) => {
                let callbacks = system
                    ._callbacks;
                if (callbacks[event] && callbacks[event].length > 0) {
                    this._inject(system);
                    let entitiesIterator = this.query(system._componentTypes);
                    callbacks[event].forEach((callback) => {
                        callback(data, entitiesIterator);
                    });
                }
            });
        };
        if (systems) {
            systems.forEach((system) => {
                this.addSystem(system);
            });
        }
    }
    destroy() {
        this._entities.forEach((entity) => {
            this.removeEntity(entity);
        });
        this._systems.forEach((system) => {
            this.removeSystem(system);
        });
    }
    getEntity(id) {
        return this._entities.find((entity) => entity.id === id);
    }
    addEntity(entity) {
        if (!entity || this._entities.indexOf(entity) >= 0) {
            return;
        }
        this._entities.push(entity);
        this._entitySystemLastUpdate[entity.id] = {};
        this._entitySystemLastUpdateGame[entity.id] = {};
        if (this._entitySubscription[entity.id]) {
            this._entitySubscription[entity.id]();
        }
        this._entitySubscription[entity.id] = entity.subscribe((entity, added, removed) => {
            this._onEntityUpdate(entity, added, removed);
            this._indexEntity(entity);
        });
        this._indexEntity(entity);
    }
    removeEntity(entity) {
        if (typeof entity === "number") {
            entity = this.getEntity(entity);
        }
        if (!entity)
            return;
        const idx = this._entities.indexOf(entity);
        if (idx >= 0)
            this._entities.splice(idx, 1);
        if (this._entitySubscription[entity.id]) {
            this._entitySubscription[entity.id]();
        }
        let systems = this._entitySystems[entity.id];
        if (systems) {
            systems.forEach((system) => {
                if (system.exit) {
                    this._inject(system);
                    system.exit(entity);
                }
            });
        }
        delete this._entitySystems[entity.id];
        delete this._entitySystemLastUpdate[entity.id];
        delete this._entitySystemLastUpdateGame[entity.id];
    }
    addSystem(system) {
        if (!system)
            return;
        if (this._systems.indexOf(system) >= 0)
            return;
        this._systems.push(system);
        this._entities.forEach((entity) => {
            this._indexEntity(entity, system);
        });
        this._entities.forEach((entity) => {
            if (entity.active) {
                let systems = this._entitySystems[entity.id];
                if (systems && systems.indexOf(system) >= 0) {
                    if (system.enter) {
                        this._inject(system);
                        system.enter(entity);
                    }
                }
            }
        });
        if (system.onCreate)
            system.onCreate();
    }
    removeSystem(system) {
        if (!system)
            return;
        const idx = this._systems.indexOf(system);
        if (idx >= 0) {
            this._entities.forEach((entity) => {
                if (entity.active) {
                    let systems = this._entitySystems[entity.id];
                    if (systems && systems.indexOf(system) >= 0) {
                        if (system.exit) {
                            this._inject(system);
                            system.exit(entity);
                        }
                    }
                }
            });
            this._systems.splice(idx, 1);
            if (system.world === this) {
                system.world = undefined;
                system.trigger = undefined;
            }
            this._entities.forEach((entity) => {
                this._indexEntity(entity, system);
            });
        }
    }
    query(componentTypes) {
        let idx = 0;
        let listAll = componentTypes.indexOf(-1) >= 0;
        return new Iterator(() => {
            outside: for (let i = this._entities.length; idx < i; idx++) {
                let entity = this._entities[idx];
                if (listAll)
                    return entity;
                const entityComponentIDs = [-1].concat(Object.keys(entity.components).map((v) => Number.parseInt(v, 10)));
                for (let i = 0, j = componentTypes.length; i < j; i++) {
                    if (entityComponentIDs.indexOf(componentTypes[i]) < 0) {
                        continue outside;
                    }
                }
                return entity;
            }
        });
    }
    update() {
        let now = NOW();
        this._gameTime += (now - this._lateUpdate) * this.timeScale;
        this._lateUpdate = now;
        let toCallAfterUpdateAll = {};
        this._entities.forEach((entity) => {
            if (!entity.active) {
                return this.removeEntity(entity);
            }
            let systems = this._entitySystems[entity.id];
            if (!systems)
                return;
            const entityLastUpdates = this._entitySystemLastUpdate[entity.id];
            const entityLastUpdatesGame = this._entitySystemLastUpdateGame[entity.id];
            let elapsed, elapsedScaled, interval;
            systems.forEach((system) => {
                if (system.update) {
                    this._inject(system);
                    elapsed = now - entityLastUpdates[system.id];
                    elapsedScaled =
                        (this._gameTime - entityLastUpdatesGame[system.id]) / 1000;
                    if (system.frequence > 0) {
                        interval = 1000 / system.frequence;
                        if (elapsed < interval) {
                            return;
                        }
                        entityLastUpdates[system.id] = now - (elapsed % interval);
                        entityLastUpdatesGame[system.id] = this._gameTime;
                    }
                    else {
                        entityLastUpdates[system.id] = now;
                        entityLastUpdatesGame[system.id] = this._gameTime;
                    }
                    let id = "_" + system.id;
                    if (!toCallAfterUpdateAll[id]) {
                        if (system.beforeUpdateAll) {
                            system.beforeUpdateAll(this._gameTime);
                        }
                        toCallAfterUpdateAll[id] = { system: system, entities: [] };
                    }
                    toCallAfterUpdateAll[id].entities.push(entity);
                    system.update(this._gameTime, elapsedScaled, entity);
                }
            });
        });
        for (let attr in toCallAfterUpdateAll) {
            if (!toCallAfterUpdateAll[attr]) {
                continue;
            }
            let system = toCallAfterUpdateAll[attr].system;
            if (system.afterUpdateAll) {
                this._inject(system);
                system.afterUpdateAll(this._gameTime, toCallAfterUpdateAll[attr].entities);
            }
        }
        toCallAfterUpdateAll = {};
    }
    _inject(system) {
        system.world = this;
        system.trigger = this._systemTrigger;
        return system;
    }
    _onEntityUpdate(entity, added, removed) {
        if (!this._entitySystems[entity.id]) {
            return;
        }
        const toNotify = this._entitySystems[entity.id].slice(0);
        outside: for (let idx = toNotify.length - 1; idx >= 0; idx--) {
            let system = toNotify[idx];
            if (system.change) {
                let systemComponentTypes = system._componentTypes;
                if (systemComponentTypes.indexOf(-1) >= 0) {
                    continue;
                }
                if (added && systemComponentTypes.indexOf(added.type) >= 0) {
                    continue outside;
                }
                if (removed && systemComponentTypes.indexOf(removed.type) >= 0) {
                    continue outside;
                }
            }
            toNotify.splice(idx, 1);
        }
        toNotify.forEach((system) => {
            system = this._inject(system);
            const systemComponentTypes = system._componentTypes;
            const all = systemComponentTypes.indexOf(-1) >= 0;
            system.change(entity, all
                ? added
                : added && systemComponentTypes.indexOf(added.type) >= 0
                    ? added
                    : undefined, all
                ? removed
                : removed && systemComponentTypes.indexOf(removed.type) >= 0
                    ? removed
                    : undefined);
        });
    }
    _indexEntitySystem(entity, system) {
        const idx = this._entitySystems[entity.id].indexOf(system);
        if (this._systems.indexOf(system) < 0) {
            if (idx >= 0) {
                this._entitySystems[entity.id].splice(idx, 1);
                delete this._entitySystemLastUpdate[entity.id][system.id];
                delete this._entitySystemLastUpdateGame[entity.id][system.id];
            }
            return;
        }
        const systemComponentTypes = system._componentTypes;
        if (systemComponentTypes.length === 0)
            return;
        for (let i = 0, j = systemComponentTypes.length; i < j; i++) {
            let entityComponentIDs = [-1].concat(Object.keys(entity._components).map((v) => Number.parseInt(v, 10)));
            if (entityComponentIDs.indexOf(systemComponentTypes[i]) < 0) {
                if (idx >= 0) {
                    if (system.exit) {
                        this._inject(system);
                        system.exit(entity);
                    }
                    this._entitySystems[entity.id].splice(idx, 1);
                    delete this._entitySystemLastUpdate[entity.id][system.id];
                    delete this._entitySystemLastUpdateGame[entity.id][system.id];
                }
                return;
            }
        }
        if (idx < 0) {
            this._entitySystems[entity.id].push(system);
            this._entitySystemLastUpdate[entity.id][system.id] = NOW();
            this._entitySystemLastUpdateGame[entity.id][system.id] = this._gameTime;
            if (system.enter) {
                this._inject(system);
                system.enter(entity);
            }
        }
    }
    _indexEntity(entity, system) {
        if (!this._entitySystems[entity.id]) {
            this._entitySystems[entity.id] = [];
        }
        if (system) {
            this._indexEntitySystem(entity, system);
        }
        else {
            this._systems.forEach((system) => {
                this._indexEntity(entity, system);
            });
        }
    }
}
