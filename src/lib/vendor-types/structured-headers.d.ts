// Ambient type declaration for the subset of `structured-headers@2` the SDK uses.
//
// The package exposes its entry points *only* through a package.json `exports`
// map, with no top-level `main`/`types` fallback, so `moduleResolution: "node"`
// (node10) cannot discover its bundled declarations. The alternative — a `paths`
// shim hardcoding the dependency's internal `.d.cts` — breaks the moment
// `node_modules` hoists (npm workspaces, or this repo vendored as a git
// submodule), because the shimmed path no longer exists. Declaring the small
// surface we actually import is hoisting-immune and needs no resolution-mode
// change. The signatures mirror `structured-headers`'s own types.
//
// Remove once the dependency ships discoverable typings (a `types` condition /
// top-level `types` field) or the SDK moves to a resolver that reads `exports`.
// See: https://github.com/adcontextprotocol/adcp-client/issues/2362
declare module 'structured-headers' {
  export class Token {
    constructor(value: string);
    toString(): string;
  }
  export class DisplayString {
    constructor(value: string);
    toString(): string;
  }

  export type BareItem = number | string | Token | ArrayBuffer | Date | boolean | DisplayString;
  export type Parameters = Map<string, BareItem>;
  export type Item = [BareItem, Parameters];
  export type InnerList = [Item[], Parameters];
  export type Dictionary = Map<string, Item | InnerList>;

  export class ParseError extends Error {
    constructor(position: number, message: string);
  }

  export function parseDictionary(input: string): Dictionary;
  export function serializeInnerList(input: InnerList): string;
}
