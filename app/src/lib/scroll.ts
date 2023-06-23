/**
 * * Scroll to bottom
 * This function scrolls a div to the bottom when new content is added
 * @param node HTML element to scroll
 * @param dependency List used as a dependency to trigger the scroll once items are added/removed
 * @return Function call to scroll
 */

export const scrollToBottom = (node: HTMLElement, dependency: Array<any>) => {
	const scroll = () =>
		node.scroll({
			top: node.scrollHeight,
			behavior: 'smooth'
		});
	scroll();

	return { update: scroll };
};
