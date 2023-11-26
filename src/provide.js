export function provide(base, provide) {
  return {
    concern: base.concern,
    instantiate: (context) => {
      const processProvide = ([result, next]) => {
        if (result.done === true) {
          return base.instantiate({
            ...context,
            [provide.concern]: result.value,
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
                [provide.concern]: result.value.value,
              })
            );
          } else {
            return [result, (y) => processProvide(next(y))];
          }
        }
      };
      return processProvide(provide.instantiate(context));
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

import { oneshot } from "multishot-generator";
import {
  construct,
  constructAsync,
  constructAsyncStream,
  constructStream,
  impl,
} from "./impl";

export class ImplementationConstructor {
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

export class ModuleConstructor extends ImplementationConstructor {
  constructor() {
    super(__MODULE_IMPL__);
  }
}
