// General purpose bag of nested and/or keyed strings.
export { getProperty, setProperty, hasProperty, deleteProperty, deepKeys } from 'dot-prop';
export type Properties<T = string | number | boolean> = { [property: string]: Property<T> };
export type Property<T = string | number | boolean> =
  | T
  | Property[]
  | Properties
  | undefined;

export type Class<T, Arguments extends unknown[] = any[]> = Constructor<T, Arguments> & {prototype: T};
export type Constructor<T, Arguments extends unknown[] = any[]> = new(...arguments_: Arguments) => T;

// JsonObject is a useful base class for response types that will be JSON-compatible but
// shouldn't be returned "bare" as it would require double-casting. 
export type JsonObject = {[Key in string]: JsonValue} & {[Key in string]?: JsonValue | undefined};
export type JsonArray = JsonValue[];
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
