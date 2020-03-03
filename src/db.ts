import sqlite3 from 'better-sqlite3';
export const db = sqlite3("firefly.sqlite3");

class Migration {
	readonly up: string;
	readonly down: string;
	constructor(up: string, down: string) {
		this.up = Migration.unindent(up);
		this.down = Migration.unindent(down);
	}

	static unindent(multiline: string) {
		const ws = (/^(?:\s*\n)?([^\S\n]+)/.exec(multiline) || [])[1];
		if(!ws) return multiline;
		return multiline
			.replace(new RegExp(`^${ws}`, "gm"), "")
			.replace(/^\s*|\s*$/, "");
	}
}

/*
 * CAUTION: Changing any existing migration will cause *ALL* suceeding
 * migrations to be rolled back and then reapplied to the database. This
 * has to potential to cause *MASSIVE* amounts of data-loss.
 *
 * Only make changes to the *FINAL* migration if possible, and the only
 * during development. If you need to make changes to the database
 * sturcture, write a *NEW* migration.
 */
perform_migration(db,
	new Migration(
	/* up */`
	CREATE TABLE state (
		name TEXT PRIMARY KEY,
		value TEXT
	);

	INSERT INTO state
		(name, value)
	VALUES
		('current_category', '0');
	`,
	/* down */`
	DROP TABLE state;
	`),


	new Migration(
	/* up */`
	INSERT INTO state
		(name, value)
	VALUES
		('voting_is_open', 'false');
	`,
	/* down */`
	DELETE FROM state
	WHERE name = 'voting_is_open';
	`),


	new Migration(
	/* up */`
	CREATE TABLE votes (
		uuid TEXT,
		category NUMBER,
		candidate NUMBER,
		PRIMARY KEY (uuid, category)
	);
	`,
	/* down */`
	DROP TABLE votes;
	`),
);


/**
 * Perform the `migrations` to bring the database into compliance with the
 * currently running application.
 *
 * This can be a very destructive process if the database's migration set
 * diverges from the current `migrations`. Migrations that have been applied
 * to the data that diverge from the known migrations will be rolled back,
 * with potential destructive side-effects.
 *
 * This trade-off has been selected, because it is more important that this
 * application *run* than it is to preserve data that is either corrupt
 * or in an incompatible shape.
 *
 */
function perform_migration(db: sqlite3.Database, ...migrations: Migration[]) {
	db.exec(`
	CREATE TABLE IF NOT EXISTS user_versions (
		version  INTEGER NOT NULL PRIMARY KEY,
		up       TEXT NOT NULL,
		down     TEXT NOT NULL
	);
	`);

	const applied_migrations: { version: number, up: string, down: string, lossless: number }[]
		= db.prepare(`SELECT version, up, down FROM user_versions ORDER BY version ASC`).all();

	// Find the point of divergence between the set of applied and known migrations.
	let div = 0;
	for(; div < applied_migrations.length && div < migrations.length; div++) {
		if(applied_migrations[div].up !== migrations[div].up) break;
	}

	const record = db.prepare(`INSERT INTO user_versions (version, up, down) VALUES (?, ?, ?)`);
	const unrecord = db.prepare(`DELETE FROM user_versions WHERE version = ?`);

	// If the known migrations diverge from the applied migrations
	if(div < applied_migrations.length) {
		// Rollback the applied migrations
		for(let i = applied_migrations.length - 1; div <= i; i--) {
			console.warn(`Rolling back migration ${i}:\n${applied_migrations[i].down}`);
			db.exec("BEGIN");
			try {
				db.exec(applied_migrations[i].down);
				unrecord.run(applied_migrations[i].version);
				db.pragma(`user_version = ${i}`);
				db.exec("COMMIT");
			}
			catch (err) {
				db.exec("ROLLBACK");
				throw err;
			}
		}
	}

	// Apply the new migrations
	for(let i = div; i < migrations.length; i++) {
		console.warn(`Applying migration ${i}:\n${migrations[i].up}`);
		db.exec("BEGIN");
		try {
			db.exec(migrations[i].up);
			record.run(i, migrations[i].up, migrations[i].down);
			db.pragma(`user_version = ${i}`);
			db.exec("COMMIT");
		}
		catch(err) {
			db.exec("ROLLBACK");
			throw err;
		}
	}
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

const _tallyVotes = db.prepare(`
SELECT candidate, COUNT(uuid) AS tally
FROM votes
WHERE category = ?
GROUP BY candidate
`);
export function tallyVotes(category: number): number[] {
	const candidates: { candidate: number, tally: number }[] = _tallyVotes.all(category);

	let max = 0;
	const map: Record<number, number> = {};
	for(const row of candidates) {
		map[row.candidate] = row.tally;
		if(row.candidate > max) max = +row.candidate;
	}

	const votes = new Array<number>(max);
	for(let i = 0; i <= max; i++) {
		votes[i] = +map[i] || 0;
	}

	return votes;
}
