import { describe, expect, test } from "vitest";
import {
  impl,
  use,
  addInterceptor,
  Await,
  Subscribe,
  EmptyModule,
} from "./index";

declare module "./index" {
  interface Concerns {
    a: number;
    b: number;
    c: number;
  }
}

const impla = impl("a");
const implb = impl("b");
const implc = impl("c");

const A0 = impla(function* () {
  return 0;
});

const A0Async = impla(function* () {
  yield* Await(Promise.resolve());
  return 0;
});

const A0Stream = impla(function* (Yield) {
  yield* Yield(4);
  yield* Yield(3);
  yield* Yield(2);
  yield* Yield(1);
  return 0;
});

const A0AsyncStream = impla(function* (Yield) {
  yield* Yield(4);
  yield* Yield(3);
  yield* Await(Promise.resolve());
  yield* Yield(2);
  yield* Yield(1);
  return 0;
});

const B = implb(function* () {
  const a = yield* use("a");
  return a + 1;
});

const BStream = implb(function* (Yield) {
  const a = yield* use("a");
  yield* Yield(a + 2);
  return a + 1;
});

describe("concerns", () => {
  test("1", () => {
    expect(A0.construct().instance).toBe(0);
  });

  test("2", async () => {
    expect(await A0Async.constructAsync().instance).toBe(0);
  });

  test("3", () => {
    expect([...A0Stream.constructStream().instance]).toStrictEqual([
      4, 3, 2, 1, 0,
    ]);
  });

  test("4", async () => {
    expect(
      await fromAsync(A0AsyncStream.constructAsyncStream().instance)
    ).toStrictEqual([4, 3, 2, 1, 0]);
  });

  test("5. unsolved dependency", async () => {
    expect(() => B.construct()).toThrow("Unhandled effects");
  });

  test("6.1. dependency by constructor", async () => {
    expect(B.provide(A0).construct().instance).toBe(1);
  });

  test("7. async dep by constructor", async () => {
    expect(await B.provide(A0Async).constructAsync().instance).toBe(1);
  });

  test("8. stream deps by constructor", async () => {
    expect([...B.provide(A0Stream).constructStream().instance]).toStrictEqual([
      5, 4, 3, 2, 1,
    ]);
  });

  test("9. stream over stream", async () => {
    expect([
      ...BStream.provide(A0Stream).constructStream().instance,
    ]).toStrictEqual([
      6,
      5, //
      5,
      4, //
      4,
      3, //
      3,
      2, //
      2,
      1, //
    ]);
  });

  test("10. interceptor", async () => {
    let innerSubscribe = false;
    const A0Intercepted = impla(function* (Yield) {
      expect(intercepted).toBeTruthy();
      yield* Yield(4);
      expect(intercepted).toBeTruthy();
      yield* Yield(3);
      expect(intercepted).toBeTruthy();
      yield* Await(Promise.resolve());
      expect(intercepted).toBeTruthy();
      yield* Yield(2);
      expect(intercepted).toBeTruthy();
      yield* Subscribe(() => {
        innerSubscribe = true;
        return () => {
          innerSubscribe = false;
        };
      });
      expect(intercepted).toBeTruthy();
      return 0;
    });
    let sideEffect = 0;
    let intercepted = false;
    const rm = addInterceptor((fn) => (v) => {
      let x: any = null;
      return [
        {
          done: false,
          value: {
            subscription: () => {
              sideEffect = 1;
              if (intercepted) throw new Error("?");
              intercepted = true;
              x = fn!(v);
              intercepted = false;
              expect(x).toBeTruthy();
              return () => {
                sideEffect = 2;
              };
            },
            toString() {
              return "(subscribe)";
            },
          },
        },
        () => {
          expect(x).toBeTruthy();
          return x;
        },
      ];
      // return fn!(v);
    });

    // addInterceptor(fn=>v=>fn(v)); // chain interceptor

    expect(sideEffect).toBe(0);

    const { dispose, instance } = A0Intercepted.constructAsyncStream();
    await fromAsync(instance);
    expect(innerSubscribe).toBeTruthy();
    expect(sideEffect).toBe(1);
    dispose();
    expect(innerSubscribe).toBeFalsy();
    expect(sideEffect).toBe(2);
    rm();

    const { dispose: dispose2 } = A0.construct();

    expect(sideEffect).toBe(2);
    dispose2();
    expect(sideEffect).toBe(2);
  });

  test("11. module", async () => {
    const registry = await EmptyModule.provide(B)
      .provide(A0Async)
      .constructAsync().instance;

    expect(registry.get("b")).toBe(1);
    expect(registry.get("a")).toBe(0);
  });

  test("7. provideDybamic & provideConstant", async () => {
    expect(
      await fromAsync(
        B.provideDynamic("a", function* () {
          const c = yield* use("c");
          if (c > 0) {
            return A0Async;
          } else {
            return A0Stream;
          }
        })
          .provideConstant("c", 1)
          .constructAsyncStream().instance
      )
    ).toStrictEqual([1]);

    expect(
      await fromAsync(
        B.provideDynamic("a", function* () {
          const c = yield* use("c");
          if (c > 0) {
            return A0Async;
          } else {
            return A0Stream;
          }
        })
          .provideConstant("c", -1)
          .constructAsyncStream().instance
      )
    ).toStrictEqual([5, 4, 3, 2, 1]);
  });
});

async function fromAsync<T>(source: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of source) {
    items.push(item);
  }
  return items;
}
