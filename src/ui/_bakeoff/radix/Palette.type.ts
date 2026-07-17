import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { BakeoffTask, PaletteProps } from "../contract.type";

/** PaletteProps plus everything usePalette injects into the presenter. */
export interface Props {
  open: boolean;
  onOpenChange: PaletteProps["onOpenChange"];
  /** Current query text — filtering is ours, Radix has no combobox primitive. */
  query: string;
  onQueryChange: (query: string) => void;
  /** `tasks` narrowed by `query`, in contract order. */
  results: readonly BakeoffTask[];
  /** Index into `results` that Enter would commit. */
  activeIndex: number;
  onItemClick: (id: string) => void;
  onInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  /** Escape must cancel an IME candidate window, not the palette. */
  onEscapeKeyDown: (event: KeyboardEvent) => void;
  onCloseAutoFocus: (event: Event) => void;
  listId: string;
  optionId: (id: string) => string;
}
