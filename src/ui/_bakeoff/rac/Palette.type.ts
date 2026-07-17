import type { PaletteProps } from "../contract.type";

export type OuterProps = PaletteProps;

export interface Props extends PaletteProps {
  /** Locale-aware substring match from RAC's useFilter. */
  contains: (textValue: string, inputValue: string) => boolean;
}
