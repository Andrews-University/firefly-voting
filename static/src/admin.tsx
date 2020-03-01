import { socket } from './socket';
import { clientUUID } from './uuid';
import { FireflyEvent, onEvent, emitEvent } from './events';
import * as Surplus from "surplus"; Surplus;

const messagelist = document.getElementById("messages")!;
export function log(...message: JSX.Child[]) {
	console.log(message);
	messagelist.appendChild(<li><time>{(new Date()).toISOString().replace('T', ' ')}</time>{message}</li>);
	window.scrollTo(0,90000000);
}

socket.on('connect', () => {
	log(<em>connect</em>);
	emitEvent(socket, FireflyEvent.Signon, "helo");
})
	.on('connect_error', () => log(<em>connect_error</em>))
	.on('connect_timeout', () => log(<em>connect_timeout</em>))
	.on('error', () => log(<em>error</em>))
	.on('disconnect', () => log(<em>disconnect</em>))
	.on('reconnect', () => log(<em>reconnect</em>));



document.getElementById("open")!.addEventListener("click", () => emitEvent(socket, FireflyEvent.Admin, "open_category"));
document.getElementById("close")!.addEventListener("click", () => emitEvent(socket, FireflyEvent.Admin, "close_category"));
document.getElementById("next")!.addEventListener("click", () => emitEvent(socket, FireflyEvent.Admin, "next_category"));
document.getElementById("prev")!.addEventListener("click", () => emitEvent(socket, FireflyEvent.Admin, "prev_category"));
document.getElementById("reset")!.addEventListener("click", () => emitEvent(socket, FireflyEvent.Admin, "reset_category"));

onEvent(socket, FireflyEvent.State, ({current_category, voting_is_open}) => {
	log(<b>State</b>, " = ", <b>current_category: </b>, current_category, " ", <b>voting_is_open: </b>, voting_is_open ? "true" : "false");
});

onEvent(socket, FireflyEvent.Info, (message) => log(message));

onEvent(socket, FireflyEvent.Vote, ({uuid, category, candidate}) => {
	log(<b>Vote</b>,` category ${category} for candidate #${candidate}   (`, <em>{uuid}</em>, `)`);
});

