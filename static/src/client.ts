import { emitEvent, Event, onEvent } from "../../src/events";
import { closestElementByClassName, getDatasetNumber } from "./dom";
import { socket } from "./socket";
import { clientUUID } from "./uuid";

const categories = Array.from(document.getElementsByClassName("firefly-category")) as HTMLElement[];

onEvent(socket, Event.State, ({ category, voting }) => {
	categories.forEach((element) => {
		if(getDatasetNumber(element, "id") === category && voting) {
			element.classList.add("running");
		}
		else {
			element.classList.remove("running", "voted");

			// When we *switch* categories, we reset the selected vote.
			// The client sometimes reconnects, and will receive a new State event
			// but without changeing category.
			const tiles = Array.from(element.getElementsByClassName("firefly-tile")) as HTMLElement[];
			tiles.forEach((tile) => tile.classList.remove("vote"));
		}
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

	Array.from(categoryElement.getElementsByClassName("firefly-tile")).forEach((element) => {
		element.classList.remove("vote");
	});

	categoryElement.classList.add("voted");
	tileElement.classList.add("vote");

	emitEvent(socket, Event.Vote, { uuid: clientUUID, category, candidate });
});

export { socket };
