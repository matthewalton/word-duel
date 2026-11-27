/**
 * Unit tests for the versus record: the row a finished match leaves, and an
 * account's totals, head-to-head and recent matches.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchRowOf, versusRecordOf, type RoomSeats, type StoredMatch } from "./versusRecord.ts";

const room: RoomSeats = { id: "room-1", p1UserId: "ana", p1Name: "Ana", p2UserId: null, p2Name: null };
const at = new Date(Date.UTC(2026, 10, 27, 12));

const snapshot = (over: Partial<Parameters<typeof matchRowOf>[1]> = {}): Parameters<typeof matchRowOf>[1] => ({
  winner: null,
  forfeit: null,
  hearts: { p1: 3, p2: 3 },
  match: 1,
  minigame: "word-strike",
  players: { p1: { name: "Ana" }, p2: { name: null } },
  ...over,
});

describe("matchRowOf", () => {
  it("writes nothing while the match is on, or before anyone joins", () => {
    assert.equal(matchRowOf(room, snapshot(), at), null);
    assert.equal(matchRowOf(room, snapshot({ winner: "p2", forfeit: "p1", players: { p1: { name: "Ana" }, p2: null } }), at), null);
  });

  it("records a match won on hearts with each seat's account, a guest as null", () => {
    assert.deepEqual(matchRowOf(room, snapshot({ winner: "p1", hearts: { p1: 2, p2: 0 }, match: 3 }), at), {
      roomId: "room-1",
      match: 3,
      minigame: "word-strike",
      p1UserId: "ana",
      p1Name: "Ana",
      p2UserId: null,
      p2Name: null,
      winner: "p1",
      reason: "hearts",
      p1Hearts: 2,
      p2Hearts: 0,
      endedAt: at,
    });
  });

  it("records a rival leaving as a win for the one who stayed", () => {
    const row = matchRowOf(room, snapshot({ winner: "p2", forfeit: "p1", hearts: { p1: 3, p2: 1 } }), at);
    assert.equal(row?.winner, "p2");
    assert.equal(row?.reason, "left");
    assert.deepEqual([row?.p1Hearts, row?.p2Hearts], [3, 1]);
  });

  it("gives the same row key (room and match) on a repeat call", () => {
    const won = snapshot({ winner: "p1", hearts: { p1: 1, p2: 0 } });
    const first = matchRowOf(room, won, at);
    const again = matchRowOf(room, won, new Date(at.getTime() + 5000));
    assert.deepEqual([first?.roomId, first?.match], [again?.roomId, again?.match]);
  });
});

let day = 30;
/** A match `me` played in seat p1, newest first as the server reads them. */
const match = (rival: string | null, win: boolean, over: Partial<StoredMatch> = {}): StoredMatch => ({
  minigame: "word-strike",
  p1UserId: "me",
  p1Name: "Me",
  p1Current: "Me",
  p2UserId: rival,
  p2Name: rival ? `${rival} then` : null,
  p2Current: rival ? `${rival} now` : null,
  winner: win ? "p1" : "p2",
  reason: "hearts",
  p1Hearts: win ? 2 : 0,
  p2Hearts: win ? 0 : 1,
  endedAt: new Date(Date.UTC(2026, 10, day--)),
  ...over,
});

describe("versusRecordOf", () => {
  it("is empty with no matches", () => {
    assert.deepEqual(versusRecordOf([], "me"), { played: 0, won: 0, lost: 0, winRate: null, headToHead: [], recent: [] });
  });

  it("counts guests in the totals but gives them no head-to-head row", () => {
    const record = versusRecordOf([match(null, true)], "me");
    assert.deepEqual([record.played, record.won, record.lost], [1, 1, 0]);
    assert.deepEqual(record.headToHead, []);
    assert.equal(record.recent[0].rival, null);
    assert.deepEqual([record.recent[0].won, record.recent[0].hearts, record.recent[0].rivalHearts], [true, 2, 0]);
  });

  it("totals head-to-head per rival account by current name, most played first", () => {
    const record = versusRecordOf(
      [match("bo", true), match("cy", false), match("cy", true), match("bo", false), match("cy", false), match(null, false)],
      "me",
    );
    assert.deepEqual(record.headToHead, [
      { name: "cy now", won: 1, lost: 2 },
      { name: "bo now", won: 1, lost: 1 },
    ]);
    assert.deepEqual([record.played, record.won, record.lost, record.winRate], [6, 2, 4, 33]);
  });

  it("lists rivals played equally often most recent first", () => {
    const record = versusRecordOf([match("bo", true), match("cy", false), match("cy", true), match("bo", false)], "me");
    assert.deepEqual(
      record.headToHead.map((h) => h.name),
      ["bo now", "cy now"],
    );
  });

  it("reads the seat the account sat in, either one", () => {
    const asP2 = match("bo", false, {
      p1UserId: "bo",
      p1Current: "Bo",
      p2UserId: "me",
      p2Current: "Me",
      winner: "p2",
      p1Hearts: 0,
      p2Hearts: 3,
    });
    const record = versusRecordOf([asP2], "me");
    assert.deepEqual(record.headToHead, [{ name: "Bo", won: 1, lost: 0 }]);
    assert.deepEqual([record.recent[0].won, record.recent[0].hearts, record.recent[0].rivalHearts], [true, 3, 0]);
  });

  it("shows a win rate only from 5 matches", () => {
    assert.equal(versusRecordOf([1, 2, 3, 4].map(() => match(null, true)), "me").winRate, null);
    assert.equal(versusRecordOf([1, 2, 3, 4, 5].map((n) => match(null, n < 5)), "me").winRate, 80);
  });

  it("keeps a deleted rival's match in the totals under the name the room showed, with no head-to-head row", () => {
    const record = versusRecordOf([match(null, true, { p2Name: "Gone" })], "me");
    assert.equal(record.played, 1);
    assert.deepEqual(record.headToHead, []);
    assert.equal(record.recent[0].rival, "Gone");
  });

  it("leaves out a match the account played against itself", () => {
    assert.equal(versusRecordOf([match("me", true)], "me").played, 0);
  });

  it("lists the 10 newest matches and the 10 most played rivals", () => {
    const many = Array.from({ length: 12 }, (_, i) => match(`r${i}`, i % 2 === 0, { p2Current: `R${i}` }));
    const record = versusRecordOf(many, "me");
    assert.equal(record.recent.length, 10);
    assert.equal(record.recent[0].rival, "R0");
    assert.equal(record.headToHead.length, 10);
    assert.equal(record.played, 12);
  });
});
