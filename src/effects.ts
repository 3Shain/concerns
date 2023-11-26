import { DetailOf } from "./concerns";

export function* Await<T>(promise: Promise<T>): DetailOf<T, "(await)"> {
  return yield {
    promise,
    toString() {
      return "(await)";
    },
  } as unknown as "(await)";
}

export function* Yield<T>(value: T): DetailOf<void, "(yield)"> {
  return yield {
    value,
    toString() {
      return "(yield)";
    },
  } as unknown as "(yield)";
}

export type Subscription = ()=>()=>void;

export function* Subscribe(subscription: Subscription): DetailOf<void, "(subscribe)"> {
  return yield {
    subscription,
    toString() {
      return "(subscribe)";
    },
  } as unknown as "(subscribe)";
}

export type BuiltinEffects = "(await)" | "(yield)" | "(subscribe)";