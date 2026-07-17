import { Menu } from "@base-ui/react/menu";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "vitest";

// Diagnostic: where does focus ACTUALLY go when a Base UI menu opens?
// Not an assertion — a probe. Printed so the answer is observed, not guessed.

function Probe() {
  return (
    <Menu.Root>
      <Menu.Trigger>Menu</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item>Item one</Menu.Item>
            <Menu.Item>Item two</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function describeActive() {
  const el = document.activeElement;
  if (!el) return "null";
  return `<${el.tagName.toLowerCase()} role=${el.getAttribute("role")} text=${JSON.stringify(el.textContent?.slice(0, 30))}>`;
}

test("probe: activeElement after POINTER click", async () => {
  const user = userEvent.setup();
  render(<Probe />);
  await user.click(screen.getByRole("button", { name: "Menu" }));
  await screen.findByRole("menu");
  console.log("[pointer click] activeElement =", describeActive());
});

test("probe: activeElement after KEYBOARD open (Enter)", async () => {
  const user = userEvent.setup();
  render(<Probe />);
  const trigger = screen.getByRole("button", { name: "Menu" });
  trigger.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("menu");
  console.log("[keyboard Enter] activeElement =", describeActive());
});

test("probe: activeElement after ArrowDown open", async () => {
  const user = userEvent.setup();
  render(<Probe />);
  const trigger = screen.getByRole("button", { name: "Menu" });
  trigger.focus();
  await user.keyboard("{ArrowDown}");
  await screen.findByRole("menu");
  console.log("[ArrowDown] activeElement =", describeActive());
});
