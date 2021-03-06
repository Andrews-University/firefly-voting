import { getState, getVotes, recordVote, resetVotes, setState } from "./db";

/**
 * Default state variables.
 */
export const DefaultState = {
	category: 0,
	voting: false,
};
/**
 * Internal cache of the database state. We only persist to SQLite so that we
 * can seamlessly restore on restart.
 */
const cache: typeof DefaultState = {
	category: +(getState("category") ?? DefaultState.category),
	voting: !!(getState("voting") ?? DefaultState.voting),
};

/**
 * View of the state of the running application. Variable assignment will be
 * persisted to SQLite.
 */
export const State = {
	get category(): number {
		return cache.category;
	},
	set category(value: number) {
		const pickedValue = value || DefaultState.category;
		if(pickedValue === cache.category) return;
		setState("category", cache.category = pickedValue);
	},
	get voting(): boolean {
		return cache.voting;
	},
	set voting(value: boolean) {
		const pickedValue = value ?? DefaultState.voting;
		if(pickedValue === cache.voting) return;
		cache.voting = pickedValue;
		setState("voting", pickedValue ? 1 : 0);
	},
} as const;

/**
 * View of the recorded stats.
 */
export const Stats = new class Stats extends Map<number, CategoryStats> {
	get(key: number): CategoryStats {
		let value = super.get(key);
		if(value === void 0) {
			value = new CategoryStats(key);
			this.set(key, value);
		}
		return value;
	}
};

/**
 * View of the stats of a category.
 */
class CategoryStats extends Array<number | null | undefined> {
	votes!: { [key: string]: number | undefined };
	constructor(public category: number) {
		super();
		this.refresh();
	}

	/** Record a vote */
	vote(uuid: string, candidate: number): void {
		recordVote(uuid, this.category, candidate);

		// If the user had previously voted, rollback their
		// previous vote.
		const originalCandidate = this.votes[uuid];
		if(typeof originalCandidate === "number") {
			const originalSum = this[originalCandidate];
			if(originalSum == null) {
				console.warn(`category ${this.category} candidate ${originalCandidate} sum is null in transition vote`);
				this[originalCandidate] = 0;
			}
			else {
				this[originalCandidate] = originalSum - 1;
			}
		}

		// Record their vote
		this.votes[uuid] = candidate;

		// Update the tally
		const sum = this[candidate];
		if(sum == null) this[candidate] = 1;
		else this[candidate] = sum + 1;
	}

	/** Refresh the stats by reloading all data from the database */
	refresh(): void {
		const { votes, tally } = getVotes(this.category);
		this.votes = votes;
		Object.assign(this, tally, { length: tally.length });
	}

	/** Delete all votes from the category */
	deleteAllVotes(): void {
		this.length = 0;
		resetVotes(this.category);
		this.refresh();
	}
}
