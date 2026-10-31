import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampSplit, isSplitSection, pairedSection, stepSection } from "./split.ts";

describe("split screen", () => {
  it("lets one pane take almost the whole screen", () => {
    assert.equal(clampSplit(0), 6);
    assert.equal(clampSplit(10), 10);
    assert.equal(clampSplit(100), 94);
    assert.equal(clampSplit(46), 46);
    assert.equal(clampSplit(Number.NaN), 46);
  });

  it("opens the other hub so the two panes are not the same screen", () => {
    assert.equal(pairedSection("desk"), "income");
    assert.equal(pairedSection("income"), "stats");
    assert.equal(pairedSection("advice"), "desk");
  });

  it("steps only inside the pane hub", () => {
    assert.equal(stepSection("income", 1), "fixed");
    assert.equal(stepSection("subs", 1), "income");
    assert.equal(stepSection("stats", 1), "advice");
    assert.equal(stepSection("desk", 1), "desk");
    assert.equal(isSplitSection("income"), true);
    assert.equal(isSplitSection("settings"), false);
  });
});
