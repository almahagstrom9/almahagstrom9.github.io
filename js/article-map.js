const articleStateIdToName = {
  1: "Alabama",
  2: "Alaska",
  4: "Arizona",
  5: "Arkansas",
  6: "California",
  8: "Colorado",
  9: "Connecticut",
  10: "Delaware",
  11: "District of Columbia",
  12: "Florida",
  13: "Georgia",
  15: "Hawaii",
  16: "Idaho",
  17: "Illinois",
  18: "Indiana",
  19: "Iowa",
  20: "Kansas",
  21: "Kentucky",
  22: "Louisiana",
  23: "Maine",
  24: "Maryland",
  25: "Massachusetts",
  26: "Michigan",
  27: "Minnesota",
  28: "Mississippi",
  29: "Missouri",
  30: "Montana",
  31: "Nebraska",
  32: "Nevada",
  33: "New Hampshire",
  34: "New Jersey",
  35: "New Mexico",
  36: "New York",
  37: "North Carolina",
  38: "North Dakota",
  39: "Ohio",
  40: "Oklahoma",
  41: "Oregon",
  42: "Pennsylvania",
  44: "Rhode Island",
  45: "South Carolina",
  46: "South Dakota",
  47: "Tennessee",
  48: "Texas",
  49: "Utah",
  50: "Vermont",
  51: "Virginia",
  53: "Washington",
  54: "West Virginia",
  55: "Wisconsin",
  56: "Wyoming"
};

// Article embed settings
const articleMapConfig = {
  indicator: "Adults who usually or always feel lonely",
  timeLabel: "Aug 20 - Sep 16, 2024",
  state: "Maryland",
  width: 960,
  height: 440,
  margin: { top: 10, right: 10, bottom: 10, left: 10 }
};

// Short labels for the small fingerprint chart
const articleFingerprintLabels = new Map([
  ["Adults who attend church or religious services less than four times per year", "Religion"],
  ["Adults who attend meetings of clubs or organizations less than once a week", "Clubs"],
  ["Adults who attend meetings of clubs or organizations less than three times per year, or never attend", "Community"],
  ["Adults who get together with friends or relatives less than three times in a typical week", "Friends"],
  ["Adults who sometimes, rarely, or never get the social and emotional support they need", "Support"],
  ["Adults who sometimes, usually, or always feel lonely", "Lonely"],
  ["Adults who usually or always feel lonely", "Lonely"],
  ["Adults who talk on the telephone with family, friends, or neighbors less than three times in a typical week", "Calls"],
  ["Adults who text or message with family, friends, or neighbors less than three times in a typical week", "Texts"]
]);
const articleFingerprintOrder = Array.from(articleFingerprintLabels.keys());

const articleMapRoot = d3.select("#articleChoroplethMap");
const articleLegendRoot = d3.select("#articleChoroplethLegend");
const articleTrendRoot = d3.select("#articleTrend");
const articleFingerprintRoot = d3.select("#articleFingerprint");
const articleTooltip = d3
  .select("body")
  .append("div")
  .attr("id", "articleMapTooltip")
  .attr("role", "tooltip")
  .attr("aria-hidden", "true")
  .attr("class", "article-map-tooltip");
const articleTheme = getArticleThemeTokens();

// Load the same data used by the full atlas
Promise.all([
  d3.csv("data/Lack_of_Social_Connection_20260429.csv"),
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
]).then(([rows, usTopo]) => {
  const normalizedRows = rows.map(normalizeArticleRow);
  const stateRows = normalizedRows
    .filter(
      d =>
        d.indicator === articleMapConfig.indicator &&
        d.groupType === "state" &&
        d.timeLabel === articleMapConfig.timeLabel &&
        Number.isFinite(d.value)
    );

  const valuesByState = new Map(stateRows.map(d => [d.stateKey, d]));
  const values = stateRows.map(d => d.value);
  const [minValue, maxValue] = d3.extent(values);
  const color = d3
    .scaleSequential(t => d3.interpolateBlues(0.18 + t * 0.72))
    .domain([minValue || 0, maxValue || 1]);

  const statesGeo = topojson.feature(usTopo, usTopo.objects.states).features;
  statesGeo.forEach(feature => {
    feature.properties = feature.properties || {};
    feature.properties.name = articleStateIdToName[+feature.id] || "Unknown";
    feature.properties.nameKey = normalizeArticleStateName(feature.properties.name);
  });

  drawArticleMap(statesGeo, valuesByState, color);
  drawArticleLegend(minValue || 0, maxValue || 1, color);
  drawArticleTrend(normalizedRows);
  drawArticleFingerprint(normalizedRows);
});

