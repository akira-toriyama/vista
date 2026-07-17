import { Ellipsis, PanelRight, Pencil, Trash2 } from "lucide-react";
import {
  Button as AriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { cn } from "@/ui/lib/utils";
import { buttonVariants } from "@/ui/primitives/button";
import { TESTID } from "../contract.type";
import { useColumnMenu } from "./ColumnMenu.hook";
import type { OuterProps, Props } from "./ColumnMenu.type";

/**
 * Scenario C — click-open menu, three items, one of which opens scenario A.
 *
 * <MenuTrigger> is click-open by default (useMenuTrigger with `type: 'menu'`);
 * hover-open is not even reachable without SubmenuTrigger, so "click not hover"
 * costs nothing here.
 *
 * The trigger is RAC's own <Button>, not @/ui/primitives/button. MenuTrigger
 * publishes its trigger props through a <PressResponder> (Menu.tsx:163), which
 * only reaches a child that consumes RAC's press context — a plain <button>
 * would render fine and never open. Rather than fork the primitive, the RAC
 * Button wears vista's cva classes, so the two button implementations coexist
 * without either shadowing the other.
 *
 * This is also the shape that dodges the known focus trap: MenuTrigger supplies
 * PopoverContext.triggerRef (Menu.tsx:148-157), so the <Popover> is anchored and
 * modal, `shouldBeDialog` stays true (Popover.tsx:272-274) and :368 passes
 * shouldContainFocus — which is what actually moves keyboard focus into the
 * menu. Hand-rolling usePopover instead drops that wiring on the floor.
 */
export function ColumnMenuComponent({
  onOpenDetail,
  onRename,
  onDelete,
}: Props) {
  return (
    <MenuTrigger>
      <AriaButton
        data-testid={TESTID.menuTrigger}
        aria-label="Column actions"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <Ellipsis />
      </AriaButton>
      <Popover className="min-w-44 outline-none">
        <Menu
          data-testid={TESTID.menu}
          className="rounded-lg border bg-popover p-1 shadow-md outline-none"
        >
          <MenuItem
            data-testid={TESTID.menuOpenDetail}
            onAction={onOpenDetail}
            className={menuItemClass}
          >
            <PanelRight />
            Open detail
          </MenuItem>
          <MenuItem
            data-testid={TESTID.menuRename}
            onAction={onRename}
            className={menuItemClass}
          >
            <Pencil />
            Rename
          </MenuItem>
          <MenuItem
            data-testid={TESTID.menuDelete}
            onAction={onDelete}
            className={cn(
              menuItemClass,
              "text-destructive data-[focused]:bg-destructive/10",
            )}
          >
            <Trash2 />
            Delete
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

const menuItemClass =
  "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[focused]:bg-muted [&_svg]:size-3.5 [&_svg]:shrink-0";

/* c8 ignore start -- composition line: presenter × hook */
export function ColumnMenu(props: OuterProps) {
  return <ColumnMenuComponent {...useColumnMenu(props)} />;
}
/* c8 ignore stop */
