import io from "socket.io-client";

export const socket = io(location.origin, { path: "./socket.io" });
