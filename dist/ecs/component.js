let SEQ_COMPONENT = 1;
export class Component {
    constructor(type, data) {
        this._type = 0;
        this.attr = {};
        this._type = type;
        this.data = data;
    }
    static register() {
        class ComponentImpl extends Component {
            constructor(data) {
                super(ComponentImpl._type, data);
            }
            static get type() {
                return this._type;
            }
            static allFrom(entity) {
                let components = entity.components[ComponentImpl._type];
                return components || [];
            }
            static oneFrom(entity) {
                let components = entity.components[ComponentImpl._type];
                if (components && components.length > 0)
                    return components[0];
                return undefined;
            }
        }
        ComponentImpl._type = SEQ_COMPONENT++;
        return ComponentImpl;
    }
    get type() {
        return this._type;
    }
}
