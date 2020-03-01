import { socket } from "./socket";
import { FireflyEvent, onEvent, emitEvent } from "./events";

socket.on("connect", () => {
	emitEvent(socket, FireflyEvent.Signon, "stats");
});

const categories = Array.from(document.getElementsByClassName("firefly-category")) as HTMLElement[];

onEvent(socket, FireflyEvent.State, ({current_category, voting_is_open}) => {
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

onEvent(socket, FireflyEvent.Stats, ({category, votes}) => {
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
})

export { socket };





