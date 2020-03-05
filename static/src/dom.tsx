/**
 * Find the closest element matching the given class name by searching ancestors
 * of the selected node. The node itself is not checked.
 *
 * @param node Node to traverse the ancestors of
 * @param className Class to match against
 * @returns null if not found, otherwise a matching HTMLElement.
 */
export function closestElementByClassName(node: Node, className: string): HTMLElement | null {
	let target = node;
	do {
		if(!target.parentNode) return null;
		target = target.parentNode;
	}
	while(!(target instanceof HTMLElement) || !target.classList.contains(className));

	return target;
}

export function getDatasetNumber(element: HTMLElement, attribute: string): number | null {
	const value = element.dataset[attribute];
	if(typeof value !== "string") return null;
	const number = +value;
	if(number !== number) return null // filter out NaNs
	return number;
}
