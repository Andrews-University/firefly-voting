import { Event, Secret } from "../config";
export { Event, Secret } from "../config";

/**
 * Primitive Socket interface that should be compatible with both client and
 * server socket.io Sockets.
 */
interface Socket {
	on(event: string, fn: Function): void;
	off(event: string, fn: Function): void;
	emit(event: string, ...args: any[]): void;
}

/**
 * Admin commands
 */
export const enum Command {
	OpenCategory = "open_category",
	CloseCategory = "close_category",
	NextCategory = "next_category",
	PrevCategory = "prev_category",
	ResetCategory = "reset_category"
}

/**
 * Map Events to their expected message type.
 */
export type EventType = {
	[Event.State]: { category: number, voting: boolean };
	[Event.Stats]: { category: number, votes: (number | null | undefined)[] };
	[Event.Info]: string;
	[Event.Signon]: Secret.MonitorSignon | Secret.AdminSignon;
	[Event.Admin]: Command;
	[Event.Vote]: { uuid: string, category: number, candidate: number };
}

/**
 * Utility functions which can validate whether or not the recieved message is
 * malformed for the given Event.
 */
export const ValidateEventMessage: { [E in Event]: (message: unknown) => message is EventType[E] } = {
	[Event.State](message: any): message is EventType[Event.State] {
		return typeof message === "object"
			&& "category" in message
			&& "voting" in message
			&& typeof message.category === "number"
			&& typeof message.voting === "boolean"
	},

	[Event.Stats](message: any): message is EventType[Event.Stats] {
		if(typeof message !== "object"
			|| !("category" in message)
			|| !("votes" in message)
			|| typeof message.category !== "number"
			|| !Array.isArray(message.votes)
			) return false;
		for(let tally of message.votes) {
			if(tally != null && typeof tally !== "number") return false;
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


/**
 * A map of user-functions to type-safe, wrapped user-functions that have been
 * attached as listeners to some event.
 */
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

/**
 * Emit a type-safe Event.
 *
 * @param socket Emit the event onto this socket.
 * @param event Event message
 */
export function emitEvent<E extends Event>(socket: Socket, event: E, message: EventType[E]) {
	socket.emit(event, message);
}
