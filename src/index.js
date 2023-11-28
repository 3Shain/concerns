import { oneshot, multishot } from "multishot-generator";

function* use(concern) {
  return yield concern;
}
function* Await(promise) {
  return yield {
    promise,
    toString() {
      return "(await)";
    },
  };
}
function* Yield(value) {
  return yield {
    value,
    toString() {
      return "(yield)";
    },
  };
}
function* Subscribe(subscription) {
  return yield {
    subscription,
    toString() {
      return "(subscribe)";
    },
  };
}
let IMPL_INTERCEPTORS = [];
function addInterceptor(interceptor) {
  IMPL_INTERCEPTORS = [...IMPL_INTERCEPTORS, interceptor];
  return () =>
    (IMPL_INTERCEPTORS = IMPL_INTERCEPTORS.filter((x) => x !== interceptor));
}
function impl(concern) {
  return function (factory) {
    const mg = multishot(() => factory(Yield));
    return {
      concern,
      instantiate(context) {
        let handle = ([result, next]) => {
          if (result.done === true) {
            return [result];
          } else {
            const __name__ = String(result.value);
            if (__name__ in context) {
              return handle(next(context[__name__]));
            } else if (__name__ === "(context)") {
              return handle(next(context));
            } else {
              return [result, interceptor((y) => handle(next(y)))];
            }
          }
        };
        let interceptor = (next) => (f2) => next(f2);
        for (const intc of IMPL_INTERCEPTORS) {
          const currentInterceptor = interceptor;
          interceptor = (next) => currentInterceptor(intc(next));
        }
        return handle(interceptor(() => mg())(void 0));
      },
    };
  };
}
function construct(inst) {
  const toHandle = inst.instantiate({});
  const disposers = [];
  const handle = ([result, next]) => {
    if (result.done === true) {
      return result.value;
    } else {
      if (String(result.value) === "(subscribe)") {
        disposers.push(result.value.subscription());
        return handle(next(void 0));
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
function constructAsync(inst) {
  const toHandle = inst.instantiate({});
  const disposers = [];
  const handle = ([result, next]) => {
    if (disposed) return Promise.reject(new Error("Instance disposed."));
    if (result.done === true) {
      return Promise.resolve(result.value);
    } else {
      if (String(result.value) === "(subscribe)") {
        disposers.push(result.value.subscription());
        return handle(next(void 0));
      } else if (String(result.value) === "(await)") {
        return result.value.promise.then((val) => handle(next(val)));
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
function constructStream(inst) {
  function* w2() {
    let generator = inst.instantiate({});
    while (!disposed) {
      const [result, next] = generator;
      if (result.done === true) {
        yield result.value;
        return;
      } else {
        if (String(result.value) === "(subscribe)") {
          disposers.push(result.value.subscription());
          generator = next(void 0);
        } else if (String(result.value) === "(yield)") {
          generator = next(yield result.value.value);
        } else {
          throw new Error("Unhandled effects");
        }
      }
    }
  }
  const disposers = [];
  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      disposers.forEach((x) => x());
    },
    instance: w2(),
  };
}
function constructAsyncStream(inst) {
  async function* w2() {
    let generator = inst.instantiate({});
    while (true) {
      const [result, next] = generator;
      if (result.done === true) {
        yield result.value;
        return;
      } else {
        if (String(result.value) === "(subscribe)") {
          disposers.push(result.value.subscription());
          generator = next(void 0);
        } else if (String(result.value) === "(yield)") {
          generator = next(yield result.value.value);
        } else if (String(result.value) === "(await)") {
          generator = next(await result.value.promise);
        } else {
          throw new Error("Unhandled effects");
        }
      }
    }
  }
  const disposers = [];
  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      disposers.forEach((x) => x());
    },
    instance: w2(),
  };
}
function provide(base, provide2) {
  return {
    concern: base.concern,
    instantiate: (context) => {
      const processProvide = ([result, next]) => {
        if (result.done === true) {
          return base.instantiate({
            ...context,
            [provide2.concern]: result.value,
          });
        } else {
          if (String(result.value) === "(yield)") {
            const processBase = ([s, n]) => {
              if (s.done === true) {
                return [
                  {
                    done: false,
                    value: {
                      value: s.value,
                      toString() {
                        return "(yield)";
                      },
                    },
                  },
                  (y) => processProvide(next(y)),
                ];
              } else {
                return [s, (y) => processBase(n(y))];
              }
            };
            return processBase(
              base.instantiate({
                ...context,
                [provide2.concern]: result.value.value,
              })
            );
          } else {
            return [result, (y) => processProvide(next(y))];
          }
        }
      };
      return processProvide(provide2.instantiate(context));
    },
  };
}
function provideRegistry(base, registry) {
  return {
    concern: base.concern,
    instantiate: (context) => {
      return base.instantiate({
        ...context,
        ...registry.context,
      });
    },
  };
}
class ImplementationConstructor {
  constructor(base) {
    this.base = base;
  }
  provide(provided) {
    return new ImplementationConstructor(provide(this.base, provided));
  }
  provideRegistry(registry) {
    return new ImplementationConstructor(provideRegistry(this.base, registry));
  }
  provideConstant(concern, value) {
    return new ImplementationConstructor(
      provide(
        this.base,
        impl(concern)(function* () {
          return value;
        })
      )
    );
  }
  provideDynamic(concern, factory) {
    return new ImplementationConstructor(
      provide(
        this.base,
        impl(concern)(function* () {
          const realImpl = yield* factory();
          const context = yield "(context)";
          return yield* oneshot(realImpl.instantiate(context));
        })
      )
    );
  }
  construct() {
    return construct(this.base);
  }
  constructAsync() {
    return constructAsync(this.base);
  }
  constructStream() {
    return constructStream(this.base);
  }
  constructAsyncStream() {
    return constructAsyncStream(this.base);
  }
}
const __MODULE_IMPL__ = impl("__module__")(function* () {
  const context = yield "(context)";
  return {
    context,
    get: (__name__) => {
      if (__name__ in context) return context[__name__];
      throw new Error(`Can't find concern name: ${__name__}`);
    },
  };
});
class ModuleConstructor extends ImplementationConstructor {
  constructor() {
    super(__MODULE_IMPL__);
  }
}
const implementLogger = impl("logger");
export {
  Await,
  ImplementationConstructor,
  ModuleConstructor,
  Subscribe,
  addInterceptor,
  impl,
  implementLogger,
  use,
};
