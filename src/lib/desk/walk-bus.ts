type WalkFn = () => void;
let current: WalkFn | null = null;

export function onWalkRequest(fn: WalkFn) {
  current = fn;
  return () => {
    if (current === fn) current = null;
  };
}

export function requestWalk() {
  current?.();
}
