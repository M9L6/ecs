import { Component } from "../../ecs/component.js";
import { Entity } from "../../ecs/entity.js";
import { System } from "../../ecs/system.js";
import { World } from "../../ecs/world.js";
import { MathUtil } from "../utils/Utils.js";
const RectComponent = Component.register();
const TranslationComponent = Component.register();
const RotationComponent = Component.register();
const ScaleComponent = Component.register();
const ColorComponent = Component.register();
const RotateSpeedComponent = Component.register();
const MoveSpeedComponent = Component.register();
class RectEntity extends Entity {
    constructor(rect, postion, rotation, scale, color) {
        super();
        this.add(new RectComponent(rect));
        this.add(new TranslationComponent(postion));
        this.add(new RotationComponent(rotation));
        this.add(new ScaleComponent(scale));
        this.add(new ColorComponent(color));
    }
}
class DynamicRectEntity extends RectEntity {
    constructor(rect, postion, rotation, scale, color, rotateSpeed, moveSpeed) {
        super(rect, postion, rotation, scale, color);
        this.add(new RotateSpeedComponent(rotateSpeed));
        this.add(new MoveSpeedComponent(moveSpeed));
    }
}
class SpawnerSystem extends System {
    constructor(count = 100) {
        super([]);
        this.count = count;
    }
    onCreate() {
        for (let i = 0; i < this.count; i++) {
            const rect = {
                x: MathUtil.randomInt(0, 100),
                y: MathUtil.randomInt(0, 100),
                width: MathUtil.randomInt(10, 50),
                height: MathUtil.randomInt(10, 50),
            };
            const pos = {
                x: MathUtil.randomInt(0, 500),
                y: MathUtil.randomInt(0, 500),
            };
            const scale = {
                x: MathUtil.randomFloat(0.1, 1),
                y: MathUtil.randomFloat(0.1, 1),
            };
            const rotation = {
                angle: MathUtil.randomFloat(0, MathUtil.TWOPI),
            };
            const color = {
                val: MathUtil.colortoHex(MathUtil.randomInt(0, 256), MathUtil.randomInt(0, 256), MathUtil.randomInt(0, 256)),
            };
            const entity = Math.random() > 0.5
                ? new RectEntity(rect, pos, rotation, scale, color)
                : new DynamicRectEntity(rect, pos, rotation, scale, color, {
                    speed: MathUtil.randomFloat(-MathUtil.TWOPI, MathUtil.TWOPI),
                }, {
                    xSpeed: MathUtil.randomFloat(-100, 100),
                    ySpeed: MathUtil.randomFloat(-100, 100),
                });
            world.addEntity(entity);
        }
        world.removeSystem(this);
    }
}
class TransformSystem extends System {
    constructor() {
        super([
            TranslationComponent.type,
            RotationComponent.type,
            MoveSpeedComponent.type,
            RotateSpeedComponent.type,
        ]);
    }
    update(time, delta, entity) {
        const pos = entity.components[TranslationComponent.type][0], rotation = entity.components[RotationComponent.type][0], moveSpeed = entity.components[MoveSpeedComponent.type][0], rotateSpeed = entity.components[RotateSpeedComponent.type][0];
        pos.data.x += moveSpeed.data.xSpeed * delta;
        pos.data.y += moveSpeed.data.ySpeed * delta;
        pos.data.x %= 600;
        pos.data.y %= 600;
        rotation.data.angle += rotateSpeed.data.speed * delta;
        rotation.data.angle %= MathUtil.TWOPI;
    }
}
class RenderSystem extends System {
    constructor(ctx) {
        super([
            RectComponent.type,
            TranslationComponent.type,
            RotationComponent.type,
            ScaleComponent.type,
            ColorComponent.type,
        ]);
        this._ctx = ctx;
    }
    beforeUpdateAll(time) {
        const ctx = this._ctx;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    update(time, delta, entity) {
        const rect = entity.components[RectComponent.type][0], pos = entity.components[TranslationComponent.type][0], rotation = entity.components[RotationComponent.type][0], scale = entity.components[ScaleComponent.type][0], color = entity.components[ColorComponent.type][0];
        const ctx = this._ctx;
        ctx.save();
        ctx.fillStyle = color.data.val;
        ctx.translate(pos.data.x, pos.data.y);
        ctx.rotate(rotation.data.angle);
        ctx.scale(scale.data.x, scale.data.y);
        ctx.fillRect(rect.data.x - rect.data.width / 2, rect.data.y - rect.data.height / 2, rect.data.width, rect.data.height);
        ctx.restore();
    }
}
const world = new World();
world.addSystem(new SpawnerSystem(10000));
function init() {
    world.addSystem(new TransformSystem());
    const canvas = document.getElementById("app");
    const ctx = canvas.getContext("2d");
    world.addSystem(new RenderSystem(ctx));
    update();
}
function update() {
    world.update();
    requestAnimationFrame(update);
}
window.onload = init;
