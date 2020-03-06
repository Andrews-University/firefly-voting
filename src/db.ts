import sqlite3 from 'better-sqlite3';
export const db = migrate(sqlite3("firefly.sqlite3"));

export function migrate(db: sqlite3.Database) {
	let user_version = db.pragma("user_version", { simple: true });

	if(user_version === 0) {migrate_from_0(db)}
	else if(user_version === 1) {migrate_from_1(db)}
	else if(user_version === 2) {migrate_from_2(db)}
	else if(user_version === 3) {
		console.info("user_version is current, migration finished");
	}
	else {
		throw new Error("user_version is more recent than the current version");
	}
	return db;
}

function migrate_from_0(db: sqlite3.Database) {
	console.info("performing migration from user_version = 0 to user_version = 1");
	db.prepare(`
	CREATE TABLE state (
		name TEXT PRIMARY KEY,
		value TEXT
	);
	`).run();
	db.prepare(`
	INSERT INTO state (name, value) VALUES ('current_category', '0');
	`).run();
	db.pragma("user_version = 1");
	migrate(db);
}

function migrate_from_1(db: sqlite3.Database) {
	console.info("performing migration from user_version = 1 to user_version = 2");
	db.prepare(`
	INSERT INTO state (name, value) VALUES ('voting_is_open', 'false');
	`).run();
	db.pragma("user_version = 2");
	migrate(db);
}

function migrate_from_2(db: sqlite3.Database) {
	console.info("performing migration from user_version = 1 to user_version = 2");
	db.prepare(`
	CREATE TABLE votes (
		uuid TEXT,
		category NUMBER,
		candidate NUMBER,
		PRIMARY KEY (uuid, category)
	);
	`).run();
	db.pragma("user_version = 3");
	migrate(db);
}


const _getState = db.prepare(`
SELECT value FROM state WHERE name = ?
`).raw(true);
export function getState(name: "voting_is_open"): boolean;
export function getState(name: "current_category"): number;
export function getState(name: string): unknown {
	const result = _getState.get(name);
	if(result == null) throw new Error("missing " + name);
	const value = result[0];
	if(name === "current_category") return +value;
	else if(name === "voting_is_open") return value === "true" ? true : false;
	return value;
}

const _setState = db.prepare(`
INSERT INTO state (name, value)
VALUES (?, ?)
ON CONFLICT(name) DO
	UPDATE SET value=excluded.value
`);
export function setState(name: "voting_is_open", value: boolean): boolean;
export function setState(name: "current_category", value: number): number;
export function setState(name: string, value: unknown): unknown {
	if(name === "voting_is_open") value ? "true" : "false";
	_setState.run(name, `${value}`);
	return value;
}

const _recordVote = db.prepare(`
INSERT INTO votes (uuid, category, candidate)
VALUES (?, ?, ?)
ON CONFLICT(uuid, category) DO
	UPDATE SET candidate=excluded.candidate
`);
export function recordVote(uuid: string, category: number, candidate: number): void {
	_recordVote.run(uuid, category, candidate);
}

const _resetVotes = db.prepare(`
DELETE FROM votes
WHERE category = ?
`);
export function resetVotes(category: number): void {
	_resetVotes.run(category);
}
