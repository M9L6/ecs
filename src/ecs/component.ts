import { Entity } from "./entity.js";

let SEQ_COMPONENT = 1;

export type ComponentClassType<T> = (new (data: T) => Component<T>) & {
  readonly type: number;
  allFrom(entity: Entity): Component<T>[];
  oneFrom(entity: Entity): Component<T> | undefined;
};

export abstract class Component<T> {
  public static register<T1>() {
    class ComponentImpl extends Component<T1> {
      public static get type() {
        return this._type;
      }
      private static _type: number = SEQ_COMPONENT++;

      public static allFrom(entity: Entity): ComponentImpl[] {
        let components: ComponentImpl[] = (entity as any).components[
          ComponentImpl._type
        ];
        return components || [];
      }

      public static oneFrom(entity: Entity): ComponentImpl | undefined {
        let components: ComponentImpl[] = (entity as any).components[
          ComponentImpl._type
        ];
        if (components && components.length > 0) return components[0];
        return undefined;
      }

      constructor(data: T1) {
        super(ComponentImpl._type, data);
      }
    }
    return ComponentImpl as ComponentClassType<T1>;
  }

  public data: T;
  public get type(): number {
    return this._type;
  }
  private _type: number = 0;

  public attr: {
    [key: string]: any;
  } = {};

  constructor(type: number, data: T) {
    this._type = type;
    this.data = data;
  }
}
