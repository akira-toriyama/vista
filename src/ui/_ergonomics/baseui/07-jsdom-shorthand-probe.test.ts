import { expect, test } from "vitest";

// Controlled experiment, NO Base UI involved.
//
// 06-cleanup-probe showed body keeps `overflow: hidden` after Base UI's scroll
// lock cleans up. Base UI's lock WRITES the shorthand (`overflow: 'hidden'`)
// but its cleanup RESTORES only the longhands it saved (overflowY/overflowX)
// — see @base-ui/utils/useScrollLock.js.
//
// In real CSSOM, clearing both longhands clears the shorthand. Does jsdom's
// cssstyle agree? If not, the residue is a jsdom artifact and NOT a real leak,
// and I must not report it as one.

test("jsdom: does clearing overflowX/Y longhands clear the `overflow` shorthand?", () => {
  const el = document.createElement("div");

  // exactly what Base UI's lockScroll does
  Object.assign(el.style, { overflow: "hidden" });
  const afterLock = el.getAttribute("style");

  // exactly what Base UI's cleanup does (restore saved longhands, both empty)
  Object.assign(el.style, { overflowY: "", overflowX: "" });
  const afterRestore = el.getAttribute("style");

  console.log(
    "\n[jsdom shorthand probe]\n" +
      JSON.stringify({ afterLock, afterRestore }, null, 2),
  );

  // If jsdom were spec-correct this would be "" / null.
  // Whatever it prints is the ground truth for interpreting 06.
  expect(afterLock).toBe("overflow: hidden;");
});
