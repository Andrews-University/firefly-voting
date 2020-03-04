import { socket } from './socket';
import { clientUUID } from './uuid';
import { Event, onEvent, emitEvent, Command } from '../../src/events';
import * as Surplus from "surplus"; Surplus;
import { Secret } from '../../config';
import { S } from 'surplus';
export { socket };

const messagelist = document.getElementById("messages")!;
export function log(...message: JSX.Child[]) {
	S.root((disposer) => {
		messagelist.appendChild(<li><time>{(new Date()).toISOString().replace('T', ' ')}</time>{message}</li>);
		disposer();
	})
	scrollTo(0, document.body.scrollHeight);
}

socket
	.on('connect', () => {
		log(<em>connect</em>);
		emitEvent(socket, Event.Signon, Secret.AdminSignon);
	})
	.on('connect_error', () => log(<em>connect_error</em>))
	.on('connect_timeout', () => log(<em>connect_timeout</em>))
	.on('error', () => log(<em>error</em>))
	.on('disconnect', () => log(<em>disconnect</em>))
	.on('reconnect', () => log(<em>reconnect</em>));



document.getElementById("open")!.addEventListener("click", () => emitEvent(socket, Event.Admin, Command.OpenCategory));
document.getElementById("close")!.addEventListener("click", () => emitEvent(socket, Event.Admin, Command.CloseCategory));
document.getElementById("next")!.addEventListener("click", () => emitEvent(socket, Event.Admin, Command.NextCategory));
document.getElementById("prev")!.addEventListener("click", () => emitEvent(socket, Event.Admin, Command.PrevCategory));
document.getElementById("reset")!.addEventListener("click", () => emitEvent(socket, Event.Admin, Command.ResetCategory));

onEvent(socket, Event.State, ({category, voting}) => {
	log(<b>State</b>, " = ", <b>category: </b>, category, " ", <b>voting: </b>, voting ? "true" : "false");
});

onEvent(socket, Event.Info, (message) => log(message));

onEvent(socket, Event.Vote, ({uuid, category, candidate}) => {
	log(<b>Vote</b>,` category ${category} for candidate #${candidate}   (`, <em>{uuid}</em>, `)`);
});

