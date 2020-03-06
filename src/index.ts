import http from "http";
import express from "express";
import cors from "cors";
import path from 'path';
import socketio from 'socket.io';
import morgan from 'morgan';
import { getState, setState, recordVote, resetVotes } from './db';
import { SecretRoom, FireflyEvent, emitEvent, onEvent } from "./events";

const __dirname = path.resolve();

const { PORT = 8080 } = process.env;

const router = express();
const server = http.createServer(router);
const io = socketio(server, { path: "/firefly/socket.io" });

const state = {
	voting_is_open: getState('voting_is_open'),
	current_category: getState('current_category')
};

// We don't care who's accessing us, it's wide-open.
router.use(cors());
//router.use(morgan('combined'));

router.use("/firefly", express.static("static"));

const monitors = () => io.to("monitor");
const admins = () => io.to(SecretRoom);

function joinMonitor(socket: socketio.Socket) {
	emitEvent(admins(), FireflyEvent.Info, "monitor connected");

}

function joinAdmin(socket: socketio.Socket) {
	socket.join(SecretRoom);
	emitEvent(admins(), FireflyEvent.Info, "admin connected");

	onEvent(socket, FireflyEvent.Admin, function handleAdminCommand(command) {
		if(command === "open_category" || command === "close_category") {
			state.voting_is_open = setState("voting_is_open", command === "open_category");
		}
		else if(command === "next_category" || command === "prev_category") {
			state.voting_is_open = setState("voting_is_open", false);

			state.current_category = state.current_category + (command === "next_category" ? 1 : -1);
			if(state.current_category < 0) state.current_category = 0;
			setState("current_category", state.current_category);
		}
		else if(command === "reset_category") {
			resetVotes(state.current_category);
		}

		emitEvent(io, FireflyEvent.State, state);
	});
}


io.on('connection', function(socket) {
	socket.on('reconnect', () => emitEvent(socket, FireflyEvent.State, state));
	socket.on('chat_message', function (msg) { io.emit('chat_message', msg) }); // Preserve functionality of chat.html
	socket.on('disconnect', () => emitEvent(admins(), FireflyEvent.Info, "user disconnected"));
	onEvent(socket, FireflyEvent.Signon, (kind) => kind === "helo" ? joinAdmin(socket) : kind === "stats" ? joinMonitor(socket) : null);
	onEvent(socket, FireflyEvent.Vote, function handleVote({uuid, category, candidate}) {
		if(category !== state.current_category || !state.voting_is_open) return;
		recordVote(uuid, category, candidate);
		emitEvent(admins(), FireflyEvent.Vote, {uuid, category, candidate});
	});

	emitEvent(socket, FireflyEvent.State, state);
});






server.listen(PORT, () =>
  console.log(`Server is running http://localhost:${PORT}...`)
);
