import {
  blue as stdBlue,
  bold as stdBold,
  cyan as stdCyan,
  dim as stdDim,
  green as stdGreen,
  inverse as stdInverse,
  red as stdRed,
  yellow as stdYellow,
} from "@std/fmt/colors";

let noColor = false;

/**
 * Disable all colors
 */
export function setNoColor(value: boolean): void {
  noColor = value;
}

/**
 * Check if colors are disabled
 */
export function isNoColor(): boolean {
  return noColor;
}

// Identity function for no-color mode
const identity = (str: string) => str;

// Formatting functions that respect color mode
export const bold = (str: string) => noColor ? str : stdBold(str);
export const dim = (str: string) => noColor ? str : stdDim(str);
export const inverse = (str: string) => noColor ? str : stdInverse(str);

// Standard ANSI colors
export const blue = (str: string) => noColor ? str : stdBlue(str);
export const red = (str: string) => noColor ? str : stdRed(str);
export const green = (str: string) => noColor ? str : stdGreen(str);
export const yellow = (str: string) => noColor ? str : stdYellow(str);
export const cyan = (str: string) => noColor ? str : stdCyan(str);
