export const MathUtil = {
    TWOPI: Math.PI * 2,
    randomInt(min, max) {
        return Math.floor(min + (max - min) * Math.random());
    },
    randomFloat(min, max) {
        return min + (max - min) * Math.random();
    },
    colortoHex(r, g, b) {
        let result = 0;
        result += r << 0;
        result += g << 8;
        result += b << 16;
        return "#" + result.toString(16);
    },
};
