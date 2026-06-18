(function bootDesignToolsInspector() {
  if (window.__designToolsInspectorLoaded) {
    return;
  }

  window.__designToolsInspectorLoaded = true;

  let active = false;
  let pinned = false;
  let currentElement = null;
  let pointerX = 16;
  let pointerY = 16;
  let root = null;
  let card = null;
  let measurementLayer = null;
  let gapLayer = null;
  let layers = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "design-tools:get-state") {
      sendResponse({ active });
      return;
    }

    if (message?.type === "design-tools:set-active") {
      setActive(Boolean(message.active));
      sendResponse({ active });
    }
  });

  function setActive(nextActive) {
    if (active === nextActive) {
      return;
    }

    active = nextActive;

    if (active) {
      mount();
      document.addEventListener("mousemove", handleMouseMove, true);
      document.addEventListener("mouseleave", handleFrameExit, true);
      document.addEventListener("mouseout", handleMouseOut, true);
      document.addEventListener("click", handleClick, true);
      document.addEventListener("scroll", handleViewportChange, true);
      window.addEventListener("blur", handleFrameExit);
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("keydown", handleKeyDown, true);
      return;
    }

    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("mouseleave", handleFrameExit, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("blur", handleFrameExit);
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("keydown", handleKeyDown, true);
    unmount();
    pinned = false;
    currentElement = null;
  }

  function mount() {
    if (root) {
      return;
    }

    root = document.createElement("div");
    root.className = "dt-inspector-root";
    root.hidden = true;

    layers = {
      margin: createLayer("margin"),
      border: createLayer("border"),
      padding: createLayer("padding"),
      content: createLayer("content"),
    };

    measurementLayer = document.createElement("div");
    gapLayer = document.createElement("div");

    card = document.createElement("div");
    card.className = "dt-inspector-card";

    root.append(layers.margin, layers.border, layers.padding, layers.content, gapLayer, measurementLayer, card);
    document.documentElement.append(root);
  }

  function unmount() {
    root?.remove();
    root = null;
    card = null;
    measurementLayer = null;
    gapLayer = null;
    layers = null;
  }

  function createLayer(name) {
    const layer = document.createElement("div");
    layer.className = `dt-inspector-layer dt-inspector-layer--${name}`;
    return layer;
  }

  function handleMouseMove(event) {
    if (pinned) {
      return;
    }

    inspectPoint(event.clientX, event.clientY);
  }

  function handleMouseOut(event) {
    if (!event.relatedTarget) {
      handleFrameExit();
    }
  }

  function handleFrameExit() {
    if (pinned) {
      return;
    }

    hideInspection();
  }

  function handleClick(event) {
    if (!currentElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pinned = !pinned;
    renderPanel(currentElement);
  }

  function handleViewportChange() {
    if (currentElement) {
      renderInspection(currentElement);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setActive(false);
    }
  }

  function inspectPoint(x, y) {
    pointerX = x;
    pointerY = y;
    inspectElement(document.elementFromPoint(x, y));
  }

  function inspectElement(element) {
    if (!(element instanceof Element) || root?.contains(element)) {
      return;
    }

    if (root) {
      root.hidden = false;
    }

    currentElement = element;
    renderInspection(element);
  }

  function hideInspection() {
    if (root) {
      root.hidden = true;
    }

    currentElement = null;
  }

  function renderInspection(element) {
    renderOverlay(element);
    renderPanel(element);
  }

  function renderOverlay(element) {
    if (!layers) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const margin = edges(style, "margin");
    const border = edges(style, "border", "Width");
    const padding = edges(style, "padding");
    const marginBox = {
      top: rect.top - margin.top,
      right: rect.right + margin.right,
      bottom: rect.bottom + margin.bottom,
      left: rect.left - margin.left,
    };
    const borderBox = rect;
    const paddingBox = {
      top: rect.top + border.top,
      right: rect.right - border.right,
      bottom: rect.bottom - border.bottom,
      left: rect.left + border.left,
    };
    const contentBox = {
      top: rect.top + border.top + padding.top,
      right: rect.right - border.right - padding.right,
      bottom: rect.bottom - border.bottom - padding.bottom,
      left: rect.left + border.left + padding.left,
    };

    setBox(layers.margin, marginBox);
    setBox(layers.border, borderBox);
    setBox(layers.padding, paddingBox);
    setBox(layers.content, contentBox);

    renderBoxMeasurements({ marginBox, borderBox, paddingBox, contentBox, margin, border, padding });
    renderSiblingGaps(element);
  }

  function renderBoxMeasurements({ marginBox, borderBox, paddingBox, contentBox, margin, border, padding }) {
    if (!measurementLayer) {
      return;
    }

    measurementLayer.replaceChildren();
    renderBandMeasurements(marginBox, borderBox, margin, "m", "margin");
    renderBandMeasurements(paddingBox, contentBox, padding, "p", "padding");

    if (Object.values(border).some((value) => value > 0)) {
      renderBandMeasurements(borderBox, paddingBox, border, "b", "border");
    }

    renderMeasurement(
      `${formatNumber(Math.max(0, contentBox.right - contentBox.left))} x ${formatNumber(Math.max(0, contentBox.bottom - contentBox.top))}`,
      boxCenter(contentBox),
      "content",
    );
  }

  function renderBandMeasurements(outerBox, innerBox, values, prefix, tone) {
    renderBandMeasurement(outerBox, innerBox, values.top, "top", prefix, tone);
    renderBandMeasurement(outerBox, innerBox, values.right, "right", prefix, tone);
    renderBandMeasurement(outerBox, innerBox, values.bottom, "bottom", prefix, tone);
    renderBandMeasurement(outerBox, innerBox, values.left, "left", prefix, tone);
  }

  function renderBandMeasurement(outerBox, innerBox, value, side, prefix, tone) {
    const point = value > 0 ? bandCenter(outerBox, innerBox, side) : measurementPoint(innerBox, side);
    renderMeasurement(`${prefix} ${formatNumber(value)}`, point, tone);
  }

  function renderMeasurement(text, point, tone) {
    if (!measurementLayer) {
      return;
    }

    const label = document.createElement("div");
    label.className = `dt-inspector-measure dt-inspector-measure--${tone}`;
    label.textContent = text;

    label.style.left = `${clamp(point.x, 28, window.innerWidth - 28)}px`;
    label.style.top = `${clamp(point.y, 10, window.innerHeight - 10)}px`;
    measurementLayer.append(label);
  }

  function bandCenter(outerBox, innerBox, side) {
    const outer = boxEdges(outerBox);
    const inner = boxEdges(innerBox);

    if (side === "top") {
      return { x: inner.left + (inner.right - inner.left) / 2, y: outer.top + (inner.top - outer.top) / 2 };
    }

    if (side === "right") {
      return { x: inner.right + (outer.right - inner.right) / 2, y: inner.top + (inner.bottom - inner.top) / 2 };
    }

    if (side === "bottom") {
      return { x: inner.left + (inner.right - inner.left) / 2, y: inner.bottom + (outer.bottom - inner.bottom) / 2 };
    }

    return { x: outer.left + (inner.left - outer.left) / 2, y: inner.top + (inner.bottom - inner.top) / 2 };
  }

  function boxCenter(box) {
    const edges = boxEdges(box);
    return {
      x: edges.left + (edges.right - edges.left) / 2,
      y: edges.top + (edges.bottom - edges.top) / 2,
    };
  }

  function measurementPoint(box, edge) {
    const { top, right, bottom, left } = boxEdges(box);
    const x = left + (right - left) / 2;
    const y = top + (bottom - top) / 2;

    if (edge === "top") {
      return { x, y: top };
    }

    if (edge === "right") {
      return { x: right, y };
    }

    if (edge === "bottom") {
      return { x, y: bottom };
    }

    return { x: left, y };
  }

  function boxEdges(box) {
    const left = "left" in box ? box.left : box.x;
    const top = "top" in box ? box.top : box.y;
    return {
      top,
      right: "right" in box ? box.right : left + box.width,
      bottom: "bottom" in box ? box.bottom : top + box.height,
      left,
    };
  }

  function renderSiblingGaps(element) {
    if (!gapLayer) {
      return;
    }

    gapLayer.replaceChildren();

    for (const gap of adjacentGaps(element)) {
      const gapElement = document.createElement("div");
      gapElement.className = "dt-inspector-gap";
      setBox(gapElement, gap);

      const label = document.createElement("div");
      label.className = "dt-inspector-gap__label";
      label.textContent = `${formatNumber(gap.value)} gap`;

      gapElement.append(label);
      gapLayer.append(gapElement);
    }
  }

  function adjacentGaps(element) {
    let candidate = element;

    while (candidate && candidate !== document.body && candidate !== document.documentElement) {
      const gaps = directAdjacentGaps(candidate);

      if (gaps.length > 0) {
        return gaps;
      }

      candidate = candidate.parentElement;
    }

    return [];
  }

  function directAdjacentGaps(element) {
    if (!element.parentElement) {
      return [];
    }

    const siblings = Array.from(element.parentElement.children).filter(isVisibleElement);
    const index = siblings.indexOf(element);

    if (index === -1) {
      return [];
    }

    return [siblings[index - 1], siblings[index + 1]]
      .filter(Boolean)
      .map((sibling) => gapBetween(element, sibling))
      .filter(Boolean);
  }

  function gapBetween(firstElement, secondElement) {
    const first = firstElement.getBoundingClientRect();
    const second = secondElement.getBoundingClientRect();
    const horizontalOverlap = Math.min(first.right, second.right) - Math.max(first.left, second.left);
    const verticalOverlap = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);

    if (first.bottom <= second.top && horizontalOverlap > 0) {
      return gapBox(first.bottom, second.top, Math.max(first.left, second.left), Math.min(first.right, second.right));
    }

    if (second.bottom <= first.top && horizontalOverlap > 0) {
      return gapBox(second.bottom, first.top, Math.max(first.left, second.left), Math.min(first.right, second.right));
    }

    if (first.right <= second.left && verticalOverlap > 0) {
      return gapBox(Math.max(first.top, second.top), Math.min(first.bottom, second.bottom), first.right, second.left);
    }

    if (second.right <= first.left && verticalOverlap > 0) {
      return gapBox(Math.max(first.top, second.top), Math.min(first.bottom, second.bottom), second.right, first.left);
    }

    return null;
  }

  function gapBox(top, bottom, left, right) {
    const width = right - left;
    const height = bottom - top;
    const value = Math.min(width, height);

    if (value < 1) {
      return null;
    }

    return { top, right, bottom, left, value };
  }

  function isVisibleElement(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(element).display !== "none";
  }

  function renderPanel(element) {
    if (!card) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const parentStyle = element.parentElement ? window.getComputedStyle(element.parentElement) : null;

    card.replaceChildren();
    card.append(
      header(element),
      section("Box", [
        ["Size", `${formatNumber(rect.width)} x ${formatNumber(rect.height)}`],
        ["Display", style.display],
        ["Position", style.position],
        ["Radius", style.borderRadius],
      ]),
      section("Spacing", [
        ["Margin", edgeSummary(style, "margin")],
        ["Padding", edgeSummary(style, "padding")],
        ["Border", edgeSummary(style, "border", "Width")],
        ["Gap", `${style.rowGap} row / ${style.columnGap} column`],
      ]),
      section("Typography", [
        ["Family", style.fontFamily],
        ["Size", style.fontSize],
        ["Weight", style.fontWeight],
        ["Line height", style.lineHeight],
        ["Letter spacing", style.letterSpacing],
      ]),
      section("Colors", [
        ["Text", swatch(style.color)],
        ["Background", swatch(style.backgroundColor)],
        ["Border", swatch(style.borderColor)],
      ]),
      section("Parent Layout", [
        ["Parent", element.parentElement ? selectorFor(element.parentElement) : "None"],
        ["Display", parentStyle?.display || "None"],
        ["Gap", parentStyle ? `${parentStyle.rowGap} row / ${parentStyle.columnGap} column` : "None"],
        ["Align", parentStyle ? `${parentStyle.alignItems} / ${parentStyle.justifyContent}` : "None"],
      ]),
    );

    positionCard();
  }

  function header(element) {
    const headerElement = document.createElement("div");
    headerElement.className = "dt-inspector-card__header";

    const selector = document.createElement("div");
    selector.className = "dt-inspector-card__selector";
    selector.textContent = selectorFor(element);

    const rect = element.getBoundingClientRect();
    const size = document.createElement("div");
    size.className = "dt-inspector-card__size";
    size.textContent = `${formatNumber(rect.width)} x ${formatNumber(rect.height)}`;

    const hint = document.createElement("div");
    hint.className = "dt-inspector-card__hint";
    hint.textContent = pinned ? "Click again to unpin. Esc turns the inspector off." : "Click to pin. Esc turns the inspector off.";

    headerElement.append(selector, size, hint);
    return headerElement;
  }

  function section(title, rows) {
    const sectionElement = document.createElement("div");
    sectionElement.className = "dt-inspector-card__section";

    const titleElement = document.createElement("div");
    titleElement.className = "dt-inspector-card__section-title";
    titleElement.textContent = title;

    sectionElement.append(titleElement);

    for (const [label, value] of rows) {
      const row = document.createElement("div");
      row.className = "dt-inspector-card__row";

      const labelElement = document.createElement("div");
      labelElement.className = "dt-inspector-card__label";
      labelElement.textContent = label;

      const valueElement = document.createElement("div");
      valueElement.className = "dt-inspector-card__value";

      if (value instanceof Node) {
        valueElement.append(value);
      } else {
        valueElement.textContent = value;
      }

      row.append(labelElement, valueElement);
      sectionElement.append(row);
    }

    return sectionElement;
  }

  function swatch(value) {
    const wrapper = document.createElement("span");
    const dot = document.createElement("span");
    dot.className = "dt-inspector-card__swatch";
    dot.style.background = value;
    wrapper.append(dot, document.createTextNode(value));
    return wrapper;
  }

  function positionCard() {
    const offset = 14;
    const rect = card.getBoundingClientRect();
    let left = pointerX + offset;
    let top = pointerY + offset;

    if (left + rect.width > window.innerWidth - 8) {
      left = pointerX - rect.width - offset;
    }

    if (top + rect.height > window.innerHeight - 8) {
      top = pointerY - rect.height - offset;
    }

    card.style.left = `${clamp(left, 8, window.innerWidth - rect.width - 8)}px`;
    card.style.top = `${clamp(top, 8, window.innerHeight - rect.height - 8)}px`;
  }

  function setBox(element, box) {
    const left = "left" in box ? box.left : box.x;
    const top = "top" in box ? box.top : box.y;
    const right = "right" in box ? box.right : left + box.width;
    const bottom = "bottom" in box ? box.bottom : top + box.height;

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${Math.max(0, right - left)}px`;
    element.style.height = `${Math.max(0, bottom - top)}px`;
  }

  function edges(style, prefix, suffix = "") {
    return {
      top: parsePixel(style[`${prefix}Top${suffix}`]),
      right: parsePixel(style[`${prefix}Right${suffix}`]),
      bottom: parsePixel(style[`${prefix}Bottom${suffix}`]),
      left: parsePixel(style[`${prefix}Left${suffix}`]),
    };
  }

  function edgeSummary(style, prefix, suffix = "") {
    const values = edges(style, prefix, suffix);
    return `${formatNumber(values.top)} / ${formatNumber(values.right)} / ${formatNumber(values.bottom)} / ${formatNumber(values.left)}`;
  }

  function parsePixel(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    return `${Math.round(value * 10) / 10}px`;
  }

  function selectorFor(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${CSS.escape(element.id)}` : "";
    const classes = Array.from(element.classList)
      .slice(0, 3)
      .map((className) => `.${CSS.escape(className)}`)
      .join("");
    return `${tag}${id}${classes}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }
})();
