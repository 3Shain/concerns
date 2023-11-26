interface Concerns {
  // leave it empty
}

type DetailOf<T, TDeps> = Generator<TDeps, T, any>;

type AllConcerns = keyof Concerns;

function* use<TConcern extends AllConcerns>(
  concern: TConcern
): DetailOf<Concerns[TConcern], TConcern> {
  return yield concern;
}

export type { Concerns, DetailOf, AllConcerns };
export { use };
