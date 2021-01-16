import { Component } from "./component.js";
import { Entity } from "./entity.js";
import { World } from "./world.js";
import { Iterator } from "./iterator.js";
let SEQ_SYSTEM = 1;

export type EventCallback = (data: any, entities: Iterator<Entity>) => void;

export abstract class System {
  private readonly _componentTypes: number[] = [];
  private readonly _callbacks: { [key: string]: Array<EventCallback> } = {};

  public readonly id: number;

  public frequence: number;

  protected world: World = undefined as any;

  protected trigger: (event: string, data: any) => void = undefined as any;

  public onCreate?(): void;

  public beforeUpdateAll?(time: number): void;

  public update?(time: number, delta: number, entity: Entity): void;

  public afterUpdateAll?(time: number, entities: Entity[]): void;

  public change?(
    entity: Entity,
    added?: Component<any>,
    removed?: Component<any>
  ): void;

  public enter?(entity: Entity): void;

  public exit?(entity: Entity): void;

  constructor(componentTypes: number[], frequence: number = 0) {
    this.id = SEQ_SYSTEM++;
    this._componentTypes = componentTypes;
    this.frequence = frequence;
  }

  protected query(compoentTypes: number[]): Iterator<Entity> {
    return this.world.query(compoentTypes);
  }

  protected listenTo(
    event: string,
    callback: EventCallback,
    once: boolean = false
  ): void {
    if (!this._callbacks[event]) {
      this._callbacks[event] = [];
    }

    if (once) {
      let tmp = callback.bind(this);
      callback = (data: any, entities: Iterator<Entity>) => {
        tmp(data, entities);

        let idx = this._callbacks[event].indexOf(callback);

        if (idx >= 0) this._callbacks[event].splice(idx, 1);
        if (this._callbacks[event].length === 0) delete this._callbacks[event];
      };
    }
    this._callbacks[event].push(callback);
  }
}
