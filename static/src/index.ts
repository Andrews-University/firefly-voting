import {socket} from './socket';
import {clientUUID} from "./uuid";
import { emitEvent, FireflyEvent, onEvent } from './events';

const categories = Array.from(document.getElementsByClassName("firefly-category")) as HTMLDivElement[];


onEvent(socket, FireflyEvent.State, ({current_category, voting_is_open}) => {
	categories.forEach((element) => {
		if(+(element.dataset.id || NaN) === current_category && voting_is_open) {
			element.classList.add("running");
		}
		else {
			element.classList.remove("running");
		}
	});
});

document.addEventListener("click", (ev) => {
	let target = ev.target! as Node;
	while(!(target instanceof HTMLElement) || !target.classList.contains("firefly-tile-liner")) {
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

	emitEvent(socket, FireflyEvent.Vote, { uuid: clientUUID, category: +category_id, candidate: +candidate_id });
});
