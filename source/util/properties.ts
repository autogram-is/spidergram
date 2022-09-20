export type Properties<T = string | number | boolean > = { [property: string]: Property<T> };
export type Property<T = string | number | boolean > =
  | T
  | Property[]
  | Properties
  | undefined

export { getProperty, setProperty } from 'dot-prop';
