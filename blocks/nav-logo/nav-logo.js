/**
 * Nav Logo Block
 *
 * This block is used exclusively inside the /nav fragment page to define
 * a browsable logo image for the site header.
 *
 * The actual rendering is handled by buildNavLogo() in blocks/header/header.js,
 * which reads this block's cell content, builds a semantic <img> element, and
 * prepends it as the very first child of the <nav> element.
 *
 * This decorate() function intentionally hides the raw block markup so that
 * on a standalone /nav page preview (outside the header context) the unstyled
 * table structure is not visible.
 *
 * @param {HTMLElement} block - The nav-logo block element decorated by EDS
 */
export default function decorate(block) {
  // Hide the raw block on the /nav fragment page preview.
  // When rendered inside the header, header.js calls buildNavLogo() which
  // removes this block from the DOM entirely and replaces it with a clean
  // .nav-logo-wrapper <div> containing a single <img>.
  block.style.display = 'none';
}
