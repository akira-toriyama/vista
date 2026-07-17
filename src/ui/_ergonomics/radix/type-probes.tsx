import { Dialog, DropdownMenu, Select } from "radix-ui";

/**
 * TYPE-LEVEL PROBE — self-verifying.
 *
 * Every `@ts-expect-error` below is a CLAIM that tsc catches that mistake. If a
 * claim is wrong, tsc fails the file with "Unused '@ts-expect-error' directive"
 * — so `npx tsc --noEmit` passing means every claim here is accurate.
 *
 * Conversely, everything under "SILENT AT THE TYPE LEVEL" is written with NO
 * suppression: it typechecks clean, which is precisely the finding.
 */

/* ------------------------------------------------------------------ *
 * CAUGHT BY TSC — the floor Radix does give you
 * ------------------------------------------------------------------ */

export const TypoedProp = () => (
  // @ts-expect-error — unknown prop `opne`
  <Dialog.Root opne>
    <Dialog.Content />
  </Dialog.Root>
);

export const BadSideUnion = () => (
  <DropdownMenu.Root>
    <DropdownMenu.Portal>
      {/* @ts-expect-error — `side` is 'top'|'right'|'bottom'|'left' */}
      <DropdownMenu.Content side="middle" />
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

export const WrongHandlerArity = () => (
  <Dialog.Root
    // @ts-expect-error — onOpenChange is (open: boolean) => void, not (s: string) => void
    onOpenChange={(s: string) => {
      void s;
    }}
  >
    <Dialog.Content />
  </Dialog.Root>
);

export const WrongOpenType = () => (
  // @ts-expect-error — `open` is boolean, not string
  <Dialog.Root open="yes">
    <Dialog.Content />
  </Dialog.Root>
);

export const SelectItemMissingValue = () => (
  <Select.Root>
    <Select.Portal>
      <Select.Content>
        {/* @ts-expect-error — `value` is required on Select.Item */}
        <Select.Item>Apple</Select.Item>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

/* ------------------------------------------------------------------ *
 * SILENT AT THE TYPE LEVEL — no suppression needed; all of this compiles
 * ------------------------------------------------------------------ */

/** M1: no Title, no aria-label. Compiles. */
export const NoAccessibleName = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Portal>
      <Dialog.Content>
        <p>no title anywhere</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

/** M4: write-only controlled prop. Compiles. */
export const OpenWithoutOnOpenChange = () => (
  <Dialog.Root open>
    <Dialog.Portal>
      <Dialog.Content>
        <Dialog.Title>Stuck</Dialog.Title>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

/** M5: a menu with no trigger — unopenable by construction. Compiles. */
export const MenuWithNoTrigger = () => (
  <DropdownMenu.Root>
    <DropdownMenu.Portal>
      <DropdownMenu.Content>
        <DropdownMenu.Item>Alpha</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

/** M2: Content with no Portal. Compiles. */
export const ContentWithoutPortal = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Content>
      <Dialog.Title>Inline</Dialog.Title>
    </Dialog.Content>
  </Dialog.Root>
);

/** M2a: a part with NO Root at all — throws at runtime, compiles fine. */
export const OrphanContent = () => (
  <Dialog.Content>
    <Dialog.Title>Orphan</Dialog.Title>
  </Dialog.Content>
);

/** Item nested in the wrong parent — throws at runtime, compiles fine. */
export const ItemOutsideContent = () => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
    <DropdownMenu.Item>Rename</DropdownMenu.Item>
  </DropdownMenu.Root>
);

/** Total nonsense nesting: a Dialog part inside a Menu. Compiles. */
export const CrossPrimitiveNesting = () => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content>
        {/* a Dialog.Title inside a DropdownMenu.Content */}
        <Dialog.Title>what</Dialog.Title>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

/** M5c: Select.Item without Select.ItemText — blank selected value. Compiles. */
export const SelectItemWithoutItemText = () => (
  <Select.Root defaultValue="a">
    <Select.Trigger>
      <Select.Value />
    </Select.Trigger>
    <Select.Portal>
      <Select.Content>
        <Select.Viewport>
          <Select.Item value="a">Apple</Select.Item>
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);
