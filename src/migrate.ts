import sqlite3 from 'better-sqlite3';

export function migrate(db: sqlite3.Database) {
	let user_version = db.pragma("user_version", { simple: true });

	if(user_version === 0) {
		migrate_from_0(db);
	}
	else if(user_version === 1) {
		console.info("user_version is current, migration finished");
	}
	else {
		throw new Error("user_version is more recent than the current version");
	}
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
	`)
	db.pragma("user_version = 1");
	migrate(db);
}
