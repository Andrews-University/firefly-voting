import { Event, Secret } from "../config";
export { Event, Secret } from "../config";

interface Socket {
	on(event: string, fn: Function): void;
	off(event: string, fn: Function): void;
	emit(event: string, ...args: any[]): void;
}

export const enum Command {
	OpenCategory = "open_category",
	CloseCategory = "close_category",
	NextCategory = "next_category",
	PrevCategory = "prev_category",
	ResetCategory = "reset_category"
}

export type EventType = {
	[Event.State]: { current_category: number, voting_is_open: boolean };
	[Event.Stats]: { category: number, votes: number[] };
	[Event.Info]: string;
	[Event.Signon]: Secret.MonitorSignon | Secret.AdminSignon;
	[Event.Admin]: Command;
	[Event.Vote]: { uuid: string, category: number, candidate: number };
}

export const ValidateEventMessage: { [E in Event]: (message: unknown) => message is EventType[E] } = {
	[Event.State](message: any): message is EventType[Event.State] {
		return typeof message === "object"
			&& "current_category" in message
			&& "voting_is_open" in message
			&& typeof message.current_category === "number"
			&& typeof message.voting_is_open === "boolean"
	},

	[Event.Stats](message: any): message is EventType[Event.Stats] {
		if(typeof message !== "object"
			|| !("category" in message)
			|| !("votes" in message)
			|| typeof message.category !== "number"
			|| !Array.isArray(message.votes)
			) return false;
		for(let tally of message.votes) {
			if(typeof tally !== "number") return false;
		}
		return true;
	},

	[Event.Info](message: unknown): message is EventType[Event.Info] {
		return typeof message === "string";
	},

	[Event.Signon](message: unknown): message is EventType[Event.Signon] {
		return typeof message === "string"
			&& (message === Secret.AdminSignon
				|| message === Secret.MonitorSignon
			)
	},

	[Event.Admin](message: unknown): message is EventType[Event.Admin] {
		return typeof message === "string"
			&& (message === Command.OpenCategory
				|| message === Command.CloseCategory
				|| message === Command.NextCategory
				|| message === Command.PrevCategory
				|| message === Command.ResetCategory
			)
	},

	[Event.Vote](message: any): message is EventType[Event.Vote] {
		return typeof message === "object"
			&& "uuid" in message
			&& "category" in message
			&& "candidate" in message
			&& typeof message.uuid === "string"
			&& typeof message.category === "number"
			&& typeof message.candidate === "number"
	}
};

const typedEventMap = new Map<(message: any) => any, (message: unknown) => any>();

/**
 * Add an event listener to the given socket. Malformed messages are discarded
 * entirely, no excess property check is performed on correctly shaped messages.
 */
export function onEvent<E extends Event>(socket: Socket, event: E, fn: (message: EventType[E]) => any) {
	const checker = (message: unknown) => {
		if(ValidateEventMessage[event](message)) return fn(message as EventType[E]);
		console.warn("Discarding malformed message", event, message);
	};
	typedEventMap.set(fn, checker)
	socket.on(event, checker);
}

export function emitEvent<E extends Event>(socket: Socket, event: E, message: EventType[E]) {
	socket.emit(event, message);
}
