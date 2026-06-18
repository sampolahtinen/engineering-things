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
  let colorCanvasContext = null;
  let colorTokenCache = new WeakMap();
  let styleRuleCache = null;
  let inspectionFrame = null;

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
      colorTokenCache = new WeakMap();
      styleRuleCache = null;
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

    cancelPendingInspection();
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
    colorTokenCache = new WeakMap();
    styleRuleCache = null;
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

    pointerX = event.clientX;
    pointerY = event.clientY;

    if (inspectionFrame !== null) {
      return;
    }

    inspectionFrame = requestAnimationFrame(() => {
      inspectionFrame = null;
      inspectElement(document.elementFromPoint(pointerX, pointerY));
    });
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

    cancelPendingInspection();
    hideInspection();
  }

  function handleClick(event) {
    if (!currentElement || root?.contains(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pinned = !pinned;
    card?.classList.toggle("dt-inspector-card--pinned", pinned);
    renderPanel(currentElement);
  }

  function handleViewportChange(event) {
    if (event?.target && root?.contains(event.target)) {
      return;
    }

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

    if (currentElement === element) {
      positionCard();
      return;
    }

    currentElement = element;
    renderInspection(element);
  }

  function cancelPendingInspection() {
    if (inspectionFrame === null) {
      return;
    }

    cancelAnimationFrame(inspectionFrame);
    inspectionFrame = null;
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
        ["Text", colorValue(element, style.color, ["color"], true)],
        ["Background", colorValue(element, style.backgroundColor, ["background-color", "background"], false)],
        ["Border", colorValue(element, style.borderTopColor, ["border-color", "border-top-color", "border"], false)],
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
    const dot = document.createElement("span");
    dot.className = "dt-inspector-card__swatch";
    dot.style.background = value;
    return dot;
  }

  function colorValue(element, computedValue, propertyNames, inherited) {
    const wrapper = document.createElement("div");
    wrapper.className = "dt-inspector-card__color";

    const valueRow = document.createElement("div");
    valueRow.className = "dt-inspector-card__color-value";

    const hex = colorToHex(computedValue);
    valueRow.append(swatch(computedValue), document.createTextNode(hex));

    const token = colorTokenFor(element, propertyNames, inherited);
    const tokenRow = document.createElement("div");
    tokenRow.className = "dt-inspector-card__color-token";
    tokenRow.textContent = token || "No token";

    if (!token) {
      tokenRow.classList.add("dt-inspector-card__color-token--missing");
    }

    wrapper.append(valueRow, tokenRow);
    return wrapper;
  }

  function colorTokenFor(element, propertyNames, inherited) {
    const cacheKey = `${propertyNames.join("|")}:${inherited}`;
    const cachedTokens = colorTokenCache.get(element);

    if (cachedTokens?.has(cacheKey)) {
      return cachedTokens.get(cacheKey);
    }

    let candidate = element;

    while (candidate instanceof Element) {
      const declaration = bestColorDeclaration(candidate, propertyNames);

      if (declaration) {
        const token = tokenFromCssValue(declaration.value);

        if (token) {
          cacheColorToken(element, cacheKey, token);
          return token;
        }

        if (declaration.value.trim() !== "inherit") {
          cacheColorToken(element, cacheKey, null);
          return null;
        }
      }

      if (!inherited) {
        cacheColorToken(element, cacheKey, null);
        return null;
      }

      candidate = candidate.parentElement;
    }

    cacheColorToken(element, cacheKey, null);
    return null;
  }

  function cacheColorToken(element, cacheKey, token) {
    let cachedTokens = colorTokenCache.get(element);

    if (!cachedTokens) {
      cachedTokens = new Map();
      colorTokenCache.set(element, cachedTokens);
    }

    cachedTokens.set(cacheKey, token);
  }

  function bestColorDeclaration(element, propertyNames) {
    let best = null;
    let order = 0;

    for (const propertyName of propertyNames) {
      const value = element.style.getPropertyValue(propertyName);

      if (value) {
        best = betterDeclaration(best, {
          value,
          important: element.style.getPropertyPriority(propertyName) === "important",
          inline: true,
          specificity: Number.MAX_SAFE_INTEGER,
          order: Number.MAX_SAFE_INTEGER,
        });
      }
    }

    for (const rule of styleRulesFor(document.styleSheets)) {
      const specificity = matchingSpecificity(element, rule.selectorText);

      if (specificity === null) {
        order += 1;
        continue;
      }

      for (const propertyName of propertyNames) {
        const value = rule.style.getPropertyValue(propertyName);

        if (value) {
          best = betterDeclaration(best, {
            value,
            important: rule.style.getPropertyPriority(propertyName) === "important",
            inline: false,
            specificity,
            order,
          });
        }
      }

      order += 1;
    }

    return best;
  }

  function betterDeclaration(current, next) {
    if (!current) {
      return next;
    }

    if (next.important !== current.important) {
      return next.important ? next : current;
    }

    if (next.inline !== current.inline) {
      return next.inline ? next : current;
    }

    if (next.specificity !== current.specificity) {
      return next.specificity > current.specificity ? next : current;
    }

    return next.order >= current.order ? next : current;
  }

  function styleRulesFor(styleSheets) {
    if (styleRuleCache) {
      return styleRuleCache;
    }

    const rules = [];

    for (const styleSheet of styleSheets) {
      appendStyleRules(rules, styleSheet);
    }

    styleRuleCache = rules;
    return rules;
  }

  function appendStyleRules(rules, styleSheetOrRule) {
    let cssRules;

    try {
      cssRules = styleSheetOrRule.cssRules;
    } catch (_error) {
      return;
    }

    if (!cssRules) {
      return;
    }

    for (const rule of cssRules) {
      if (rule.type === CSSRule.STYLE_RULE) {
        rules.push(rule);
        continue;
      }

      appendStyleRules(rules, rule);
    }
  }

  function matchingSpecificity(element, selectorText) {
    let best = null;

    for (const selector of selectorText.split(",")) {
      const trimmedSelector = selector.trim();

      try {
        if (trimmedSelector && element.matches(trimmedSelector)) {
          const specificity = selectorSpecificity(trimmedSelector);
          best = best === null ? specificity : Math.max(best, specificity);
        }
      } catch (_error) {
        continue;
      }
    }

    return best;
  }

  function selectorSpecificity(selector) {
    const withoutStrings = selector.replace(/(['"]).*?\1/g, "");
    const ids = (withoutStrings.match(/#[\w-]+/g) || []).length;
    const classes = (withoutStrings.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g) || []).length;
    const elements = (withoutStrings.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:{1,2}[\w-]+(?:\([^)]*\))?/g, " ").match(/\b[a-zA-Z][\w-]*\b/g) || []).length;
    return ids * 10000 + classes * 100 + elements;
  }

  function tokenFromCssValue(value) {
    return value.match(/var\(\s*(--[\w-]+)/)?.[1] || null;
  }

  function colorToHex(value) {
    const parsed = rgbToHex(value);

    if (parsed) {
      return parsed;
    }

    try {
      colorCanvasContext ||= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      colorCanvasContext.canvas.width = 1;
      colorCanvasContext.canvas.height = 1;
      colorCanvasContext.clearRect(0, 0, 1, 1);
      colorCanvasContext.fillStyle = value;
      colorCanvasContext.fillRect(0, 0, 1, 1);

      const [red, green, blue, alpha] = colorCanvasContext.getImageData(0, 0, 1, 1).data;
      return rgbaToHex(red, green, blue, alpha / 255);
    } catch (_error) {
      return value;
    }
  }

  function rgbToHex(value) {
    const match = value.match(/^rgba?\((.+)\)$/i);

    if (!match) {
      return null;
    }

    const parts = match[1].includes(",")
      ? match[1].split(",").map((part) => part.trim())
      : match[1].split(/\s+\/\s+|\s+/).filter(Boolean);

    const red = Number.parseFloat(parts[0]);
    const green = Number.parseFloat(parts[1]);
    const blue = Number.parseFloat(parts[2]);
    const alpha = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]);

    if (![red, green, blue, alpha].every(Number.isFinite)) {
      return null;
    }

    return rgbaToHex(red, green, blue, alpha);
  }

  function rgbaToHex(red, green, blue, alpha) {
    const channels = [red, green, blue].map((channel) => clamp(Math.round(channel), 0, 255));
    const hex = channels.map((channel) => channel.toString(16).padStart(2, "0")).join("");

    if (alpha >= 1) {
      return `#${hex}`;
    }

    return `#${hex}${clamp(Math.round(alpha * 255), 0, 255).toString(16).padStart(2, "0")}`;
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
