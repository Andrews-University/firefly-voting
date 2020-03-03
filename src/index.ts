import cors from "cors";
import express from "express";
import http from "http";
import socketio, { Socket } from "socket.io";
import { getState, recordVote, resetVotes, setState, tallyVotes } from "./db";
import { Command, emitEvent, Event, EventType, onEvent, Secret } from "./events";

const { PORT = 8080 } = process.env;

const router = express();
router.use(cors());
router.use("/firefly", express.static("static"));

const server = http.createServer(router);

const io = socketio(server, { path: "/firefly/socket.io", serveClient: false });
io.sockets.on("connect", handleConnect);

server.listen(PORT, () => {
	console.log(`Server is running http://localhost:${PORT}...`);
});

/**
 * List of rooms that we're using
 */
const rooms = {
	monitors: "monitors",
	admins: "admins"
} as const;

/*
 * Accessors for specific rooms. Must be generated every time they are accessed.
 */
const monitors = () => io.to(rooms.monitors);
const admins = () => io.to(rooms.admins);

/**
 * State of the application.
 */
const state = {
	voting_is_open: getState("voting_is_open"),
	current_category: getState("current_category")
};

/**
 * Handle a connect event and attach all of the necessary listeners to the
 * client. Usually called from the default namespace.
 */
function handleConnect(socket: Socket) {
	emitEvent(socket, Event.State, state);

	onEvent(socket, Event.Signon, (msg) => handleSignon(socket, msg));
	onEvent(socket, Event.Vote, handleVote);
}

/**
 * Handle a Vote event emitted by a client. There's no authentication, so
 * it's up to the client not to lie about its identity.
 */
function handleVote({uuid, category, candidate}: EventType[Event.Vote]) {
	if(category !== state.current_category || !state.voting_is_open) return;
	recordVote(uuid, category, candidate);
	emitEvent(admins(), Event.Vote, {uuid, category, candidate});

	const votes = tallyVotes(category);
	emitEvent(monitors(), Event.Stats, { category, votes });
}

/**
 * Handle a Signon event emitted by a client attempting to elevate its
 * privileges. The message is a shared secret.
 */
function handleSignon(socket: Socket, secret: EventType[Event.Signon]) {
	if(secret === Secret.AdminSignon) {
		signonAdmin(socket);
	}
	else if(secret === Secret.MonitorSignon) {
		signonMonitor(socket);
	}
	else {
		info(`unknown signon ${secret}`);
	}
}

/**
 * Handle an Admin event emitted by a client. This should only be listened to
 * when emitted by clients in `rooms.admins`.
 */
function handleAdmin(command: EventType[Event.Admin]) {
	switch(command) {
		case Command.OpenCategory:
		case Command.CloseCategory:
			state.voting_is_open = setState("voting_is_open", command === "open_category");
			emitEvent(io.sockets, Event.State, state);
			break;
		case Command.NextCategory:
		case Command.PrevCategory:
			state.voting_is_open = setState("voting_is_open", false);

			state.current_category = state.current_category + (command === "next_category" ? 1 : -1);
			if(state.current_category < 0) state.current_category = 0;
			setState("current_category", state.current_category);
			emitEvent(io.sockets, Event.State, state);
			break;
		case Command.ResetCategory:
			resetVotes(state.current_category);
			// Force the clients to reset their selected vote
			emitEvent(io.sockets, Event.State, { current_category: state.current_category, voting_is_open: false });
			emitEvent(io.sockets, Event.State, state);

			const votes = tallyVotes(state.current_category);
			emitEvent(monitors(), Event.Stats, { category: state.current_category, votes });
			break;
		default:
			info(`unknown command ${command}`);
	}
}

/**
 * Signon an admin client, joining it to the correct rooms and attaching
 * necessary listeners.
 */
function signonAdmin(socket: Socket) {
	socket.join(rooms.admins);
	info("admin connected");

	onEvent(socket, Event.Admin, handleAdmin);
}

/**
 * Signon a monitor client, joining it to the correct rooms and attaching
 * necessary listeners.
 */
function signonMonitor(socket: Socket) {
	socket.join(rooms.monitors);
	info("monitor connected");


	const votes = tallyVotes(state.current_category);
	emitEvent(socket, Event.Stats, { category: state.current_category, votes });
}

/**
 * Send an Event.Info to all attached admins.
 */
function info(message: string) {
	emitEvent(admins(), Event.Info, message);
}

