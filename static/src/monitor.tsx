import { socket } from "./socket";
import { Event, onEvent, emitEvent } from "../src/events";
import { generate } from './uuid';
import { Secret } from '@config';

socket.on("connect", () => {
	emitEvent(socket, Event.Signon, Secret.MonitorSignon);
});

const categories = Array.from(document.getElementsByClassName("firefly-category")) as HTMLElement[];

onEvent(socket, Event.State, ({current_category, voting_is_open}) => {
	categories.forEach((element) => {
		console.log(element, element.dataset.id);
		if(+(element.dataset.id || NaN) === current_category) {
			element.classList.add("running");
		}
		else {
			element.classList.remove("running");
		}
	});
});

onEvent(socket, Event.Stats, ({category, votes}) => {
	const selected = categories.find((element) => +(element.dataset.id || NaN) === category);
	if(!selected) { return }

	console.log("got", votes);

	const tiles = Array.from(selected.getElementsByClassName("firefly-tile")) as HTMLElement[];
	tiles.forEach((tile, i) => {
		let tally = i < votes.length ? votes[i] : 0;
		tile.style.flexGrow = `${tally + 1}`;
		const value = tile.getElementsByClassName("firefly-tile-counter-value")[0]! as HTMLElement;
		value.innerText = `${tally}`;
	});
});



document.addEventListener("click", (ev) => {
	let target = ev.target! as Node;
	while(!(target instanceof HTMLElement) || !target.classList.contains("firefly-tile")) {
		if(!target.parentNode) {
			console.warn("could not find parent", ev.target);
			return;
		}

		target = target.parentNode;
	}
	ev.preventDefault();

	const candidate_id = target.dataset.id;
	if(typeof candidate_id !== "string") {
		console.warn("could not find candidate_id", target);
		return;
	}

	let categoryTarget = target as Node;
	while(!(categoryTarget instanceof HTMLElement) || !categoryTarget.classList.contains("firefly-category")) {
		if(!categoryTarget.parentNode) {
			console.warn("could not find category parent", target);
			return;
		}

		categoryTarget = categoryTarget.parentNode;
	}

	const category_id = categoryTarget.dataset.id;
	if(typeof category_id !== "string") {
		console.warn("could not find category_id", target);
		return;
	}

	emitEvent(socket, Event.Vote, { uuid: generate(), category: +category_id, candidate: +candidate_id });
});

export { socket };





