import { MoreHorizontal, PanelRight, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ColumnMenuProps } from "../contract.type";
import { TESTID } from "../contract.type";
import { buttonVariants } from "@/ui/primitives/button";
import { cn } from "@/ui/lib/utils";
import { useColumnMenu } from "./ColumnMenu.hook";
import type { Props } from "./ColumnMenu.type";

const itemClass =
  "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground";

/**
 * Scenario C — click-open menu, three items, one of which opens the side-peek.
 *
 * Uncontroversial: `DropdownMenu` is click-driven with no `openOnHover` knob to
 * get wrong, and the item→dialog chain works. One testing note worth carrying
 * into the neutral suite: the trigger opens on **pointerdown**, not click
 * (dropdown-menu.tsx:120-128), so RTL's `fireEvent.click` will not open this
 * menu — it needs `userEvent.click`.
 */
export function ColumnMenuComponent({
  onSelectDetail,
  onRename,
  onDelete,
  onCloseAutoFocus,
}: Props) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        data-testid={TESTID.menuTrigger}
        data-slot="column-menu-trigger"
        aria-label="Column actions"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <MoreHorizontal />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-testid={TESTID.menu}
          data-slot="column-menu"
          onCloseAutoFocus={onCloseAutoFocus}
          align="end"
          sideOffset={4}
          className="z-50 min-w-44 rounded-lg border bg-popover p-1 shadow-md"
        >
          <DropdownMenu.Item
            data-testid={TESTID.menuOpenDetail}
            onSelect={onSelectDetail}
            className={itemClass}
          >
            <PanelRight className="size-4" />
            Open detail
          </DropdownMenu.Item>
          <DropdownMenu.Item
            data-testid={TESTID.menuRename}
            onSelect={onRename}
            className={itemClass}
          >
            <Pencil className="size-4" />
            Rename
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            data-testid={TESTID.menuDelete}
            onSelect={onDelete}
            className={cn(itemClass, "text-destructive")}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* c8 ignore start -- composition line: presenter × hook */
export function ColumnMenu(props: ColumnMenuProps) {
  return <ColumnMenuComponent {...useColumnMenu(props)} />;
}
/* c8 ignore stop */
