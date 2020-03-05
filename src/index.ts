import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import socketio, { Socket } from "socket.io";
import { Command, emitEvent, Event, EventType, onEvent, Secret } from "./events";
import { State, Stats } from "./state";

const __dirname = path.resolve();

const { PORT = 8080, BASE_PATH = "" } = process.env;

const router = express();

router.use(cors());
const staticOpts = {
	extensions: [ "html" ],
	index: [ "index.html" ],
};
router.get("/favicon.ico", (req, res) => res.redirect("img/favicon.png"));
router.use(`${BASE_PATH}/`, express.static(`${__dirname}/static/dist`, staticOpts));
router.use(`${BASE_PATH}/css`, express.static(`${__dirname}/static/css`, staticOpts));
router.use(`${BASE_PATH}/img`, express.static(`${__dirname}/static/img`, staticOpts));

const server = http.createServer(router);

const io = socketio(server, { path: `${BASE_PATH}/socket.io`, serveClient: false });
io.sockets.on("connect", handleConnect);

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
const monitors = (): socketio.Namespace => io.to(rooms.monitors);
const admins = (): socketio.Namespace => io.to(rooms.admins);

const throttledUpdateMonitorTally = throttle(100, updateMonitorTally);

server.listen(PORT, () => {
	console.log(`Server is running http://localhost:${PORT}...`);
});

/**
 * Handle a connect event and attach all of the necessary listeners to the
 * client. Usually called from the default namespace.
 */
function handleConnect(socket: Socket): void {
	emitEvent(socket, Event.State, State);

	onEvent(socket, Event.Signon, (msg) => handleSignon(socket, msg));
	onEvent(socket, Event.Vote, handleVote);
}

/**
 * Handle a Vote event emitted by a client. There's no authentication, so
 * it's up to the client not to lie about its identity.
 */
function handleVote({uuid, category, candidate}: EventType[Event.Vote]): void {
	if(category !== State.category || !State.voting) return;
	Stats.get(category).vote(uuid, candidate);
	emitEvent(admins(), Event.Vote, {uuid, category, candidate});

	throttledUpdateMonitorTally();
}

function updateMonitorTally(): void {
	const { category } = State;
	const votes = Stats.get(category);
	emitEvent(monitors(), Event.Stats, { category, votes });
}

/**
 * Handle a Signon event emitted by a client attempting to elevate its
 * privileges. The message is a shared secret.
 */
function handleSignon(socket: Socket, secret: EventType[Event.Signon]): void {
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
function handleAdmin(command: EventType[Event.Admin]): void {
	switch(command) {
		case Command.OpenCategory:
		case Command.CloseCategory:
			State.voting = (command === Command.OpenCategory);
			emitEvent(io.sockets, Event.State, State);
			break;
		case Command.NextCategory:
		case Command.PrevCategory:
			const delta = (command === Command.NextCategory ? 1 : -1);
			State.voting = false;
			State.category = Math.max(0, State.category + delta);

			emitEvent(io.sockets, Event.State, State);
			break;
		case Command.ResetCategory:
			const { category, voting } = State;
			const votes = Stats.get(category);
			votes.deleteAllVotes();

			// Force the clients to reset their selected vote
			if(voting) {
				emitEvent(io.sockets, Event.State, { category, voting: false });
				emitEvent(io.sockets, Event.State, { category, voting });
			}

			emitEvent(monitors(), Event.Stats, { category, votes: votes });
			break;
		default:
			info(`unknown command ${command}`);
	}
}

/**
 * Signon an admin client, joining it to the correct rooms and attaching
 * necessary listeners.
 */
function signonAdmin(socket: Socket): void {
	socket.join(rooms.admins);
	info("admin connected");

	onEvent(socket, Event.Admin, handleAdmin);
}

/**
 * Signon a monitor client, joining it to the correct rooms and attaching
 * necessary listeners.
 */
function signonMonitor(socket: Socket): void {
	socket.join(rooms.monitors);
	info("monitor connected");

	const { category } = State;
	const votes = Stats.get(category);
	emitEvent(socket, Event.Stats, { category, votes });
}

/**
 * Send an Event.Info to all attached admins.
 */
function info(message: string): void {
	emitEvent(admins(), Event.Info, message);
}

/**
 * Throttle calls to `fn` to at most one per every `onePerMS` milliseconds.
 */
function throttle(onePerMS: number, fn: () => any): () => void {
	let timer: object | undefined = void 0;
	let pending = false;

	return thunk;

	function thunk(): void {
		if(timer !== void 0) {
			pending = true;
		}
		else {
			pending = false;
			timer = setTimeout(timeout, onePerMS);
			fn();
		}

	}

	function timeout(): void {
		if(pending === true) {
			pending = false;
			timer = setTimeout(timeout, onePerMS);
			fn();
		}
		else {
			timer = void 0;
		}
	}
}
