import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DropdownMenu, Select } from "radix-ui";
import { expect, test, vi } from "vitest";
import { installRadixJsdomShims } from "./_polyfills";

installRadixJsdomShims();

/**
 * MISTAKE 5 — omit a child part that the component actually needs.
 *
 * Radix models EVERY part as optional `children`. There is no required-part
 * relationship anywhere in the type system, so this whole class of mistake is
 * structurally invisible to tsc. The question is what runtime does.
 */

test("5a: DropdownMenu with Content but NO Trigger (uncontrolled) — unopenable", async () => {
  const user = userEvent.setup();
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  render(
    <DropdownMenu.Root>
      {/* no DropdownMenu.Trigger at all */}
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Alpha</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>,
  );

  console.log(`[5a] rendered without throwing = true`);
  console.log(
    `[5a] menu present = ${String(screen.queryByRole("menu") !== null)}`,
  );
  console.log(`[5a] body text = ${JSON.stringify(document.body.textContent)}`);
  console.log(`[5a] console.error = ${String(errorSpy.mock.calls.length)}`);
  console.log(`[5a] console.warn  = ${String(warnSpy.mock.calls.length)}`);

  // a component that can never be opened by any means, and nothing objects
  expect(screen.queryByRole("menu")).toBeNull();
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();

  await user.keyboard("{Enter}");
  expect(screen.queryByRole("menu")).toBeNull();

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

test("5b: Dialog.Root + Portal but NO Content — renders nothing, silently", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  render(
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        {/* forgot Dialog.Content — Title is just floating */}
        <Dialog.Title>A title with no dialog</Dialog.Title>
      </Dialog.Portal>
    </Dialog.Root>,
  );

  console.log(
    `[5b] dialog role present = ${String(screen.queryByRole("dialog") !== null)}`,
  );
  console.log(
    `[5b] title text still rendered = ${String(screen.queryByText("A title with no dialog") !== null)}`,
  );
  console.log(`[5b] console.error = ${String(errorSpy.mock.calls.length)}`);
  console.log(`[5b] console.warn  = ${String(warnSpy.mock.calls.length)}`);

  // there is no dialog — but the title renders, so a getByText assertion passes
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("A title with no dialog")).toBeInTheDocument();
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

/**
 * 5c — Select.Item WITHOUT Select.ItemText. Radix reads the selected label out
 * of ItemText specifically; plain children do not count.
 */
test("5c: Select.Item without Select.ItemText — selected value renders blank", async () => {
  const user = userEvent.setup();
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  render(
    <Select.Root defaultValue="a">
      <Select.Trigger aria-label="Pick one">
        <Select.Value placeholder="Choose…" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {/* MISTAKE: raw children instead of <Select.ItemText> */}
            <Select.Item value="a">Apple</Select.Item>
            <Select.Item value="b">Banana</Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>,
  );

  const trigger = screen.getByRole("combobox", { name: "Pick one" });
  console.log(
    `[5c] trigger text with defaultValue="a" = ${JSON.stringify(trigger.textContent)}`,
  );
  console.log(`[5c] console.error = ${String(errorSpy.mock.calls.length)}`);
  console.log(`[5c] console.warn  = ${String(warnSpy.mock.calls.length)}`);
  for (const c of [...errorSpy.mock.calls, ...warnSpy.mock.calls]) {
    console.log(`[5c] msg: ${String(c[0]).slice(0, 160)}`);
  }

  // the select has a value selected but displays NOTHING — and nothing warns
  expect(trigger.textContent).toBe("");
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();

  await user.click(trigger);
  console.log(
    `[5c] options after open = ${String(screen.queryAllByRole("option").length)}`,
  );

  errorSpy.mockRestore();
  warnSpy.mockRestore();
});
