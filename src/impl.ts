import type { AllConcerns, DetailOf, Concerns } from "./concerns";
import { Yield, type BuiltinEffects, Subscription } from "./effects";
import { multishot, type MultishotGenerator } from "multishot-generator";

export type Implementation<
  TConcern extends AllConcerns,
  TDeps extends AllConcerns | BuiltinEffects
> = {
  concern: TConcern;
  instantiate: (context: {
    [key in Exclude<TDeps, BuiltinEffects>]: Concerns[key];
  }) => MultishotGenerator<TDeps, Concerns[TConcern], any>;
};

let IMPL_INTERCEPTORS: any[] = [];

export function addInterceptor<A, B, C>(
  interceptor: (
    normal: (value: C) => MultishotGenerator<A, B, C>
  ) => (value: C) => MultishotGenerator<A, B, C>
) {
  IMPL_INTERCEPTORS = [...IMPL_INTERCEPTORS, interceptor];
  return () =>
    (IMPL_INTERCEPTORS = IMPL_INTERCEPTORS.filter((x) => x !== interceptor));
}

export function impl<TConcern extends AllConcerns>(
  concern: TConcern
): <TDeps extends AllConcerns | BuiltinEffects>(
  factory: (
    _: typeof Yield<Concerns[TConcern]>
  ) => DetailOf<Concerns[TConcern], TDeps>
) => Implementation<TConcern, TDeps> {
  return function (factory) {
    const mg = multishot(() => factory(Yield));
    type G = ReturnType<typeof mg>;
    return {
      concern,
      instantiate(context) {
        let handle = ([result, next]: G): G => {
          if (result.done === true) {
            return [result];
          } else {
            // next = int(next);
            const __name__ = String(result.value);
            if (__name__ in context) {
              // @ts-expect-error
              return handle(next!(context[__name__]));
            } else if (__name__ === "(context)") {
              return handle(next!(context));
            } else {
              return [result, interceptor((y: any) => handle(next!(y)))];
            }
          }
        };
        let interceptor = (next: any) => (f: any) => next(f); // identity
        // insert some interceptor
        for (const intc of IMPL_INTERCEPTORS) {
          const currentInterceptor = interceptor;
          interceptor = (next) => currentInterceptor(intc(next));
        }
        return handle(interceptor(() => mg())(undefined));
      },
    };
  };
}

export interface Instance<T> {
  instance: T;
  dispose: () => void;
}

export function construct<TConcern extends AllConcerns>(
  inst: Implementation<TConcern, "(subscribe)">
): Instance<Concerns[TConcern]> {
  const toHandle = inst.instantiate({});
  const disposers: (() => void)[] = [];
  const handle = ([result, next]: typeof toHandle): Concerns[TConcern] => {
    if (result.done === true) {
      return result.value;
    } else {
      if (String(result.value) === "(subscribe)") {
        disposers.push(
          (
            result.value as unknown as { subscription: Subscription }
          ).subscription()
        );
        return handle(next!(undefined));
      } else {
        throw new Error(
          "Unhandled effects or dependencies: " + String(result.value)
        );
      }
    }
  };
  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      disposers.forEach((x) => x());
    },
    instance: handle(toHandle),
  };
}

export function constructAsync<TConcern extends AllConcerns>(
  inst: Implementation<TConcern, "(await)" | "(subscribe)">
): Instance<Promise<Concerns[TConcern]>> {
  const toHandle = inst.instantiate({});
  const disposers: (() => void)[] = [];

  const handle = ([result, next]: typeof toHandle): Promise<
    Concerns[TConcern]
  > => {
    if (disposed) return Promise.reject(new Error("Instance disposed."));
    if (result.done === true) {
      return Promise.resolve(result.value);
    } else {
      if (String(result.value) === "(subscribe)") {
        disposers.push(
          (
            result.value as unknown as { subscription: Subscription }
          ).subscription()
        );
        return handle(next!(undefined));
      } else if (String(result.value) === "(await)") {
        return (
          result.value as unknown as { promise: Promise<any> }
        ).promise.then((val) => handle(next!(val)));
      } else {
        return Promise.reject(new Error("Unhandled effects"));
      }
    }
  };

  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      disposers.forEach((x) => x());
    },
    instance: handle(toHandle),
  };
}

export function constructStream<TConcern extends AllConcerns>(
  inst: Implementation<TConcern, "(yield)" | "(subscribe)">
): Instance<Generator<Concerns[TConcern], void>> {
  function* w(): Generator<Concerns[TConcern], void> {
    let generator = inst.instantiate({});
    while (!disposed) {
      const [result, next] = generator;
      if (result.done === true) {
        yield result.value;
        return;
      } else {
        if (String(result.value) === "(subscribe)") {
          disposers.push(
            (
              result.value as unknown as { subscription: Subscription }
            ).subscription()
          );
          generator = next!(undefined);
        } else if (String(result.value) === "(yield)") {
          generator = next!(
            yield (result.value as unknown as { value: Concerns[TConcern] })
              .value
          );
        } else {
          throw new Error("Unhandled effects");
        }
      }
    }
  }
  const disposers: (() => void)[] = [];
  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      disposers.forEach((x) => x());
    },
    instance: w(),
  };
}

export function constructAsyncStream<TConcern extends AllConcerns>(
  inst: Implementation<TConcern, "(await)" | "(yield)" | "(subscribe)">
): Instance<AsyncGenerator<Concerns[TConcern], void>> {
  async function* w(): AsyncGenerator<Concerns[TConcern], void> {
    let generator = inst.instantiate({});
    while (true) {
      const [result, next] = generator;
      if (result.done === true) {
        yield result.value;
        return;
      } else {
        if (String(result.value) === "(subscribe)") {
          disposers.push(
            (
              result.value as unknown as { subscription: Subscription }
            ).subscription()
          );
          generator = next!(undefined);
        } else if (String(result.value) === "(yield)") {
          generator = next!(
            yield (result.value as unknown as { value: Concerns[TConcern] })
              .value
          );
        } else if (String(result.value) === "(await)") {
          generator = next!(
            await (result.value as unknown as { promise: Promise<any> }).promise
          );
        } else {
          throw new Error("Unhandled effects");
        }
      }
    }
  }
  const disposers: (() => void)[] = [];
  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      disposers.forEach((x) => x());
    },
    instance: w(),
  };
}
