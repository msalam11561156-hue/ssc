/**
 * Ensures that an active table cell or input element is fully visible in its scrollable container.
 * Accurately handles:
 * 1. Vertical obstruction from sticky table headers (thead).
 * 2. Horizontal obstruction from sticky start columns (e.g. Serial, Student Name, Seat/Secret numbers)
 *    in both RTL and LTR modes.
 * 3. Scrollbar widths and safety margins.
 * 4. Window viewport boundaries so the entire active cell is in view.
 */
export const ensureCellVisible = (el: HTMLElement | null) => {
  if (!el) return;

  const run = () => {
    // 1. Find the nearest scrollable container
    let container: HTMLElement | null = el.parentElement;
    while (container && container !== document.body) {
      const style = window.getComputedStyle(container);
      const hasScroll = 
        (style.overflowY === 'auto' || style.overflowY === 'scroll' || 
         style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        (container.scrollHeight > container.clientHeight || container.scrollWidth > container.clientWidth);
      if (hasScroll) {
        break;
      }
      container = container.parentElement;
    }

    if (!container || container === document.body) {
      container = (el.closest('.overflow-auto') as HTMLElement) || el.parentElement;
    }
    if (!container || typeof container.getBoundingClientRect !== 'function') return;

    const td = (el.closest('td, th') as HTMLElement) || el;
    if (!td || typeof td.getBoundingClientRect !== 'function') return;
    const containerRect = container.getBoundingClientRect();
    const cellRect = td.getBoundingClientRect();

    const isRtl = window.getComputedStyle(container).direction === 'rtl' || document.dir === 'rtl';

    // 2. Vertical boundaries (sticky thead & container bottom)
    const thead = container.querySelector('thead');
    const theadBottom = thead ? thead.getBoundingClientRect().bottom : containerRect.top;
    const visibleTop = theadBottom + 6;
    const visibleBottom = containerRect.top + container.clientHeight - 6;

    let deltaY = 0;
    if (cellRect.top < visibleTop) {
      deltaY = cellRect.top - visibleTop; // negative: cell is hidden above or under thead, scroll up
    } else if (cellRect.bottom > visibleBottom) {
      deltaY = cellRect.bottom - visibleBottom; // positive: cell is cut off below, scroll down
    }

    if (deltaY !== 0) {
      container.scrollTop += deltaY;
    }

    // 3. Horizontal boundaries
    const isCellSticky = 
      td.classList.contains('sticky') || 
      td.classList.contains('sticky-col') || 
      window.getComputedStyle(td).position === 'sticky';

    if (!isCellSticky) {
      // Find all sticky columns in the table
      const stickyCols = container.querySelectorAll<HTMLElement>(
        'thead th.sticky-col, thead th[class*="sticky-col"], tbody tr:first-child td.sticky-col, tbody tr:first-child td[class*="sticky-col"]'
      );

      const scrollbarWidth = Math.max(0, container.offsetWidth - container.clientWidth);

      let deltaX = 0;

      if (isRtl) {
        // In RTL, sticky columns dock to the RIGHT (start-0).
        let minStickyLeft = containerRect.right;
        stickyCols.forEach(col => {
          const style = window.getComputedStyle(col);
          if (style.position === 'sticky') {
            const r = col.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.left < minStickyLeft && r.right > containerRect.left + 20) {
              minStickyLeft = r.left;
            }
          }
        });

        // Visible horizontal window in RTL:
        // Left side: container's left edge + vertical scrollbar (Chromium places scrollbar on left in RTL) + margin
        const visibleLeft = containerRect.left + scrollbarWidth + 14;
        // Right side: left boundary of sticky columns - margin
        const visibleRight = minStickyLeft - 14;

        if (cellRect.right > visibleRight) {
          // Cell is sliding UNDER sticky columns on the right!
          // We must scroll the container to the right (positive delta) so content shifts left
          deltaX = cellRect.right - visibleRight;
        } else if (cellRect.left < visibleLeft) {
          // Cell is cut off on the left edge!
          // We must scroll the container to the left (negative delta) so content shifts right
          deltaX = cellRect.left - visibleLeft;
        }
      } else {
        // In LTR, sticky columns dock to the LEFT (start-0).
        let maxStickyRight = containerRect.left;
        stickyCols.forEach(col => {
          const style = window.getComputedStyle(col);
          if (style.position === 'sticky') {
            const r = col.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.right > maxStickyRight && r.left < containerRect.right - 20) {
              maxStickyRight = r.right;
            }
          }
        });

        const visibleLeft = maxStickyRight + 14;
        const visibleRight = containerRect.left + container.clientWidth - 14;

        if (cellRect.left < visibleLeft) {
          // Cell is sliding UNDER sticky columns on the left!
          deltaX = cellRect.left - visibleLeft;
        } else if (cellRect.right > visibleRight) {
          // Cell is cut off on the right!
          deltaX = cellRect.right - visibleRight;
        }
      }

      if (deltaX !== 0) {
        const prevScrollLeft = container.scrollLeft;
        try {
          container.scrollBy({ left: deltaX, behavior: 'auto' });
        } catch {
          container.scrollLeft += deltaX;
        }
        if (container.scrollLeft === prevScrollLeft) {
          container.scrollLeft += deltaX;
        }
      }
    }

    // 4. Also check window / page viewport boundaries so cell isn't scrolled off the browser window
    const updatedCellRect = td.getBoundingClientRect();
    const winTop = 10;
    const winBottom = window.innerHeight - 10;
    if (updatedCellRect.bottom > winBottom && updatedCellRect.top > winTop) {
      window.scrollBy({ top: updatedCellRect.bottom - winBottom + 12, behavior: 'auto' });
    } else if (updatedCellRect.top < winTop && updatedCellRect.bottom < winBottom) {
      window.scrollBy({ top: updatedCellRect.top - winTop - 12, behavior: 'auto' });
    }
  };

  run();
  requestAnimationFrame(run);
  setTimeout(run, 35);
  setTimeout(run, 100);
};
