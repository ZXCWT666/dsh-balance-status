// Pure-function unit tests for the host half — no network, no $DSH_HOME, no
// credentials. Runs anywhere (CI included). Zero dependencies: node:assert.
import { strict as assert } from "node:assert";
import {
	aggregateWindows,
	foldUsage,
	resolveTargets,
	scanZstdFrames,
	startOfDay,
	startOfMonth,
	startOfWeek
} from "../lib/index.js";

let passed = 0;
function test(name, fn) {
	try {
		fn();
		passed += 1;
		console.log(`ok - ${name}`);
	} catch (error) {
		console.error(`FAIL - ${name}`);
		throw error;
	}
}

// ── time windows (local time) ──────────────────────────────────────────────

test("startOfDay truncates to local midnight", () => {
	const d = new Date(2026, 7, 26, 14, 38, 21).getTime();
	assert.equal(startOfDay(d), new Date(2026, 7, 26, 0, 0, 0, 0).getTime());
});

test("startOfWeek begins on Monday for a Tuesday", () => {
	// 2026-08-26 is a Wednesday.
	const d = new Date(2026, 7, 26, 12, 0, 0).getTime();
	assert.equal(startOfWeek(d), new Date(2026, 7, 24, 0, 0, 0, 0).getTime());
});

test("startOfWeek begins on Monday for a Sunday", () => {
	const d = new Date(2026, 7, 30, 12, 0, 0).getTime(); // Sunday
	assert.equal(startOfWeek(d), new Date(2026, 7, 24, 0, 0, 0, 0).getTime());
});

test("startOfMonth begins on the 1st", () => {
	const d = new Date(2026, 7, 26, 12, 0, 0).getTime();
	assert.equal(startOfMonth(d), new Date(2026, 7, 1, 0, 0, 0, 0).getTime());
});

// ── foldUsage ──────────────────────────────────────────────────────────────

const modelMsg = (time, input, output, cacheRead, reasoning, model = "deepseek-v4-flash-vision-exp") => JSON.stringify({
	type: "assistant/message",
	seq: 1,
	time,
	data: {
		turn: 1,
		step: 1,
		message: { role: "assistant", content: [], source: { kind: "model", provider: "deepseek-official", model } },
		usage: { inputTokens: input, outputTokens: output, cacheReadTokens: cacheRead, reasoningTokens: reasoning }
	}
});

test("foldUsage aggregates input/output/cache/reasoning per day", () => {
	const dayA = new Date(2026, 7, 26, 10, 0, 0).getTime();
	const dayB = new Date(2026, 7, 27, 10, 0, 0).getTime();
	const content = [
		modelMsg(dayA, 100, 50, 20, 5),
		modelMsg(dayA, 40, 10, 4, 0),
		modelMsg(dayB, 1, 1, 0, 1),
		JSON.stringify({ type: "user/message", seq: 2, time: dayA, data: {} }),
		JSON.stringify({ type: "assistant/message", seq: 3, time: dayA, data: { message: { source: { kind: "user" } }, usage: {} } }),
		JSON.stringify({ type: "assistant/message", seq: 4, time: dayA, data: { message: { source: { kind: "model" } } } }),
		JSON.stringify({ type: "assistant/message", seq: 5, time: dayA, data: { message: { source: { kind: "model" } }, usage: { inputTokens: 0, outputTokens: 0 } } }),
		"not-json"
	].join("\n");
	const days = foldUsage(content, 0);
	assert.equal(days.size, 2);
	const a = days.get(startOfDay(dayA));
	assert.equal(a.input, 140);
	assert.equal(a.output, 60);
	assert.equal(a.cacheRead, 24);
	assert.equal(a.reasoning, 5);
	assert.equal(a.calls, 2);
	assert.equal(a.models.get("deepseek-v4-flash-vision-exp").input, 140);
});

test("foldUsage drops days before the floor", () => {
	const dayA = new Date(2026, 0, 15, 10, 0, 0).getTime(); // Jan 15
	const floor = startOfMonth(new Date(2026, 1, 1, 12, 0, 0).getTime()); // Feb 1
	const days = foldUsage(`${modelMsg(dayA, 100, 50, 0, 0)}\n`, floor);
	assert.equal(days.has(startOfDay(dayA)), false);
});

test("foldUsage keeps days at or after the floor", () => {
	const dayA = new Date(2026, 7, 26, 10, 0, 0).getTime();
	const days = foldUsage(`${modelMsg(dayA, 100, 50, 0, 0)}\n`, startOfMonth(dayA));
	assert.equal(days.get(startOfDay(dayA)).input, 100);
});

