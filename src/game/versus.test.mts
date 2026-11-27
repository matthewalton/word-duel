/**
 * Unit tests for the versus room channel: dev rooms never share a channel with prod rooms.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roomChannel, seatClientId } from "./versus.ts";

describe("roomChannel", () => {
  it("keeps prod channel names unchanged", () => {
    assert.equal(roomChannel("ABCD", "production"), "versus:ABCD");
  });

  it("puts development rooms under versus:dev-, still inside the key's versus:*", () => {
    assert.equal(roomChannel("ABCD", "development"), "versus:dev-ABCD");
  });

  it("treats the test run as prod", () => {
    assert.equal(roomChannel("ABCD", "test"), "versus:ABCD");
  });

  it("gives a seat's client id the same channel as its room", () => {
    assert.ok(seatClientId("ABCD", "p1").startsWith(`${roomChannel("ABCD")}:`));
  });
});
