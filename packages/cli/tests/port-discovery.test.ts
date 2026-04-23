import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isProcessAlive,
  readPortLock,
  releasePortLock,
  suggestStartingPort,
  writePortLock,
} from "../src/port-discovery.js";

describe("port-discovery", () => {
  let tmp: string;
  let portFile: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "deckel-port-"));
    portFile = join(tmp, ".port");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("isProcessAlive returns true for self", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it("isProcessAlive returns false for obviously dead pid", () => {
    expect(isProcessAlive(999_999_999)).toBe(false);
  });

  it("readPortLock returns null when file does not exist", () => {
    expect(readPortLock(portFile)).toBeNull();
  });

  it("writePortLock / readPortLock round-trip", () => {
    const lock = {
      pid: process.pid,
      port: 4321,
      token: "abc",
      startedAt: "2026-04-22T10:00:00.000Z",
    };
    writePortLock(portFile, lock);
    expect(readPortLock(portFile)).toEqual(lock);
  });

  it("releasePortLock removes the file silently if absent", () => {
    releasePortLock(portFile);
    releasePortLock(portFile);
    expect(readPortLock(portFile)).toBeNull();
  });

  it("suggestStartingPort returns desired port when no lock exists", () => {
    expect(suggestStartingPort(portFile, 4321)).toBe(4321);
  });

  it("suggestStartingPort increments when live PID holds desired port", () => {
    writePortLock(portFile, {
      pid: process.pid,
      port: 4321,
      token: "x",
      startedAt: "2026-04-22T10:00:00.000Z",
    });
    expect(suggestStartingPort(portFile, 4321)).toBe(4322);
  });

  it("suggestStartingPort ignores dead PID (takeover)", () => {
    writePortLock(portFile, {
      pid: 999_999_999,
      port: 4321,
      token: "x",
      startedAt: "2026-04-22T10:00:00.000Z",
    });
    expect(suggestStartingPort(portFile, 4321)).toBe(4321);
  });

  it("suggestStartingPort ignores malformed port file", () => {
    writeFileSync(portFile, "{not json", "utf8");
    expect(suggestStartingPort(portFile, 4321)).toBe(4321);
  });

  it("writePortLock output is readable json", () => {
    writePortLock(portFile, {
      pid: 1,
      port: 9,
      token: "t",
      startedAt: "x",
    });
    const raw = readFileSync(portFile, "utf8");
    expect(raw.trim()).toMatch(/^{[\s\S]+}$/);
    expect(JSON.parse(raw)).toEqual({ pid: 1, port: 9, token: "t", startedAt: "x" });
  });
});
