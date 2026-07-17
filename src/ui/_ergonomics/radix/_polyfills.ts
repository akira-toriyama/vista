/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/unbound-method --
   jsdom shims: no-op bodies are the point, `??=` guards are defensive against
   jsdom version drift, and prototype assignment is unavoidable here. */

/**
 * jsdom shims Radix needs. Kept local to _ergonomics so the measurement does
 * not depend on (or perturb) tests/setup.unit.ts.
 *
 * NOTE: every one of these is itself an ergonomics data point — Radix's popper
 * path hard-requires ResizeObserver, and its menu/select paths call
 * pointer-capture APIs jsdom does not implement. Without these shims the
 * failure mode is a throw, i.e. loud. They are installed so that the *actual*
 * mistakes under test are what the assertions see.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

export function installRadixJsdomShims() {
  globalThis.ResizeObserver ??= ResizeObserverStub as never;

  // Radix menu/select call these on trigger elements; jsdom has no pointer capture
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
