let now: () => number;

if (performance !== undefined && performance.now !== undefined) {
  now = performance.now.bind(performance);
} else if (Date.now !== undefined) {
  now = Date.now.bind(Date);
} else {
  now = () => {
    return new Date().getTime();
  };
}

export const NOW = now;
