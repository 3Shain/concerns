import { describe, expect, test } from "vitest";
import {
  impl,
  construct,
  constructAsync,
  constructStream,
  constructAsyncStream,
  use,
  addInterceptor,
} from "./index";
import { Await, Subscribe } from "./effects";
import { provide } from "./provide";

declare module "./concerns" {
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
    expect(construct(A0).instance).toBe(0);
  });

  test("2", async () => {
    expect(await constructAsync(A0Async).instance).toBe(0);
  });

  test("3", () => {
    expect([...constructStream(A0Stream).instance]).toStrictEqual([
      4, 3, 2, 1, 0,
    ]);
  });

  test("4", async () => {
    expect(
      await fromAsync(constructAsyncStream(A0AsyncStream).instance)
    ).toStrictEqual([4, 3, 2, 1, 0]);
  });

  test("5. unsolved dependency", async () => {
    // @ts-expect-error
    expect(() => construct(B)).toThrow("Unhandled effects");
  });

  test("6. dependency", async () => {
    expect(construct(provide(B, A0)).instance).toBe(1);
  });

  test("7. async dep", async () => {
    expect(await constructAsync(provide(B, A0Async)).instance).toBe(1);
  });

  test("8. stream deps", async () => {
    expect([...constructStream(provide(B, A0Stream)).instance]).toStrictEqual([
      5, 4, 3, 2, 1,
    ]);
  });

  test("9. stream over stream", async () => {
    expect([
      ...constructStream(provide(BStream, A0Stream)).instance,
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

    const { dispose, instance } = constructAsyncStream(A0Intercepted);
    await fromAsync(instance);
    expect(innerSubscribe).toBeTruthy();
    expect(sideEffect).toBe(1);
    dispose();
    expect(innerSubscribe).toBeFalsy();
    expect(sideEffect).toBe(2);
    rm();

    const { dispose: dispose2 } = construct(A0);

    expect(sideEffect).toBe(2);
    dispose2();
    expect(sideEffect).toBe(2);
  });
});

async function fromAsync<T>(source: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of source) {
    items.push(item);
  }
  return items;
}
