import { Component } from "./component.js";

let SEQ_ENTITY = 1;

export type Subscription = (
  entity: Entity,
  added?: Component<any>,
  removed?: Component<any>
) => void;

export abstract class Entity {
  private _subscriptions: Array<Subscription> = [];

  public get components(): {
    [key: number]: Component<any>[];
  } {
    return this._components;
  }
  private _components: {
    [key: number]: Component<any>[];
  } = {};

  public readonly id: number;

  public active: boolean = true;

  constructor() {
    this.id = SEQ_ENTITY++;
  }

  public subscribe(handler: Subscription): () => Entity {
    this._subscriptions.push(handler);

    return () => {
      const idx = this._subscriptions.indexOf(handler);
      if (idx >= 0) {
        this._subscriptions.splice(idx, 1);
      }
      return this;
    };
  }

  public add(component: Component<any>): void {
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

  public remove(component: Component<any>): void {
    const type = component.type;
    if (!this._components[type]) {
      return;
    }
    const idx = this._components[type].indexOf(component);

    if (idx < 0) return;

    this._components[type].splice(idx, 1);
    if (this._components[type].length < 1) {
      delete this._components[type];
    }
    this._subscriptions.forEach((cb) => {
      cb(this, undefined, component);
    });
  }
}
