import { Component } from "./component.js";
import { Entity } from "./entity.js";
import { Iterator } from "./iterator.js";
import { NOW } from "./polyfill.js";
import { EventCallback, System } from "./system.js";

export class World {
  public timeScale: number = 1;

  private _lateUpdate: number = NOW();
  private _gameTime: number = 0;

  private _systems: Array<System> = [];
  private _entities: Array<Entity> = [];
  private _entitySystems: { [key: number]: System[] } = {};

  private _entitySystemLastUpdate: {
    [key: number]: { [key: number]: number };
  } = {};
  private _entitySystemLastUpdateGame: {
    [key: number]: { [key: number]: number };
  } = {};

  private _entitySubscription: { [key: number]: () => void } = {};

  private _systemTrigger = (event: string, data: any) => {
    this._systems.forEach((system) => {
      let callbacks: { [key: string]: Array<EventCallback> } = (system as any)
        ._callbacks;
      if (callbacks[event] && callbacks[event].length > 0) {
        this._inject(system);
        let entitiesIterator = this.query((system as any)._componentTypes);
        callbacks[event].forEach((callback) => {
          callback(data, entitiesIterator);
        });
      }
    });
  };

  constructor(systems?: System[]) {
    if (systems) {
      systems.forEach((system) => {
        this.addSystem(system);
      });
    }
  }

  public destroy() {
    this._entities.forEach((entity) => {
      this.removeEntity(entity);
    });

    this._systems.forEach((system) => {
      this.removeSystem(system);
    });
  }

  public getEntity(id: number): Entity | undefined {
    return this._entities.find((entity) => entity.id === id);
  }

  public addEntity(entity: Entity): void {
    if (!entity || this._entities.indexOf(entity) >= 0) {
      return;
    }
    this._entities.push(entity);
    this._entitySystemLastUpdate[entity.id] = {};
    this._entitySystemLastUpdateGame[entity.id] = {};

    if (this._entitySubscription[entity.id]) {
      this._entitySubscription[entity.id]();
    }

    this._entitySubscription[entity.id] = entity.subscribe(
      (entity, added, removed) => {
        this._onEntityUpdate(entity, added, removed);
        this._indexEntity(entity);
      }
    );
    this._indexEntity(entity);
  }

  public removeEntity(entity: number | Entity): void {
    if (typeof entity === "number") {
      entity = this.getEntity(entity) as Entity;
    }
    if (!entity) return;

    const idx = this._entities.indexOf(entity);
    if (idx >= 0) this._entities.splice(idx, 1);

    if (this._entitySubscription[entity.id]) {
      this._entitySubscription[entity.id]();
    }

    let systems = this._entitySystems[entity.id];

    if (systems) {
      systems.forEach((system) => {
        if (system.exit) {
          this._inject(system);
          system.exit(entity as Entity);
        }
      });
    }

    delete this._entitySystems[entity.id];
    delete this._entitySystemLastUpdate[entity.id];
    delete this._entitySystemLastUpdateGame[entity.id];
  }

  public addSystem(system: System): void {
    if (!system) return;
    if (this._systems.indexOf(system) >= 0) return;

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

    if (system.onCreate) system.onCreate();
  }

  public removeSystem(system: System): void {
    if (!system) return;
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
      if ((system as any).world === this) {
        (system as any).world = undefined;
        (system as any).trigger = undefined;
      }
      this._entities.forEach((entity) => {
        this._indexEntity(entity, system);
      });
    }
  }

  public query(componentTypes: number[]): Iterator<Entity> {
    let idx = 0;
    let listAll = componentTypes.indexOf(-1) >= 0;
    return new Iterator<Entity>(() => {
      outside: for (let i = this._entities.length; idx < i; idx++) {
        let entity = this._entities[idx];
        if (listAll) return entity;
        const entityComponentIDs: number[] = [-1].concat(
          Object.keys(entity.components).map((v) => Number.parseInt(v, 10))
        );
        for (let i = 0, j = componentTypes.length; i < j; i++) {
          if (entityComponentIDs.indexOf(componentTypes[i]) < 0) {
            continue outside;
          }
        }
        return entity;
      }
    });
  }

  public update() {
    let now = NOW();
    this._gameTime += (now - this._lateUpdate) * this.timeScale;
    this._lateUpdate = now;

    let toCallAfterUpdateAll: {
      [key: string]: {
        system: System;
        entities: Entity[];
      };
    } = {};

    this._entities.forEach((entity) => {
      if (!entity.active) {
        return this.removeEntity(entity);
      }
      let systems = this._entitySystems[entity.id];
      if (!systems) return;

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
          } else {
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
        system.afterUpdateAll(
          this._gameTime,
          toCallAfterUpdateAll[attr].entities
        );
      }
    }
    toCallAfterUpdateAll = {};
  }

  private _inject(system: System): System {
    (system as any).world = this;
    (system as any).trigger = this._systemTrigger;
    return system;
  }

  private _onEntityUpdate(
    entity: Entity,
    added?: Component<any>,
    removed?: Component<any>
  ): void {
    if (!this._entitySystems[entity.id]) {
      return;
    }

    const toNotify: System[] = this._entitySystems[entity.id].slice(0);

    outside: for (let idx = toNotify.length - 1; idx >= 0; idx--) {
      let system = toNotify[idx];

      if (system.change) {
        let systemComponentTypes = (system as any)._componentTypes;

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
      const systemComponentTypes = (system as any)._componentTypes;
      const all = systemComponentTypes.indexOf(-1) >= 0;
      (system.change as any)(
        entity,
        all
          ? added
          : added && systemComponentTypes.indexOf(added.type) >= 0
          ? added
          : undefined,
        all
          ? removed
          : removed && systemComponentTypes.indexOf(removed.type) >= 0
          ? removed
          : undefined
      );
    });
  }

  private _indexEntitySystem(entity: Entity, system: System): void {
    const idx = this._entitySystems[entity.id].indexOf(system);
    if (this._systems.indexOf(system) < 0) {
      if (idx >= 0) {
        this._entitySystems[entity.id].splice(idx, 1);
        delete this._entitySystemLastUpdate[entity.id][system.id];
        delete this._entitySystemLastUpdateGame[entity.id][system.id];
      }
      return;
    }

    const systemComponentTypes = (system as any)._componentTypes;
    if (systemComponentTypes.length === 0) return;

    for (let i = 0, j = systemComponentTypes.length; i < j; i++) {
      let entityComponentIDs: number[] = [-1].concat(
        Object.keys((entity as any)._components).map((v) =>
          Number.parseInt(v, 10)
        )
      );

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

  private _indexEntity(entity: Entity, system?: System): void {
    if (!this._entitySystems[entity.id]) {
      this._entitySystems[entity.id] = [];
    }
    if (system) {
      this._indexEntitySystem(entity, system);
    } else {
      this._systems.forEach((system) => {
        this._indexEntity(entity, system);
      });
    }
  }
}
