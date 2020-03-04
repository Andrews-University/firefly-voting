import io from "socket.io-client";
import parse from "url-parse";

const base = parse(document.baseURI || location.toString());

export const manager = io.Manager(base.origin, {
	path: `${base.pathname.replace(/\/[^/]+$/, "/")}socket.io`
});

export const socket = manager.socket("/");
