import type { AllConcerns } from "./concerns";
import { BuiltinEffects } from "./effects";
import type { Implementation } from "./impl";

export function provide<
  TConcern extends AllConcerns,
  TDeps extends AllConcerns | BuiltinEffects,
  PConcern extends Exclude<TDeps, BuiltinEffects>,
  PDeps extends AllConcerns | BuiltinEffects
>(
  base: Implementation<TConcern, TDeps>,
  provide: Implementation<PConcern, PDeps>
): Implementation<TConcern, Exclude<TDeps, PConcern> | PDeps>;
