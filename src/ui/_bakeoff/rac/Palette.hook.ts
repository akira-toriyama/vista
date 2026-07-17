import { useFilter } from "react-aria-components";
import type { OuterProps, Props } from "./Palette.type";

/**
 * The filter predicate is first-party: useFilter is re-exported from
 * react-aria-components (no separate @react-aria/i18n dep needed) and is backed
 * by Intl.Collator, so "sensitivity: base" makes the palette match
 * case/accent-insensitively — and, for the CJK input scenario B cares about,
 * it matches kana without hand-rolling a normalizer.
 */
export function usePalette({
  open,
  onOpenChange,
  tasks,
  onSelect,
}: OuterProps): Props {
  const { contains } = useFilter({ sensitivity: "base" });
  return { open, onOpenChange, tasks, onSelect, contains };
}
