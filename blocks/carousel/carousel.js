/**
 * Carousel Block
 *
 * Renders a slideshow carousel from Carousel Slide child items.
 * Each slide is authored in the Universal Editor with:
 *   - image   (DAM asset reference → <picture>)
 *   - imageAlt (alt text string)
 *   - text    (slide caption / overlay text)
 *   - link    (AEM content path or external URL)
 *   - linkText (CTA label)
 *
 * DOM structure produced by EDS (one row per Carousel Slide item):
 *   <div class="carousel block">
 *     <div>                      ← slide row
 *       <div><picture/></div>    ← cell 0: image
 *       <div>alt text</div>      ← cell 1: imageAlt
 *       <div>slide text</div>    ← cell 2: text
 *       <div><a href>...</a></div> ← cell 3: link
 *       <div>link text</div>    ← cell 4: linkText
 *     </div>
 *     ...
 *   </div>
 *
 * Output structure after decorate():
 *   <div class="carousel block">
 *     <div class="carousel-slides">
 *       <div class="carousel-slide" aria-hidden="true/false">
 *         <div class="carousel-slide-image"><picture>...</picture></div>
 *         <div class="carousel-slide-content">
 *           <p class="carousel-slide-text">...</p>
 *           <a class="carousel-slide-link" href="...">Link Text</a>
 *         </div>
 *       </div>
 *       ...
 *     </div>
 *     <div class="carousel-controls">
 *       <button class="carousel-btn carousel-btn-prev" aria-label="Previous slide">&#10094;</button>
 *       <div class="carousel-indicators">
 *         <button class="carousel-indicator active" aria-label="Go to slide 1"></button>
 *         ...
 *       </div>
 *       <button class="carousel-btn carousel-btn-next" aria-label="Next slide">&#10095;</button>
 *     </div>
 *   </div>
 */

const SLIDE_INTERVAL = 5000; // ms between auto-advance

/**
 * Moves the carousel to a specific slide index.
 * @param {HTMLElement} block - The carousel block element
 * @param {number} index - Target slide index (0-based)
 */
function goToSlide(block, index) {
  const slides = [...block.querySelectorAll('.carousel-slide')];
  const indicators = [...block.querySelectorAll('.carousel-indicator')];
  const total = slides.length;

  // Wrap around
  const targetIndex = (index + total) % total;

  slides.forEach((slide, i) => {
    slide.setAttribute('aria-hidden', i !== targetIndex ? 'true' : 'false');
    slide.classList.toggle('active', i === targetIndex);
  });

  indicators.forEach((indicator, i) => {
    indicator.classList.toggle('active', i === targetIndex);
    indicator.setAttribute('aria-pressed', i === targetIndex ? 'true' : 'false');
  });

  // Store current index on the block for reference
  block.dataset.currentSlide = targetIndex;
}

/**
 * Returns the current active slide index.
 * @param {HTMLElement} block
 * @returns {number}
 */
function getCurrentIndex(block) {
  return parseInt(block.dataset.currentSlide || '0', 10);
}

/**
 * Starts the auto-play timer.
 * @param {HTMLElement} block
 * @returns {number} interval id
 */
function startAutoPlay(block) {
  return setInterval(() => {
    goToSlide(block, getCurrentIndex(block) + 1);
  }, SLIDE_INTERVAL);
}

/**
 * Decorates the carousel block.
 * @param {HTMLElement} block - The carousel block element
 */
