import { getState, setState } from './db';

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
const cached_state: typeof DefaultState = {
	category: +(getState("category") ?? DefaultState.category),
	voting: !!(getState("voting") ?? DefaultState.voting),
};
/**
 * View of the state of the running application. Variable assignment will be
 * persisted to SQLite.
 */
export const State = {
	get category(): number {
		return cached_state.category;
	},
	set category(value: number) {
		const pickedValue = value || DefaultState.category;
		if(pickedValue === cached_state.category) return;
		setState("category", cached_state.category = pickedValue);
	},
	get voting(): boolean {
		return cached_state.voting;
	},
	set voting(value: boolean) {
		const pickedValue = value ?? DefaultState.voting;
		if(pickedValue === cached_state.voting) return;
		setState("voting", (cached_state.voting = pickedValue) ? 1 : 0);
	},
} as const;
