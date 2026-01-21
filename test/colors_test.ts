import { assertEquals } from "@std/assert";
import {
  blue,
  bold,
  cyan,
  dim,
  green,
  inverse,
  isNoColor,
  red,
  setNoColor,
  yellow,
} from "../src/colors.ts";

Deno.test("setNoColor and isNoColor", async (t) => {
  await t.step("isNoColor returns false by default", () => {
    setNoColor(false);
    assertEquals(isNoColor(), false);
  });

  await t.step("setNoColor(true) enables no-color mode", () => {
    setNoColor(true);
    assertEquals(isNoColor(), true);
  });

  await t.step("setNoColor(false) disables no-color mode", () => {
    setNoColor(false);
    assertEquals(isNoColor(), false);
  });
});

Deno.test("color functions with noColor disabled", async (t) => {
  setNoColor(false);

  await t.step("bold applies formatting", () => {
    const result = bold("test");
    // When colors are enabled, the string should be different (contain ANSI codes)
    assertEquals(result.includes("test"), true);
    assertEquals(result.length > "test".length, true);
  });

  await t.step("dim applies formatting", () => {
    const result = dim("test");
    assertEquals(result.includes("test"), true);
    assertEquals(result.length > "test".length, true);
  });

  await t.step("inverse applies formatting", () => {
    const result = inverse("test");
    assertEquals(result.includes("test"), true);
    assertEquals(result.length > "test".length, true);
  });

  await t.step("blue applies formatting", () => {
    const result = blue("test");
    assertEquals(result.includes("test"), true);
    assertEquals(result.length > "test".length, true);
  });

  await t.step("red applies formatting", () => {
    const result = red("test");
    assertEquals(result.includes("test"), true);
    assertEquals(result.length > "test".length, true);
  });

  await t.step("green applies formatting", () => {
    const result = green("test");
    assertEquals(result.includes("test"), true);
    assertEquals(result.length > "test".length, true);
  });

  await t.step("yellow applies formatting", () => {
    const result = yellow("test");
    assertEquals(result.includes("test"), true);
    assertEquals(result.length > "test".length, true);
  });

  await t.step("cyan applies formatting", () => {
    const result = cyan("test");
    assertEquals(result.includes("test"), true);
    assertEquals(result.length > "test".length, true);
  });
});

Deno.test("color functions with noColor enabled", async (t) => {
  setNoColor(true);

  await t.step("bold returns string unchanged", () => {
    assertEquals(bold("test"), "test");
  });

  await t.step("dim returns string unchanged", () => {
    assertEquals(dim("test"), "test");
  });

  await t.step("inverse returns string unchanged", () => {
    assertEquals(inverse("test"), "test");
  });

  await t.step("blue returns string unchanged", () => {
    assertEquals(blue("test"), "test");
  });

  await t.step("red returns string unchanged", () => {
    assertEquals(red("test"), "test");
  });

  await t.step("green returns string unchanged", () => {
    assertEquals(green("test"), "test");
  });

  await t.step("yellow returns string unchanged", () => {
    assertEquals(yellow("test"), "test");
  });

  await t.step("cyan returns string unchanged", () => {
    assertEquals(cyan("test"), "test");
  });

  // Reset for other tests
  setNoColor(false);
});

Deno.test("color functions handle empty strings", () => {
  setNoColor(true);
  assertEquals(bold(""), "");
  assertEquals(blue(""), "");

  setNoColor(false);
  // Even with colors enabled, empty string should work
  const result = bold("");
  assertEquals(typeof result, "string");
});

Deno.test("color functions handle special characters", () => {
  setNoColor(true);
  assertEquals(bold("hello\nworld"), "hello\nworld");
  assertEquals(blue("tab\there"), "tab\there");
  assertEquals(green("unicode: \u2713"), "unicode: \u2713");

  setNoColor(false);
});