// ── aggregateWindows ───────────────────────────────────────────────────────

test("aggregateWindows sums only in-range days and per-model splits", () => {
	const dayA = new Date(2026, 7, 26, 10, 0, 0).getTime();
	const dayB = new Date(2026, 7, 27, 10, 0, 0).getTime();
	const foldA = foldUsage(`${modelMsg(dayA, 10, 5, 1, 2, "m-a")}\n`, 0);
	const foldB = foldUsage(`${modelMsg(dayB, 20, 8, 3, 4, "m-b")}\n`, 0);
	const out = aggregateWindows([foldA, foldB], startOfDay(dayA), startOfDay(dayB));
	assert.equal(out.input, 10);
	assert.equal(out.output, 5);
	assert.equal(out.calls, 1);
	assert.deepEqual(out.models["m-a"], { input: 10, output: 5, cacheRead: 1, reasoning: 2, calls: 1 });
	assert.equal(out.models["m-b"], undefined);
	const both = aggregateWindows([foldA, foldB], 0, Number.MAX_SAFE_INTEGER);
	assert.equal(both.input, 30);
	assert.equal(both.cacheRead, 4);
	assert.equal(both.reasoning, 6);
});

test("aggregateWindows tolerates null folds", () => {
	const out = aggregateWindows([null, null], 0, 1);
	assert.equal(out.input, 0);
	assert.equal(out.calls, 0);
});

// ── scanZstdFrames ─────────────────────────────────────────────────────────

test("scanZstdFrames rejects non-zstd buffers", () => {
	assert.deepEqual(scanZstdFrames(Buffer.from("hello world")), []);
	assert.deepEqual(scanZstdFrames(Buffer.alloc(3)), []);
});

// ── resolveTargets ─────────────────────────────────────────────────────────

test("resolveTargets falls back to defaults without settings/env", () => {
	const ctx = { get: () => undefined };
	const old = { b: process.env.BALANCE_STATUS_BALANCE_TARGET, d: process.env.BALANCE_STATUS_DAILY_TOKENS };
	delete process.env.BALANCE_STATUS_BALANCE_TARGET;
	delete process.env.BALANCE_STATUS_DAILY_TOKENS;
	try {
		assert.deepEqual(resolveTargets(ctx), { balance: 100, dailyTokens: 500000 });
	} finally {
		if (old.b !== undefined) process.env.BALANCE_STATUS_BALANCE_TARGET = old.b;
		if (old.d !== undefined) process.env.BALANCE_STATUS_DAILY_TOKENS = old.d;
	}
});

test("resolveTargets prefers the environment over settings", () => {
	const ctx = { get: () => ({ get: () => ({ balance: 200, dailyTokens: 900000 }) }) };
	const old = { b: process.env.BALANCE_STATUS_BALANCE_TARGET, d: process.env.BALANCE_STATUS_DAILY_TOKENS };
	process.env.BALANCE_STATUS_BALANCE_TARGET = "300";
	process.env.BALANCE_STATUS_DAILY_TOKENS = "700000";
	try {
		assert.deepEqual(resolveTargets(ctx), { balance: 300, dailyTokens: 700000 });
	} finally {
		if (old.b !== undefined) process.env.BALANCE_STATUS_BALANCE_TARGET = old.b; else delete process.env.BALANCE_STATUS_BALANCE_TARGET;
		if (old.d !== undefined) process.env.BALANCE_STATUS_DAILY_TOKENS = old.d; else delete process.env.BALANCE_STATUS_DAILY_TOKENS;
	}
});

test("resolveTargets reads the settings namespace when env is absent", () => {
	const ctx = { get: () => ({ get: () => ({ balance: 42, dailyTokens: 12345 }) }) };
	const old = { b: process.env.BALANCE_STATUS_BALANCE_TARGET, d: process.env.BALANCE_STATUS_DAILY_TOKENS };
	delete process.env.BALANCE_STATUS_BALANCE_TARGET;
	delete process.env.BALANCE_STATUS_DAILY_TOKENS;
	try {
		assert.deepEqual(resolveTargets(ctx), { balance: 42, dailyTokens: 12345 });
	} finally {
		if (old.b !== undefined) process.env.BALANCE_STATUS_BALANCE_TARGET = old.b;
		if (old.d !== undefined) process.env.BALANCE_STATUS_DAILY_TOKENS = old.d;
	}
});

console.log(`\n${passed} tests passed`);
