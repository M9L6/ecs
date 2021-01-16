import { float, int } from "./typeDefine.js";

export const MathUtil = {
  TWOPI: Math.PI * 2,
  randomInt(min: int, max: int): int {
    return Math.floor(min + (max - min) * Math.random());
  },
  randomFloat(min: float, max: float): float {
    return min + (max - min) * Math.random();
  },
  colortoHex(r: int, g: int, b: int): string {
    let result = 0;
    result += r << 0;
    result += g << 8;
    result += b << 16;
    return "#" + result.toString(16);
  },
};
