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

	new Migration(
	/* up */`
	DELETE FROM state
	WHERE name = 'current_category' AND value = '0';

	DELETE FROM state
	WHERE name = 'voting_is_open' AND value = 'false';
	`,
	/* down */`
	INSERT INTO state
		(name, value)
	VALUES
		('current_category', '0'),
		('voting_is_open', 'false')
	ON CONFLICT IGNORE
	`),

	new Migration(
	/* up */`
		CREATE TABLE state_up (
			name    TEXT PRIMARY KEY,
			integer INTEGER NOT NULL
		);

		INSERT INTO state_up
		SELECT
			CASE name
			WHEN 'current_category' THEN 'category'
			WHEN 'voting_is_open' THEN 'voting'
			ELSE name
			END,
			CASE name
			WHEN 'current_category' THEN value
			WHEN 'voting_is_open' THEN
				CASE value
				WHEN 'true' THEN 1
				WHEN 'false' THEN 0
				ELSE 0
				END
			ELSE value
			END
		FROM state
		WHERE value IS NOT NULL;

		DROP TABLE state;

		ALTER TABLE state_up RENAME TO state;
	`,`
		CREATE TABLE state_down (
			name TEXT PRIMARY KEY,
			value TEXT
		);

		INSERT INTO state_down
		SELECT
			CASE name
			WHEN 'category' THEN 'current_category'
			WHEN 'voting' THEN 'voting_is_open'
			ELSE name
			END,
			CASE name
			WHEN 'voting' THEN
				CASE value
				WHEN 0 THEN 'false'
				ELSE 'true'
				END
			ELSE value
			END
		FROM state;

		DROP TABLE state;

		ALTER TABLE state_down RENAME TO state;
	`
	)
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

	const fixup = db.prepare(`UPDATE user_versions SET down = ? WHERE version = ?`);

	// Find the point of divergence between the set of applied and known migrations.
	let div = 0;
	for(; div < applied_migrations.length && div < migrations.length; div++) {
		if(applied_migrations[div].up !== migrations[div].up) break;
		else if(applied_migrations[div].down !== migrations[div].down) {
			fixup.run(migrations[div].down, div);
		}
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
SELECT integer FROM state WHERE name = ?
`).raw(true);

/**
 * Get the value of a state variable.
 *
 * @param name Name of the state variable.
 */
export function getState(name: string): number | undefined {
	const result = _getState.get(name);
	if(result == null) return undefined;
	const integer = result[0];
	if(typeof integer !== "number") throw new Error("invalid integer type");
	return integer;
}

const _setState = db.prepare(`
INSERT INTO state (name, integer)
VALUES (?, ?)
ON CONFLICT(name) DO
	UPDATE SET integer=excluded.integer
`);

/**
 * Set a state variable.
 *
 * @param name Name of the state variable
 * @param value Value of the state variable
 */
export function setState(name: string, value: number) {
	_setState.run(name, `${value}`);
}

const _recordVote = db.prepare(`
INSERT INTO votes (uuid, category, candidate)
VALUES (?, ?, ?)
ON CONFLICT(uuid, category) DO
	UPDATE SET candidate=excluded.candidate
`);

/**
 * Record a user's vote within a specific category for a specific candidate. If the
 * user has already voted, their vote will be replaced.
 *
 * @param uuid Unique identifier used to find conflicting votes
 * @param category Category the user has voted into.
 * @param candidate Candidate the user has voted for.
 */
export function recordVote(uuid: string, category: number, candidate: number): void {
	_recordVote.run(uuid, category, candidate);
}

const _resetVotes = db.prepare(`
DELETE FROM votes
WHERE category = ?
`);

/**
 * Reset the vote count for a given category by deleting all recorded votes.
 *
 * @param category Delete all votes from this category.
 */
export function resetVotes(category: number): void {
	_resetVotes.run(category);
}

const _getVotes = db.prepare(`
SELECT uuid, candidate
FROM votes
WHERE category = ?
`).raw(true);

export function getVotes(category: number): { votes: { [key: string]: number | undefined }, tally: (number | null | undefined)[] } {
	const votes: { [key: string]: number | undefined } = {};
	const tally: number[] = [];

	for(const [uuid, candidate] of _getVotes.iterate(category)) {
		votes[uuid] = candidate;

		const sum = tally[candidate];
		if(sum == null) tally[candidate] = 1;
		else tally[candidate] = sum + 1;
	}

	return { votes, tally };
}