export default function decorate(block) {
  // Collect raw slide rows from EDS table markup
  const rows = [...block.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  // Build slides wrapper
  const slidesWrapper = document.createElement('div');
  slidesWrapper.classList.add('carousel-slides');

  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];

    // Cell 0: image (EDS renders the DAM reference as a <picture> element)
    const imageCell = cells[0];
    // Cell 1: alt text (plain text string)
    const altText = cells[1]?.textContent?.trim() || '';
    // Cell 2: slide text / caption
    const slideText = cells[2]?.textContent?.trim() || '';
    // Cell 3: link (EDS renders aem-content as an <a> tag)
    const linkEl = cells[3]?.querySelector('a');
    const linkHref = linkEl?.href || cells[3]?.textContent?.trim() || '';
    // Cell 4: link text label
    const linkText = cells[4]?.textContent?.trim() || linkEl?.textContent?.trim() || '';

    // Fix alt text on the picture's img element if present
    const img = imageCell?.querySelector('img');
    if (img && altText) img.alt = altText;

    // Build slide element
    const slide = document.createElement('div');
    slide.classList.add('carousel-slide');
    slide.setAttribute('aria-hidden', 'true');

    // Image container
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('carousel-slide-image');
    if (imageCell) {
      // Move the picture/img from the raw cell into our container
      const picture = imageCell.querySelector('picture') || imageCell.querySelector('img');
      if (picture) imageContainer.append(picture);
    }
    slide.append(imageContainer);

    // Content overlay (text + link)
    const content = document.createElement('div');
    content.classList.add('carousel-slide-content');

    if (slideText) {
      const textEl = document.createElement('p');
      textEl.classList.add('carousel-slide-text');
      textEl.textContent = slideText;
      content.append(textEl);
    }

    if (linkHref) {
      const link = document.createElement('a');
      link.classList.add('carousel-slide-link');
      link.href = linkHref;
      link.textContent = linkText || 'Learn More';
      link.setAttribute('aria-label', linkText || 'Learn More');
      content.append(link);
    }

    if (content.hasChildNodes()) slide.append(content);

    slidesWrapper.append(slide);
  });

  // Build controls (prev button, indicators, next button)
  const controls = document.createElement('div');
  controls.classList.add('carousel-controls');

  const prevBtn = document.createElement('button');
  prevBtn.classList.add('carousel-btn', 'carousel-btn-prev');
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.innerHTML = '&#10094;';

  const nextBtn = document.createElement('button');
  nextBtn.classList.add('carousel-btn', 'carousel-btn-next');
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.innerHTML = '&#10095;';

  const indicators = document.createElement('div');
  indicators.classList.add('carousel-indicators');

  const slideCount = rows.length;
  for (let i = 0; i < slideCount; i += 1) {
    const dot = document.createElement('button');
    dot.classList.add('carousel-indicator');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.setAttribute('aria-pressed', 'false');
    dot.addEventListener('click', () => {
      clearInterval(block.autoPlayTimer);
      goToSlide(block, i);
      block.autoPlayTimer = startAutoPlay(block);
    });
    indicators.append(dot);
  }

  controls.append(prevBtn, indicators, nextBtn);

  // Clear the block and append clean markup
  block.textContent = '';
  block.append(slidesWrapper, controls);

  // Wire up prev / next buttons
  prevBtn.addEventListener('click', () => {
    clearInterval(block.autoPlayTimer);
    goToSlide(block, getCurrentIndex(block) - 1);
    block.autoPlayTimer = startAutoPlay(block);
  });

  nextBtn.addEventListener('click', () => {
    clearInterval(block.autoPlayTimer);
    goToSlide(block, getCurrentIndex(block) + 1);
    block.autoPlayTimer = startAutoPlay(block);
  });

  // Keyboard navigation (left/right arrows)
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      clearInterval(block.autoPlayTimer);
      goToSlide(block, getCurrentIndex(block) - 1);
      block.autoPlayTimer = startAutoPlay(block);
    } else if (e.key === 'ArrowRight') {
      clearInterval(block.autoPlayTimer);
      goToSlide(block, getCurrentIndex(block) + 1);
      block.autoPlayTimer = startAutoPlay(block);
    }
  });

  // Pause auto-play on hover / focus
  block.addEventListener('mouseenter', () => clearInterval(block.autoPlayTimer));
  block.addEventListener('mouseleave', () => {
    block.autoPlayTimer = startAutoPlay(block);
  });
  block.addEventListener('focusin', () => clearInterval(block.autoPlayTimer));
  block.addEventListener('focusout', () => {
    block.autoPlayTimer = startAutoPlay(block);
  });

  // Activate first slide and start auto-play
  goToSlide(block, 0);
  block.autoPlayTimer = startAutoPlay(block);
}
