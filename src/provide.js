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
