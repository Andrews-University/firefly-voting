export const SecretRoom = "d74c8beb-aa3b-49f6-9753-0b799d7b3a56";

export enum FireflyEvent {
	State = "state",
	Stats = "stats",
	Info = "info",
	Signon = "af2fa2cd-3eea-4667-9040-bbfa40f7d540",
	Admin = "admin",
	Vote = "vote",
}


export type FireflyEventMap = {
	"state": { current_category: number, voting_is_open: boolean };
	"stats": { category: number, votes: number[] };
	"info": string;
	"af2fa2cd-3eea-4667-9040-bbfa40f7d540": "helo" | "stats";
	"admin": "open_category" | "close_category" | "next_category" | "prev_category" | "reset_category" | "fatal_reset";
	"vote": { uuid: string, category: number, candidate: number };
};

export function onEvent<T extends keyof FireflyEventMap>(socket: any, id: T, fn: (message: FireflyEventMap[T]) => any): void;
export function onEvent(socket: any, id: FireflyEvent, fn: (message: any) => any) {
	socket.on(id, fn);
}

export function emitEvent<T extends keyof FireflyEventMap>(socket: any, id: T, message: FireflyEventMap[T]): void;
export function emitEvent(socket: any, id: FireflyEvent, message: unknown) {
	socket.emit(id, message);
}
