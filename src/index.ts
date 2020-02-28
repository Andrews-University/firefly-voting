import http from "http";
import express from "express";
import cors from "cors";
import path from 'path';
import socketio from 'socket.io';
import morgan from 'morgan';

const __dirname = path.resolve();

const { PORT = 8080 } = process.env;

const router = express();
const server = http.createServer(router);
const io = socketio(server, { path: "/firefly/socket.io" });

// We don't care who's accessing us, it's wide-open.
router.use(cors());
router.use(morgan('combined'));

router.use("/firefly", express.static("static"));

server.listen(PORT, () =>
  console.log(`Server is running http://localhost:${PORT}...`)
);

io.on('connection', function(socket){
	console.log('a user connected');
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});

	socket.on('chat message', function(msg){
		io.emit('chat message', msg);
	});
  });