function drawArticleMap(statesGeo, valuesByState, color) {
  // Small choropleth inside the story
  const { width, height, margin } = articleMapConfig;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = articleMapRoot
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const projection = d3.geoAlbersUsa().fitSize([innerWidth, innerHeight], {
    type: "FeatureCollection",
    features: statesGeo
  });
  const path = d3.geoPath(projection);

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .selectAll("path")
    .data(statesGeo)
    .join("path")
    .attr("class", "article-choropleth-state")
    .attr("d", path)
    .attr("fill", d => {
      const row = valuesByState.get(d.properties.nameKey);
      return row ? color(row.value) : articleTheme.mapEmpty;
    })
    .on("mousemove", (event, d) => {
      const row = valuesByState.get(d.properties.nameKey);
      showArticleTooltip(event, buildArticleMapTooltip(d.properties.name, row));
    })
    .on("mouseleave", () => {
      articleTooltip.style("display", "none").attr("aria-hidden", "true");
    });
}

function drawArticleLegend(minValue, maxValue, color) {
  // Legend for the article map
  const width = 960;
  const height = 64;

  const svg = articleLegendRoot
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const defs = svg.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", "article-legend-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  gradient
    .selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .join("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => color(minValue + d * (maxValue - minValue)));

  svg
    .append("text")
    .attr("x", 36)
    .attr("y", 15)
    .attr("fill", articleTheme.muted)
    .attr("font-size", 13)
    .attr("font-weight", 500)
    .text("Lower Disconnection");

  svg
    .append("text")
    .attr("x", 924)
    .attr("y", 15)
    .attr("fill", articleTheme.muted)
    .attr("font-size", 13)
    .attr("font-weight", 500)
    .attr("text-anchor", "end")
    .text("Higher disconnection");

  svg
    .append("rect")
    .attr("x", 36)
    .attr("y", 25)
    .attr("width", 888)
    .attr("height", 13)
    .attr("rx", 6.5)
    .attr("fill", "url(#article-legend-gradient)");

  svg
    .append("text")
    .attr("x", 36)
    .attr("y", 58)
    .attr("fill", articleTheme.muted)
    .attr("font-size", 12)
    .attr("font-weight", 500)
    .text(`${minValue.toFixed(1)}%`);

  svg
    .append("text")
    .attr("x", 924)
    .attr("y", 58)
    .attr("fill", articleTheme.muted)
    .attr("font-size", 12)
    .attr("font-weight", 500)
    .attr("text-anchor", "end")
    .text(`${maxValue.toFixed(1)}%`);
}

function drawArticleTrend(rows) {
  // Maryland vs. national line chart
  if (articleTrendRoot.empty()) return;

  const width = 760;
  const height = 330;
  const margin = { top: 48, right: 28, bottom: 42, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const nationalColor = articleTheme.accent;
  const stateColor = articleTheme.primary;

  const inYear2024 = d => d.timeStartDate && d.timeStartDate.getFullYear() === 2024;
  const nationalRows = rows
    .filter(
      d =>
        d.indicator === articleMapConfig.indicator &&
        d.groupType === "national" &&
        Number.isFinite(d.value) &&
        inYear2024(d)
    )
    .sort((a, b) => d3.ascending(a.timeStartDate, b.timeStartDate));
  const stateRows = rows
    .filter(
      d =>
        d.indicator === articleMapConfig.indicator &&
        d.groupType === "state" &&
        d.state === articleMapConfig.state &&
        Number.isFinite(d.value) &&
        inYear2024(d)
    )
    .sort((a, b) => d3.ascending(a.timeStartDate, b.timeStartDate));

  const mergedRows = [...nationalRows, ...stateRows];
  if (!mergedRows.length) return;

  const x = d3
    .scaleTime()
    .domain(d3.extent(mergedRows, d => d.timeStartDate))
    .range([0, innerWidth]);
  const yExtent = d3.extent(mergedRows, d => d.value);
  const yPadding = Math.max(0.4, (yExtent[1] - yExtent[0]) * 0.18);
  const y = d3
    .scaleLinear()
    .domain([Math.max(0, yExtent[0] - yPadding), yExtent[1] + yPadding])
    .nice()
    .range([innerHeight, 0]);

  const svg = articleTrendRoot
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg
    .append("text")
    .attr("x", 20)
    .attr("y", 24)
    .attr("fill", articleTheme.text)
    .attr("font-size", 18)
    .attr("font-weight", 600)
    .text("Trend: National vs. Maryland");

  const legend = svg.append("g").attr("transform", `translate(${width - 278}, 19)`);
  drawArticleTrendLegendItem(legend, 0, "United States", nationalColor);
  drawArticleTrendLegendItem(legend, 148, "Maryland", stateColor);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const line = d3
    .line()
    .x(d => x(d.timeStartDate))
    .y(d => y(d.value));

  g.append("g")
    .attr("class", "chart-grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d3.timeFormat("%b %Y")));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`));

  drawArticleTrendSeries(g, nationalRows, line, x, y, "United States", nationalColor);
  drawArticleTrendSeries(g, stateRows, line, x, y, "Maryland", stateColor);
}

function drawArticleTrendSeries(group, rows, line, x, y, label, color) {
  // Draw one line plus hover points
  group
    .append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 2.6)
    .attr("d", line);

  group
    .append("g")
    .selectAll("circle")
    .data(rows)
    .join("circle")
    .attr("class", "article-trend-point")
    .attr("cx", d => x(d.timeStartDate))
    .attr("cy", d => y(d.value))
    .attr("r", 4.8)
    .attr("fill", color)
    .attr("stroke", articleTheme.surface)
    .attr("stroke-width", 1.7);

  group
    .append("g")
    .selectAll("circle")
    .data(rows)
    .join("circle")
    .attr("class", "article-trend-hit-area")
    .attr("cx", d => x(d.timeStartDate))
    .attr("cy", d => y(d.value))
    .attr("r", 12)
    .attr("fill", "transparent")
    .on("mousemove", (event, d) => {
      showArticleTooltip(event, buildArticleTrendTooltip(label, d));
    })
    .on("mouseleave", () => {
      articleTooltip.style("display", "none").attr("aria-hidden", "true");
    });
}

function drawArticleTrendLegendItem(group, x, label, color) {
  const item = group.append("g").attr("transform", `translate(${x}, 0)`);

  item
    .append("line")
    .attr("x1", 0)
    .attr("x2", 24)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", color)
    .attr("stroke-width", 2.6);

  item
    .append("text")
    .attr("x", 32)
    .attr("y", 5)
    .attr("fill", articleTheme.body)
    .attr("font-size", 13)
    .attr("font-weight", 500)
    .text(label);
}

function drawArticleFingerprint(rows) {
  // Compact radar chart for the Maryland section
  if (articleFingerprintRoot.empty()) return;

  const width = 760;
  const height = 460;
  const centerX = width / 2;
  const centerY = 248;
  const chartRadius = 150;
  const stateColor = articleTheme.primary;
  const nationalColor = articleTheme.accent;

  const availableIndicators = new Set(rows.map(d => d.indicator).filter(Boolean));
  const indicators = articleFingerprintOrder.filter(indicator => availableIndicators.has(indicator));
  const series = indicators
    .map(indicator => {
      const stateRow = rows.find(
        d =>
          d.groupType === "state" &&
          d.state === articleMapConfig.state &&
          d.timeLabel === articleMapConfig.timeLabel &&
          d.indicator === indicator &&
          Number.isFinite(d.value)
      );
      const nationalRow = rows.find(
        d =>
          d.groupType === "national" &&
          d.timeLabel === articleMapConfig.timeLabel &&
          d.indicator === indicator &&
          Number.isFinite(d.value)
      );

      return {
        indicator,
        label: getArticleFingerprintLabel(indicator),
        stateValue: stateRow ? stateRow.value : null,
        nationalValue: nationalRow ? nationalRow.value : null
      };
    })
    .filter(d => d.stateValue != null || d.nationalValue != null);

  if (!series.length) return;

  const maxValue = d3.max(series, d => Math.max(d.stateValue || 0, d.nationalValue || 0)) || 1;
  const radius = d3.scaleLinear().domain([0, maxValue]).range([0, chartRadius]);
  const angleStep = (Math.PI * 2) / series.length;

  const svg = articleFingerprintRoot
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg
    .append("text")
    .attr("x", 24)
    .attr("y", 24)
    .attr("fill", articleTheme.text)
    .attr("font-size", 18)
    .attr("font-weight", 600)
    .text("Disconnection Fingerprint: Maryland");

  const legend = svg.append("g").attr("transform", `translate(${width - 278}, 20)`);
  drawArticleTrendLegendItem(legend, 0, "Maryland", stateColor);
  drawArticleTrendLegendItem(legend, 140, "United States", nationalColor);
  legend.selectAll("g").filter((_d, i) => i === 1).select("line").attr("stroke-dasharray", "5,4");

  const g = svg.append("g").attr("transform", `translate(${centerX},${centerY})`);

  d3.range(1, 4).forEach(level => {
    g.append("circle")
      .attr("r", (chartRadius * level) / 3)
      .attr("fill", "none")
      .attr("stroke", articleTheme.grid)
      .attr("stroke-width", 1);
  });

  g.append("g")
    .selectAll("line")
    .data(series)
    .join("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (_d, i) => Math.cos(i * angleStep - Math.PI / 2) * chartRadius)
    .attr("y2", (_d, i) => Math.sin(i * angleStep - Math.PI / 2) * chartRadius)
    .attr("stroke", articleTheme.grid)
    .attr("stroke-width", 0.9);

  const pointFor = (value, index) => {
    if (value == null) return [0, 0];
    const angle = index * angleStep - Math.PI / 2;
    return [Math.cos(angle) * radius(value), Math.sin(angle) * radius(value)];
  };

  const line = d3
    .line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveLinearClosed);

  g.append("path")
    .attr("d", line(series.map((d, i) => pointFor(d.stateValue, i))))
    .attr("fill", articleTheme.primaryFill)
    .attr("stroke", stateColor)
    .attr("stroke-width", 2.4);

  g.append("path")
    .attr("d", line(series.map((d, i) => pointFor(d.nationalValue, i))))
    .attr("fill", "none")
    .attr("stroke", nationalColor)
    .attr("stroke-width", 2.4)
    .attr("stroke-dasharray", "5,4");

  g.append("g")
    .selectAll("text")
    .data(series)
    .join("text")
    .attr("class", "article-fingerprint-label")
    .attr("x", (_d, i) => Math.cos(i * angleStep - Math.PI / 2) * (chartRadius + 28))
    .attr("y", (_d, i) => Math.sin(i * angleStep - Math.PI / 2) * (chartRadius + 28))
    .attr("text-anchor", (_d, i) => {
      const x = Math.cos(i * angleStep - Math.PI / 2);
      if (x > 0.35) return "start";
      if (x < -0.35) return "end";
      return "middle";
    })
    .attr("dominant-baseline", (_d, i) => {
      const y = Math.sin(i * angleStep - Math.PI / 2);
      if (y > 0.35) return "hanging";
      if (y < -0.35) return "auto";
      return "middle";
    })
    .attr("fill", articleTheme.body)
    .attr("font-size", 13)
    .attr("font-weight", 500)
    .text(d => d.label)
    .on("mousemove", (event, d) => {
      showArticleTooltip(event, buildArticleFingerprintTooltip(d));
    })
    .on("mouseleave", hideArticleTooltip);

  const points = [];
  // Save both Maryland and U.S. points for hover tooltips
  series.forEach((d, index) => {
    if (d.stateValue != null) {
      const [x, y] = pointFor(d.stateValue, index);
      points.push({ ...d, x, y, color: stateColor });
    }
    if (d.nationalValue != null) {
      const [x, y] = pointFor(d.nationalValue, index);
      points.push({ ...d, x, y, color: nationalColor });
    }
  });

  g.append("g")
    .selectAll("circle")
    .data(points)
    .join("circle")
    .attr("class", "article-fingerprint-point")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 4.8)
    .attr("fill", d => d.color)
    .attr("stroke", articleTheme.surface)
    .attr("stroke-width", 1.3)
    .on("mousemove", (event, d) => {
      showArticleTooltip(event, buildArticleFingerprintTooltip(d));
    })
    .on("mouseleave", hideArticleTooltip);
}

function normalizeArticleRow(row) {
  // Clean up CSV fields for the article graphics
  const group = readArticleField(row, "Group");
  const state = readArticleField(row, "State");
  const lowCI = parseArticleNumber(readArticleField(row, "Low CI"));
  const highCI = parseArticleNumber(readArticleField(row, "High CI"));
  const timeStartDate = parseArticleDate(readArticleField(row, "Time Period Start Date"));

  return {
    indicator: readArticleField(row, "Indicator"),
    group,
    state,
    stateKey: normalizeArticleStateName(state),
    timeLabel: readArticleField(row, "Time Period Label"),
    timeStartDate,
    value: parseArticleNumber(readArticleField(row, "Value")),
    confidenceInterval:
      readArticleField(row, "Confidence Interval") || formatArticleConfidenceInterval(lowCI, highCI),
    groupType: inferArticleGroupType(group)
  };
}

function buildArticleMapTooltip(stateName, row) {
  const estimate = row ? `${row.value.toFixed(1)}%` : "No data";
  const ci = row && row.confidenceInterval ? row.confidenceInterval : "N/A";

  return `
    <strong>${stateName}</strong>
    <span class="tooltip-muted">${articleMapConfig.indicator}</span>
    <span>Time: ${articleMapConfig.timeLabel}</span>
    <span>Estimate: ${estimate}</span>
    <span>Confidence Interval: ${ci}</span>
  `;
}

function buildArticleTrendTooltip(seriesLabel, row) {
  const estimate = Number.isFinite(row.value) ? `${row.value.toFixed(1)}%` : "No data";
  const ci = row && row.confidenceInterval ? row.confidenceInterval : "N/A";

  return `
    <strong>${seriesLabel}</strong>
    <span>Time: ${row.timeLabel}</span>
    <span>Percent: ${estimate}</span>
    <span>Confidence Interval: ${ci}</span>
  `;
}

function buildArticleFingerprintTooltip(d) {
  const stateValue = Number.isFinite(d.stateValue) ? `${d.stateValue.toFixed(1)}%` : "N/A";
  const nationalValue = Number.isFinite(d.nationalValue) ? `${d.nationalValue.toFixed(1)}%` : "N/A";
  const difference =
    Number.isFinite(d.stateValue) && Number.isFinite(d.nationalValue)
      ? d.stateValue - d.nationalValue
      : null;
  const differenceText = difference == null ? "N/A" : `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} pts`;

  return (
    `<strong>${d.label}</strong>` +
    `<span class="tooltip-muted">${d.indicator}</span>` +
    `<span>MD: ${stateValue}</span>` +
    `<span>US: ${nationalValue}</span>` +
    `<span>&Delta;: ${differenceText}</span>`
  );
}

function getArticleFingerprintLabel(indicator) {
  return articleFingerprintLabels.get(indicator) || indicator;
}

function showArticleTooltip(event, html) {
  // Keep article tooltips from spilling off screen
  const padding = 16;
  const offset = 12;

  articleTooltip.style("display", "block").attr("aria-hidden", "false").html(html);

  const node = articleTooltip.node();
  const tooltipWidth = node.offsetWidth;
  const tooltipHeight = node.offsetHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  let left = scrollX + mouseX + offset;
  let top = scrollY + mouseY + offset;

  if (mouseX + offset + tooltipWidth > window.innerWidth - padding) {
    left = scrollX + mouseX - tooltipWidth - offset;
  }

  if (mouseY + offset + tooltipHeight > window.innerHeight - padding) {
    top = scrollY + mouseY - tooltipHeight - offset;
  }

  left = Math.max(scrollX + padding, Math.min(left, scrollX + window.innerWidth - tooltipWidth - padding));
  top = Math.max(scrollY + padding, Math.min(top, scrollY + window.innerHeight - tooltipHeight - padding));

  articleTooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function hideArticleTooltip() {
  articleTooltip.style("display", "none").attr("aria-hidden", "true");
}

function getArticleThemeTokens() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

  return {
    surface: read("--color-surface", "#fffefd"),
    text: read("--color-text", "#102033"),
    body: read("--color-body", "#35465d"),
    muted: read("--color-muted", "#6f7f92"),
    grid: read("--color-grid", "#e7edf4"),
    primary: read("--color-primary", "#1f5f9f"),
    primaryFill: "rgba(31, 95, 159, 0.12)",
    accent: read("--color-accent", "#c4662b"),
    mapEmpty: read("--color-map-empty", "#e9eef5")
  };
}

function readArticleField(row, key) {
  return String(row[key] ?? "").trim();
}

function parseArticleNumber(value) {
  if (value == null || value === "") return null;
  const cleaned = String(value).replace(/,/g, "").replace(/%/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeArticleStateName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferArticleGroupType(groupName) {
  const group = String(groupName || "").toLowerCase();
  if (group.includes("state")) return "state";
  if (group.includes("national estimate") || group === "national" || group.includes("overall")) {
    return "national";
  }
  return "other";
}

function parseArticleDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatArticleConfidenceInterval(low, high) {
  if (low == null || high == null) return "";
  return `${low.toFixed(1)} - ${high.toFixed(1)}`;
}
