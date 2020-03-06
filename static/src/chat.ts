import {socket} from './socket';

const form = document.getElementsByTagName("form")[0]!;
const message = form.elements[0] as HTMLInputElement;
form.addEventListener('submit', (e) => {
	e.preventDefault();
	socket.emit('chat_message', message.value);
	message.value = '';
});

const messagelist = document.getElementById("messages")!;
socket.on('chat_message', function (msg: string) {
	const node = document.createElement("li");
	node.innerText = msg;
	messagelist.appendChild(node);
});
