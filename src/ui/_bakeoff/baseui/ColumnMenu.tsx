import { Menu } from "@base-ui/react/menu";
import { cva } from "class-variance-authority";
import { MoreHorizontal, PanelRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/ui/primitives/button";
import { TESTID } from "../contract.type";
import { useColumnMenu } from "./ColumnMenu.hook";
import type { OuterProps, Props } from "./ColumnMenu.type";

const menuItemVariants = cva(
  "flex min-h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "",
        destructive:
          "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

/**
 * Scenario C — click-open menu that chains into the side-peek dialog.
 *
 * Click-open needs no opt-in. `openOnHover` lives on `Menu.Trigger`, not on
 * `Menu.Root`, and defaults to `parentMenubarHasSubmenuOpen`
 * (MenuTrigger.tsx:173) — false for a standalone menu like this one. So there
 * is nothing to switch off; click is simply what a menu does here.
 *
 * Measured, not assumed: the menu opens a tick AFTER `await user.click(trigger)`
 * resolves. A synchronous `getByTestId(TESTID.menu)` right after the click finds
 * nothing (aria-expanded is still "false"); `findByTestId`/`waitFor` sees it
 * open. Worth knowing for the neutral suite.
 *
 * The menu→dialog chain is the sanctioned shape, not a workaround: Base UI's
 * own `dialog/page.mdx` ("Open from a menu", line 119) says to keep the dialog
 * controlled and *a sibling of the menu*, opened from `Menu.Item`'s `onClick`.
 * That is exactly what the contract already forces — `onOpenDetail` is a bare
 * callback and the harness owns the dialog — so no nesting, and nothing to
 * freeze. There is no first-party demo of this pairing though; see `fought`.
 *
 * `modal` is left at its default (`true`), so this menu scroll-locks the page
 * while open. That is Base UI's out-of-the-box behavior and it is reported, not
 * tuned away.
 *
 * WARNING for whoever reads probe.ts's `isBodyClean()`: under jsdom this menu
 * will look like it leaks `body.style.overflow: "hidden"` forever. It is a
 * jsdom artifact, NOT a Base UI bug. useScrollLock.js `lockScroll()` writes the
 * shorthand (`Object.assign(body.style, { overflow: 'hidden' })`) but
 * `cleanup()` restores only the longhands it captured (`overflowY`/`overflowX`).
 * jsdom's cssstyle does not link shorthand→longhand — verified directly:
 * `style.overflow = "hidden"` leaves `style.overflowY === ""` — so the
 * longhand-only restore is a no-op and the shorthand survives. Real CSSOM does
 * link them, so the restore is clean in WebKit/Chrome. The leak also persists
 * across tests in a shared document, which can poison later candidates.
 */
export function ColumnMenuComponent({
  onOpenDetail,
  onRename,
  onDelete,
}: Props) {
  return (
    <Menu.Root>
      <Menu.Trigger
        data-testid={TESTID.menuTrigger}
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label="Column actions"
      >
        <MoreHorizontal />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="z-50">
          <Menu.Popup
            data-slot="column-menu-popup"
            data-testid={TESTID.menu}
            className="min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md transition-[transform,opacity] duration-100 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
          >
            <Menu.Item
              data-testid={TESTID.menuOpenDetail}
              onClick={onOpenDetail}
              className={menuItemVariants()}
            >
              <PanelRight />
              Open detail
            </Menu.Item>
            <Menu.Item
              data-testid={TESTID.menuRename}
              onClick={onRename}
              className={menuItemVariants()}
            >
              <Pencil />
              Rename
            </Menu.Item>
            <Menu.Item
              data-testid={TESTID.menuDelete}
              onClick={onDelete}
              className={menuItemVariants({ variant: "destructive" })}
            >
              <Trash2 />
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/* c8 ignore start -- composition line: presenter × hook */
export function ColumnMenu(props: OuterProps) {
  return <ColumnMenuComponent {...useColumnMenu(props)} />;
}
/* c8 ignore stop */
