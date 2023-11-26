import type { AllConcerns, Concerns } from "./concerns";
import type { BuiltinEffects } from "./effects";
import type { Implementation, Instance } from "./impl";

export function provide<
  TConcern extends AllConcerns,
  TDeps extends AllConcerns | BuiltinEffects,
  PConcern extends Exclude<TDeps, BuiltinEffects>,
  PDeps extends AllConcerns | BuiltinEffects
>(
  base: Implementation<TConcern, TDeps>,
  provide: Implementation<PConcern, PDeps>
): Implementation<TConcern, Exclude<TDeps, PConcern> | PDeps>;

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
