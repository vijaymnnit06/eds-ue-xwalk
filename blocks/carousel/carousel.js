/**
 * Carousel Block
 *
 * Renders a slideshow carousel from Carousel Slide child items authored
 * in the Universal Editor.
 *
 * IMPORTANT — Universal Editor compatibility:
 * The UE injects data-aue-resource / data-aue-type / data-aue-model
 * attributes on every slide row (div > div > div). These attributes MUST
 * remain in the DOM so the UE can target them for in-context editing and
 * the Properties Rail. Therefore this decorator does NOT call
 * block.textContent = '' or remove any original rows. Instead it:
 *   1. Reads data from the existing instrumented cells.
 *   2. Hides the raw rows with a CSS class.
 *   3. Appends a new .carousel-slides + .carousel-controls layer.
 *
 * EDS cell layout per Carousel Slide row:
 *   row (div[data-aue-resource])
 *     ├─ cell 0 → image   (reference → <picture><img>)
 *     ├─ cell 1 → imageAlt (text)
 *     ├─ cell 2 → text     (text)
 *     ├─ cell 3 → link     (aem-content → <a href>)
 *     └─ cell 4 → linkText (text)
 */

const SLIDE_INTERVAL = 5000;

function goToSlide(block, index) {
  const slides = [...block.querySelectorAll('.carousel-slide')];
  const indicators = [...block.querySelectorAll('.carousel-indicator')];
  const total = slides.length;
  const target = (index + total) % total;

  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === target);
    slide.setAttribute('aria-hidden', i !== target ? 'true' : 'false');
  });

  indicators.forEach((dot, i) => {
    dot.classList.toggle('active', i === target);
    dot.setAttribute('aria-pressed', i === target ? 'true' : 'false');
  });

  block.dataset.currentSlide = target;
}

function getCurrentIndex(block) {
  return parseInt(block.dataset.currentSlide || '0', 10);
}

function startAutoPlay(block) {
  return setInterval(() => goToSlide(block, getCurrentIndex(block) + 1), SLIDE_INTERVAL);
}

export default function decorate(block) {
  // The direct children of the block are the slide rows.
  // Each row is a div potentially carrying data-aue-resource (injected by UE).
  const rows = [...block.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  // Step 1 — hide raw rows without removing them (preserves UE data-aue-* attrs)
  rows.forEach((row) => {
    row.classList.add('carousel-raw-row');
  });

  // Step 2 — build visual slides by READING (not moving) data from the raw rows
  const slidesWrapper = document.createElement('div');
  slidesWrapper.classList.add('carousel-slides');

  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];

    // Read image — EDS renders the DAM reference as a <picture> element
    const picture = cells[0]?.querySelector('picture');
    const imgEl = cells[0]?.querySelector('img');

    // Read alt text
    const altText = cells[1]?.textContent?.trim() || '';

    // Read slide text
    const slideText = cells[2]?.textContent?.trim() || '';

    // Read link href — aem-content renders as <a>; fallback to raw text
    const linkAnchor = cells[3]?.querySelector('a');
    const linkHref = linkAnchor?.href || cells[3]?.textContent?.trim() || '';

    // Read link label
    const linkText = cells[4]?.textContent?.trim()
      || linkAnchor?.textContent?.trim()
      || '';

    // Apply alt text to image
    if (imgEl && altText) imgEl.alt = altText;

    // Build slide
    const slide = document.createElement('div');
    slide.classList.add('carousel-slide');
    slide.setAttribute('aria-hidden', 'true');

    // Image container — clone the picture so the original stays in the raw row
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('carousel-slide-image');
    if (picture) {
      imageContainer.append(picture.cloneNode(true));
    } else if (imgEl) {
      imageContainer.append(imgEl.cloneNode(true));
    }
    slide.append(imageContainer);

    // Content overlay
    const content = document.createElement('div');
    content.classList.add('carousel-slide-content');

    if (slideText) {
      const p = document.createElement('p');
      p.classList.add('carousel-slide-text');
      p.textContent = slideText;
      content.append(p);
    }

    if (linkHref) {
      const a = document.createElement('a');
      a.classList.add('carousel-slide-link');
      a.href = linkHref;
      a.textContent = linkText || 'Learn More';
      a.setAttribute('aria-label', linkText || 'Learn More');
      content.append(a);
    }

    if (content.hasChildNodes()) slide.append(content);
    slidesWrapper.append(slide);
  });

  // Step 3 — build controls
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

  rows.forEach((_, i) => {
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
  });

  controls.append(prevBtn, indicators, nextBtn);

  // Step 4 — append new visual layer AFTER the hidden raw rows
  block.append(slidesWrapper, controls);

  // Step 5 — wire interactivity
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

  block.addEventListener('mouseenter', () => clearInterval(block.autoPlayTimer));
  block.addEventListener('mouseleave', () => { block.autoPlayTimer = startAutoPlay(block); });
  block.addEventListener('focusin', () => clearInterval(block.autoPlayTimer));
  block.addEventListener('focusout', () => { block.autoPlayTimer = startAutoPlay(block); });

  goToSlide(block, 0);
  block.autoPlayTimer = startAutoPlay(block);
}
