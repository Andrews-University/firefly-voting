import http from "http";
import express from "express";
import cors from "cors";
import path from "path";
import socketio from "socket.io";
import morgan from "morgan";
import { getState, setState, recordVote, resetVotes, tallyVotes } from "./db";
import { Event, Secret, emitEvent, onEvent } from "./events";

const __dirname = path.resolve();

const { PORT = 8080 } = process.env;

const router = express();
const server = http.createServer(router);
const io = socketio(server, { path: "/firefly/socket.io", serveClient: false });

const state = {
	voting_is_open: getState("voting_is_open"),
	current_category: getState("current_category")
};

// We don't care who's accessing us, it's wide-open.
router.use(cors());
//router.use(morgan("combined"));

router.use("/firefly", express.static("static"));

const monitors = () => io.to("monitor");
const admins = () => io.to("admin");

function joinMonitor(socket: socketio.Socket) {
	socket.join("monitor");
	emitEvent(admins(), Event.Info, "monitor connected");
	const votes = tallyVotes(state.current_category);
	emitEvent(socket, Event.Stats, { category: state.current_category, votes });

}

function joinAdmin(socket: socketio.Socket) {
	socket.join("admin");
	emitEvent(admins(), Event.Info, "admin connected");

	onEvent(socket, Event.Admin, function handleAdminCommand(command) {
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
			// Force the clients to reset their selected vote
			emitEvent(io.sockets, Event.State, { current_category: state.current_category, voting_is_open: false });
		}

		emitEvent(io.sockets, Event.State, state);
		const votes = tallyVotes(state.current_category);
		emitEvent(monitors(), Event.Stats, { category: state.current_category, votes });
	});
}


io.on("connection", function(socket) {
	socket.on("reconnect", () => emitEvent(socket, Event.State, state));
	socket.on("chat_message", function (msg) { io.emit("chat_message", msg) }); // Preserve functionality of chat.html
	onEvent(socket, Event.Signon, (secret) => secret === Secret.AdminSignon ? joinAdmin(socket) : secret === Secret.MonitorSignon ? joinMonitor(socket) : null);
	onEvent(socket, Event.Vote, function handleVote({uuid, category, candidate}) {
		if(category !== state.current_category || !state.voting_is_open) return;
		recordVote(uuid, category, candidate);
		emitEvent(admins(), Event.Vote, {uuid, category, candidate});

		const votes = tallyVotes(category);
		emitEvent(monitors(), Event.Stats, { category, votes });
	});

	emitEvent(socket, Event.State, state);
});

io.on






server.listen(PORT, () =>
  console.log(`Server is running http://localhost:${PORT}...`)
);
