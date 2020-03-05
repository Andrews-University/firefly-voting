import { closestElementByClassName, getDatasetNumber } from "dom";
import { Secret } from "../../config";
import { emitEvent, Event, onEvent } from "../../src/events";
import { socket } from "./socket";
import { generate } from "./uuid";

const categories = Array.from(document.getElementsByClassName("firefly-category")) as HTMLElement[];

socket.on("connect", () => {
	emitEvent(socket, Event.Signon, Secret.MonitorSignon);
});

onEvent(socket, Event.State, ({ category }) => {
	categories.forEach((element) => {
		if(+(element.dataset.id || NaN) === category) {
			element.classList.add("running");
		}
		else {
			element.classList.remove("running");
		}
	});
});

onEvent(socket, Event.Stats, ({ category, votes }) => {
	const selected = categories.find((element) => +(element.dataset.id || NaN) === category);
	if(!selected) { return; }

	const tiles = Array.from(selected.getElementsByClassName("firefly-tile")) as HTMLElement[];
	tiles.forEach((tile, i) => {
		const tally = i < votes.length ? votes[i] ?? 0 : 0;
		tile.style.flexGrow = `${tally + 1}`;
		const value = tile.getElementsByClassName("firefly-tile-counter-value")[0] as HTMLElement | null;
		if(value === null) return;
		value.innerText = `${tally}`;
	});
});

document.addEventListener("click", (ev) => {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const tileElement = closestElementByClassName(ev.target! as Node, "firefly-tile");
	if(tileElement === null) return;
	ev.preventDefault();

	const categoryElement = closestElementByClassName(tileElement, "firefly-category");
	if(categoryElement === null) return console.warn("found firefly-tile outside of firefly-category", tileElement);

	const candidate = getDatasetNumber(tileElement, "id");
	if(candidate === null) return console.warn("missing data-id attribute on", tileElement);

	const category = getDatasetNumber(categoryElement, "id");
	if(category === null) return console.warn("missing data-id attribute on", categoryElement);

	emitEvent(socket, Event.Vote, { uuid: generate(), category, candidate });
});

export { socket };
