import type { MultishotGenerator } from "multishot-generator";

interface Concerns {
  __module__: {
    get: (concern: keyof Concerns) => Concerns[typeof concern];
  };
}
type DetailOf<T, TDeps> = Generator<TDeps, T, any>;
type AllConcerns = keyof Concerns;
declare function use<TConcern extends AllConcerns>(
  concern: TConcern
): DetailOf<Concerns[TConcern], TConcern>;
export type Implementation<
  TConcern extends AllConcerns,
  TDeps extends AllConcerns | BuiltinEffects
> = {
  concern: TConcern;
  instantiate: (context: {
    [key in Exclude<TDeps, BuiltinEffects>]: Concerns[key];
  }) => MultishotGenerator<TDeps, Concerns[TConcern], any>;
};
export declare function addInterceptor<A, B, C>(
  interceptor: (
    normal: (value: C) => MultishotGenerator<A, B, C>
  ) => (value: C) => MultishotGenerator<A, B, C>
): () => any[];
export declare function impl<TConcern extends AllConcerns>(
  concern: TConcern
): <TDeps extends AllConcerns | BuiltinEffects>(
  factory: (
    _: typeof Yield<Concerns[TConcern]>
  ) => DetailOf<Concerns[TConcern], TDeps>
) => Implementation<TConcern, TDeps>;
export interface Instance<T> {
  instance: T;
  dispose: () => void;
}
export declare function Await<T>(promise: Promise<T>): DetailOf<T, "(await)">;
export declare function Yield<T>(value: T): DetailOf<void, "(yield)">;
export type Subscription = () => () => void;
export declare function Subscribe(
  subscription: Subscription
): DetailOf<void, "(subscribe)">;
export type BuiltinEffects = "(await)" | "(yield)" | "(subscribe)";

export interface ModuleRegistry<TConcerns extends AllConcerns> {
  get<T extends TConcerns>(concern: T): Concerns[TConcerns];
}

export class ImplementationConstructor<
  TConcern extends AllConcerns,
  TDeps extends AllConcerns | BuiltinEffects
> {
  constructor(base: Implementation<TConcern, TDeps>);

  provide<
    PConcern extends Exclude<TDeps, BuiltinEffects>,
    PDeps extends AllConcerns | BuiltinEffects
  >(
    provide: Implementation<PConcern, PDeps>
  ): ImplementationConstructor<TConcern, Exclude<TDeps, PConcern> | PDeps>;

  provideRegistry<RConcerns extends AllConcerns>(
    registry: ModuleRegistry<RConcerns>
  ): ImplementationConstructor<TConcern, Exclude<TDeps, RConcerns>>;

  provideConstant<PConcern extends Exclude<TDeps, BuiltinEffects>>(
    concern: PConcern,
    value: Concerns[PConcern]
  ): ImplementationConstructor<TConcern, Exclude<TDeps, PConcern>>;

  provideDynamic<
    PConcern extends Exclude<TDeps, BuiltinEffects>,
    PDeps extends AllConcerns | BuiltinEffects,
    DEffects extends AllConcerns | BuiltinEffects
  >(
    concern: PConcern,
    factory: () => Generator<DEffects, Implementation<PConcern, PDeps>>
  ): ImplementationConstructor<
    TConcern,
    Exclude<TDeps, PConcern> | PDeps | DEffects
  >;

  construct(): [TDeps] extends ["(subscribe)"]
    ? Instance<Concerns[TConcern]>
    : never;
  constructAsync(): [TDeps] extends ["(subscribe)" | "(await)"]
    ? Instance<Promise<Concerns[TConcern]>>
    : never;
  constructStream(): [TDeps] extends ["(subscribe)" | "(yield)"]
    ? Instance<Generator<Concerns[TConcern], void>>
    : never;
  constructAsyncStream(): [TDeps] extends [
    "(subscribe)" | "(await)" | "(yield)"
  ]
    ? Instance<AsyncGenerator<Concerns[TConcern], void>>
    : never;
}

export class ModuleConstructor<
  TConcerns extends AllConcerns = never,
  TDeps extends AllConcerns | BuiltinEffects = never
> {
  constructor();

  provide<
    PConcern extends AllConcerns,
    PDeps extends AllConcerns | BuiltinEffects
  >(
    provide: Implementation<PConcern, PDeps>
  ): ModuleConstructor<TConcerns | PConcern, Exclude<TDeps, PConcern> | PDeps>;

  provideRegistry<RConcerns extends AllConcerns>(
    registry: ModuleRegistry<RConcerns>
  ): ModuleConstructor<TConcerns | RConcerns, Exclude<TDeps, RConcerns>>;

  provideConstant<PConcern extends AllConcerns>(
    concern: PConcern,
    value: Concerns[PConcern]
  ): ModuleConstructor<TConcerns | PConcern, Exclude<TDeps, PConcern>>;

  provideDynamic<
    PConcern extends AllConcerns,
    PDeps extends AllConcerns | BuiltinEffects,
    DEffects extends AllConcerns | BuiltinEffects
  >(
    concern: PConcern,
    factory: () => Generator<DEffects, Implementation<PConcern, PDeps>>
  ): ModuleConstructor<
    TConcerns | PConcern,
    Exclude<TDeps, PConcern> | PDeps | DEffects
  >;

  construct(): [TDeps] extends ["(subscribe)"]
    ? Instance<ModuleRegistry<TConcerns>>
    : never;
  constructAsync(): [TDeps] extends ["(subscribe)" | "(await)"]
    ? Instance<Promise<ModuleRegistry<TConcerns>>>
    : never;
  constructStream(): [TDeps] extends ["(subscribe)" | "(yield)"]
    ? Instance<Generator<ModuleRegistry<TConcerns>, void>>
    : never;
  constructAsyncStream(): [TDeps] extends [
    "(subscribe)" | "(await)" | "(yield)"
  ]
    ? Instance<AsyncGenerator<ModuleRegistry<TConcerns>, void>>
    : never;
}

export interface Logger {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}
interface Concerns {
  logger: Logger;
}
export declare const implementLogger: <
  TDeps extends keyof Concerns | BuiltinEffects
>(
  factory: (
    _: (value: Logger) => DetailOf<void, "(yield)">
  ) => DetailOf<Logger, TDeps>
) => Implementation<"logger", TDeps>;
