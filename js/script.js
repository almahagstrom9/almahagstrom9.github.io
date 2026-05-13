const stateIdToName = {
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

const appState = {
  selectedIndicator: null,
  selectedTime: null,
  selectedPalette: "blues",
  selectedState: null
};

const defaultIndicator = "Adults who usually or always feel lonely";
const fingerprintLabelMap = new Map([
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

const mapMargins = { top: 10, right: 10, bottom: 10, left: 10 };
const mapWidth = 960;
const mapHeight = 600;

const tooltip = d3.select("#tooltip");
const theme = getThemeTokens();

const mapSvg = d3
  .select("#map")
  .append("svg")
  .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

const mapGroup = mapSvg
  .append("g")
  .attr("transform", `translate(${mapMargins.left},${mapMargins.top})`);

const selectedStateGroup = mapSvg
  .append("g")
  .attr("transform", `translate(${mapMargins.left},${mapMargins.top})`)
  .attr("class", "selected-state-layer");

const mapInnerWidth = mapWidth - mapMargins.left - mapMargins.right;
const mapInnerHeight = mapHeight - mapMargins.top - mapMargins.bottom;

const fingerprintSvg = d3
  .select("#fingerprintChart")
  .append("svg")
  .attr("viewBox", "0 0 700 580")
  .attr("preserveAspectRatio", "xMidYMid meet");

const fingerprintG = fingerprintSvg.append("g").attr("transform", "translate(350,290)");

const trendSvg = d3
  .select("#trendChart")
  .append("svg")
  .attr("viewBox", "0 0 640 340")
  .attr("preserveAspectRatio", "xMidYMid meet");

const trendMargin = { top: 14, right: 24, bottom: 52, left: 56 };
const chartW = 640;
const chartH = 340;

const trendG = trendSvg
  .append("g")
  .attr("transform", `translate(${trendMargin.left},${trendMargin.top})`);

const trendInnerW = chartW - trendMargin.left - trendMargin.right;
const trendInnerH = chartH - trendMargin.top - trendMargin.bottom;

Promise.all([
  d3.csv("data/Lack_of_Social_Connection_20260429.csv"),
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
]).then(([rawRows, usTopo]) => {
  const cleaned = cleanDataset(rawRows);
  const { rows, stateData, indicators } = cleaned;

  const statesGeo = topojson.feature(usTopo, usTopo.objects.states).features;
  statesGeo.forEach(f => {
    f.properties = f.properties || {};
    f.properties.name = stateIdToName[+f.id] || "Unknown";
    f.properties.nameKey = normalizeStateName(f.properties.name);
  });

  const stateDataByIndicator = d3.group(stateData, d => d.__indicator);
  const indicatorOptions = indicators.filter(indicator => stateDataByIndicator.has(indicator));
  const timePeriodsByIndicator = new Map(
    indicatorOptions.map(indicator => [
      indicator,
      sortTimePeriods(Array.from(new Set(stateDataByIndicator.get(indicator).map(d => d.__timeLabel))))
    ])
  );

  appState.selectedIndicator =
    indicatorOptions.includes(defaultIndicator)
      ? defaultIndicator
      : indicatorOptions[0] || indicators[0] || null;
  appState.selectedTime = getLatestTimeForIndicator(timePeriodsByIndicator, appState.selectedIndicator);
  appState.selectedState = null;

  cachedTimePeriodsByIndicator = timePeriodsByIndicator;
  cachedIndicators = indicatorOptions;
  initializeControls(indicatorOptions);
  syncTimeControlOptions();

  const projection = d3.geoAlbersUsa().fitSize([mapInnerWidth, mapInnerHeight], {
    type: "FeatureCollection",
    features: statesGeo
  });
  const path = d3.geoPath(projection);
  cachedMapPath = path;

  mapGroup
    .selectAll(".state")
    .data(statesGeo)
    .join("path")
    .attr("class", "state")
    .attr("d", path)
    .on("click", (_event, d) => {
      appState.selectedState =
        appState.selectedState === d.properties.name ? null : d.properties.name;
      renderAll(rows, statesGeo);
    })
    .on("mousemove", (event, d) => {
      const stateRow = getStateRow(stateData, d.properties.name, appState.selectedTime, appState.selectedIndicator);
      const stateValue = stateRow ? stateRow.__value : null;
      showBoundedTooltip(event, buildMapTooltipHtml(d.properties.name, stateRow, stateValue));
    })
    .on("mouseleave", hideTooltip);

  initializeAnalysisTabs();
  renderAll(rows, statesGeo);
});

function initializeControls(indicatorOptions) {
  d3.select("#indicatorSelect")
    .selectAll("option")
    .data(indicatorOptions)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  d3.select("#indicatorSelect").property("value", appState.selectedIndicator);

  d3.select("#indicatorSelect").on("change", event => {
    appState.selectedIndicator = event.target.value;
    appState.selectedTime = getLatestTimeForIndicator(cachedTimePeriodsByIndicator, appState.selectedIndicator);
    syncTimeControlOptions();
    renderFromControls();
  });

  d3.select("#timeSlider").on("input", event => {
    const timeOptions = cachedTimePeriodsByIndicator.get(appState.selectedIndicator) || [];
    appState.selectedTime = timeOptions[+event.target.value] || appState.selectedTime;
    updateTimeSliderValue();
    renderFromControls();
  });

  d3.select("#paletteSelect").on("change", event => {
    appState.selectedPalette = event.target.value;
    renderFromControls();
  });
}

function initializeAnalysisTabs() {
  d3.selectAll("[data-analysis-tab]").on("click", event => {
    const activeTab = event.currentTarget.dataset.analysisTab;

    d3.selectAll("[data-analysis-tab]")
      .classed("is-active", function () {
        return this.dataset.analysisTab === activeTab;
      })
      .attr("aria-selected", function () {
        return this.dataset.analysisTab === activeTab ? "true" : "false";
      });

    d3.selectAll(".analysis-panel")
      .classed("is-active", function () {
        return this.id === `${activeTab}Panel`;
      })
      .attr("hidden", function () {
        return this.id === `${activeTab}Panel` ? null : true;
      });

    requestAnimationFrame(renderFromControls);
  });
}

function syncTimeControlOptions() {
  const timeOptions = cachedTimePeriodsByIndicator.get(appState.selectedIndicator) || [];
  if (!timeOptions.length) return;

  if (!timeOptions.includes(appState.selectedTime)) {
    appState.selectedTime = timeOptions[timeOptions.length - 1];
  }

  const selectedIndex = Math.max(0, timeOptions.indexOf(appState.selectedTime));

  d3.select("#timeSlider")
    .attr("min", 0)
    .attr("max", Math.max(0, timeOptions.length - 1))
    .attr("step", 1)
    .property("value", selectedIndex)
    .property("disabled", timeOptions.length < 2);

  updateTimeSliderValue();
}

function updateTimeSliderValue() {
  d3.select("#timeSliderValue").text(appState.selectedTime || "");
}

let cachedRows = [];
let cachedStates = [];
let cachedTimePeriodsByIndicator = new Map();
let cachedIndicators = [];
let cachedMapPath = null;

function renderAll(rows, statesGeo) {
  cachedRows = rows;
  cachedStates = statesGeo;
  updateMap(rows, statesGeo);
  updateFingerprintChart(rows);
  updateDetailPanel(rows);
  updateTrendChart(rows);
}

function renderFromControls() {
  if (!cachedRows.length) return;
  renderAll(cachedRows, cachedStates);
}

function getStateRow(rows, stateName, timeLabel, indicatorName) {
  const stateKey = normalizeStateName(stateName);
  return rows.find(
    d =>
      d.__groupType === "state" &&
      d.__stateKey === stateKey &&
      d.__timeLabel === timeLabel &&
      (!indicatorName || d.__indicator === indicatorName)
  );
}

function getPaletteInterpolator() {
  if (appState.selectedPalette === "viridis") return t => d3.interpolateViridis(1 - t);
  if (appState.selectedPalette === "magma") return t => d3.interpolateMagma(1 - t);
  return t => d3.interpolateBlues(0.18 + t * 0.72);
}

function updateMap(rows, statesGeo) {
  const filtered = rows.filter(
    d =>
      d.__groupType === "state" &&
      d.__timeLabel === appState.selectedTime &&
      d.__indicator === appState.selectedIndicator &&
      Number.isFinite(d.__value)
  );
  const valuesByState = new Map(filtered.map(d => [d.__stateKey, d.__value]));
  const values = filtered.map(d => d.__value);
  const [minVal, maxVal] = d3.extent(values);
  const color = d3
    .scaleSequential(getPaletteInterpolator())
    .domain([minVal || 20, maxVal || 60]);

  mapGroup
    .selectAll(".state")
    .data(statesGeo)
    .transition()
    .duration(650)
    .ease(d3.easeCubicInOut)
    .attr("fill", d => {
      const v = valuesByState.get(d.properties.nameKey);
      return v == null ? theme.mapEmpty : color(v);
    })
    .selection()
    .classed("active", d => d.properties.name === appState.selectedState);

  updateSelectedStateOverlay(statesGeo);
  drawLegend(minVal || 20, maxVal || 60, color);
}

function updateSelectedStateOverlay(statesGeo) {
  const selectedFeature = statesGeo.find(d => d.properties.name === appState.selectedState);

  selectedStateGroup
    .selectAll(".selected-state-overlay")
    .data(selectedFeature && cachedMapPath ? [selectedFeature] : [])
    .join("path")
    .attr("class", "selected-state-overlay")
    .attr("d", cachedMapPath);
}

function drawLegend(minVal, maxVal, colorScale) {
  const w = 960;
  const h = 78;
  const legendSvg = d3
    .select("#legend")
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("viewBox", `0 0 ${w} ${h}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const defs = legendSvg.selectAll("defs").data([null]).join("defs");
  const grad = defs
    .selectAll("#legend-gradient")
    .data([null])
    .join("linearGradient")
    .attr("id", "legend-gradient");

  grad
    .selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .join("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => colorScale(minVal + d * (maxVal - minVal)));

  legendSvg
    .selectAll(".legend-ramp")
    .data([null])
    .join("rect")
    .attr("class", "legend-ramp")
    .attr("x", 36)
    .attr("y", 30)
    .attr("width", 888)
    .attr("height", 16)
    .attr("fill", "url(#legend-gradient)")
    .attr("rx", 8);

  legendSvg
    .selectAll(".legend-min")
    .data([null])
    .join("text")
    .attr("class", "legend-min")
    .attr("x", 36)
    .attr("y", 70)
    .attr("fill", theme.muted)
    .attr("font-size", 17)
    .text(`${minVal.toFixed(1)}%`);

  legendSvg
    .selectAll(".legend-max")
    .data([null])
    .join("text")
    .attr("class", "legend-max")
    .attr("x", 924)
    .attr("y", 70)
    .attr("text-anchor", "end")
    .attr("fill", theme.muted)
    .attr("font-size", 17)
    .text(`${maxVal.toFixed(1)}%`);

  legendSvg
    .selectAll(".legend-low-label")
    .data([null])
    .join("text")
    .attr("class", "legend-low-label")
    .attr("x", 36)
    .attr("y", 18)
    .attr("fill", theme.muted)
    .attr("font-size", 18)
    .text("Lower Disconnection");

  legendSvg
    .selectAll(".legend-high-label")
    .data([null])
    .join("text")
    .attr("class", "legend-high-label")
    .attr("x", 924)
    .attr("y", 18)
    .attr("text-anchor", "end")
    .attr("fill", theme.muted)
    .attr("font-size", 18)
    .text("Higher disconnection");
}

function updateDetailPanel(rows) {
  const activeState = appState.selectedState;
  const row = rows.find(
    d =>
      d.__groupType === "state" &&
      d.__state === activeState &&
      d.__timeLabel === appState.selectedTime &&
      d.__indicator === appState.selectedIndicator
  );
  const display = d3.select("#stateDetail");

  if (!row) {
    display.html('<p class="muted-note">Select a state on the map to view details.</p>');
    return;
  }

  display.html(`
    <div class="detail-item detail-primary">
      <div class="detail-label">State</div>
      <div class="detail-value">${row.__state}</div>
    </div>
    <div class="detail-item detail-primary detail-estimate">
      <div class="detail-label">Estimated Share</div>
      <div class="detail-value">${row.__value.toFixed(1)}%</div>
    </div>
    <div class="detail-item detail-meta">
      <div class="detail-label">Confidence Interval</div>
      <div class="detail-value">${row.__confidenceInterval || "N/A"}</div>
    </div>
    <div class="detail-item detail-meta">
      <div class="detail-label">Quartile</div>
      <div class="detail-value">${row["Quartile Number"] || "N/A"}</div>
    </div>
  `);
}

function updateFingerprintChart(rows) {
  const container = d3.select("#fingerprintChart");
  const fingerprintTitle = d3.select("#fingerprintTitle");
  const selectedState = appState.selectedState;
  const selectedTime = appState.selectedTime;
  const indicators = cachedIndicators;
  const stateColor = theme.primary;
  const nationalColor = theme.accent;

  fingerprintTitle.text(selectedTime ? `Disconnection Fingerprint: ${selectedTime}` : "Disconnection Fingerprint");

  if (!selectedState) {
    updateFingerprintLegend(null, stateColor, nationalColor);
    fingerprintSvg.style("display", "none");
    container
      .selectAll(".fingerprint-placeholder")
      .data([null])
      .join("div")
      .attr("class", "fingerprint-placeholder")
      .text("Click a state to compare its disconnection profile with the national average.");
    return;
  }

  updateFingerprintLegend(selectedState, stateColor, nationalColor);
  container.selectAll(".fingerprint-placeholder").remove();
  fingerprintSvg.style("display", "block");
  fingerprintG.selectAll("*").remove();

  const series = indicators
    .map(indicator => {
      const stateRow = rows.find(
        d =>
          d.__groupType === "state" &&
          d.__state === selectedState &&
          d.__timeLabel === selectedTime &&
          d.__indicator === indicator &&
          Number.isFinite(d.__value)
      );

      const nationalRow = rows.find(
        d =>
          d.__groupType === "national" &&
          d.__indicator === indicator &&
          d.__timeLabel === selectedTime &&
          Number.isFinite(d.__value) &&
          (String(d.__group).toLowerCase().includes("national") || d.__subgroup === "United States")
      );

      return {
        indicator,
        stateValue: stateRow ? stateRow.__value : null,
        nationalValue: nationalRow ? nationalRow.__value : null,
        stateCI: stateRow ? stateRow.__confidenceInterval : "",
        nationalCI: nationalRow ? nationalRow.__confidenceInterval : ""
      };
    })
    .filter(d => d.stateValue != null || d.nationalValue != null)
    .map((d, index) => ({ ...d, number: index + 1 }));

  if (!series.length) {
    container
      .selectAll(".fingerprint-placeholder")
      .data([null])
      .join("div")
      .attr("class", "fingerprint-placeholder")
      .text("No fingerprint data available for the selected state and time period.");
    fingerprintSvg.style("display", "none");
    return;
  }

  const chartRadius = 220;
  const levels = 3;
  const maxValue = d3.max(series, d => Math.max(d.stateValue || 0, d.nationalValue || 0)) || 1;
  const r = d3.scaleLinear().domain([0, maxValue]).range([0, chartRadius]);
  const angleStep = (Math.PI * 2) / series.length;

  for (let i = 1; i <= levels; i += 1) {
    fingerprintG
      .append("circle")
      .attr("r", (chartRadius * i) / levels)
      .attr("fill", "none")
      .attr("stroke", theme.grid)
      .attr("stroke-width", 1);
  }

  const axes = fingerprintG
    .append("g")
    .selectAll("g")
    .data(series)
    .join("g")
    .attr("transform", (_d, i) => `rotate(${(i * 360) / series.length - 90})`);

  axes
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", chartRadius)
    .attr("y2", 0)
    .attr("stroke", theme.grid)
    .attr("stroke-width", 0.9);

  fingerprintG
    .append("g")
    .selectAll("text")
    .data(series)
    .join("text")
    .attr("class", "fingerprint-axis-label")
    .attr("x", (_d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return Math.cos(angle) * (chartRadius + 38);
    })
    .attr("y", (_d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return Math.sin(angle) * (chartRadius + 38);
    })
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
    .style("cursor", "pointer")
    .text(d => getFingerprintShortLabel(d.indicator))
    .on("mousemove", (event, d) => {
      showBoundedTooltip(event, buildFingerprintTooltipHtml(d, selectedState));
    })
    .on("mouseleave", hideTooltip);

  const pointFor = (value, idx) => {
    if (value == null) return [0, 0];
    const angle = idx * angleStep - Math.PI / 2;
    const radial = r(value);
    return [Math.cos(angle) * radial, Math.sin(angle) * radial];
  };

  const line = d3
    .line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveLinearClosed);

  const statePoints = series.map((d, idx) => pointFor(d.stateValue, idx));
  const nationalPoints = series.map((d, idx) => pointFor(d.nationalValue, idx));

  fingerprintG
    .append("path")
    .attr("d", line(statePoints))
    .attr("fill", theme.primaryFill)
    .attr("stroke", stateColor)
    .attr("stroke-width", 2.2);

  fingerprintG
    .append("path")
    .attr("d", line(nationalPoints))
    .attr("fill", "none")
    .attr("stroke", nationalColor)
    .attr("stroke-width", 2.2)
    .attr("stroke-dasharray", "5,4");

  drawFingerprintPoints(series, selectedState, chartRadius);
}

function updateTrendChart(rows) {
  const trendTitle = d3.select("#trendTitle");
  const inYear2024 = d => d.__timeStartDate && d.__timeStartDate.getFullYear() === 2024;
  const nationalColor = theme.accent;
  const stateColor = theme.primary;

  const nationalRows = rows
    .filter(
      d =>
        d.__groupType === "national" &&
        d.__indicator === appState.selectedIndicator &&
        Number.isFinite(d.__value) &&
        inYear2024(d)
    )
    .sort((a, b) => d3.ascending(a.__timeStartDate, b.__timeStartDate));

  const stateRows = appState.selectedState
    ? rows
        .filter(
          d =>
            d.__groupType === "state" &&
            d.__state === appState.selectedState &&
            d.__indicator === appState.selectedIndicator &&
            Number.isFinite(d.__value) &&
            inYear2024(d)
        )
        .sort((a, b) => d3.ascending(a.__timeStartDate, b.__timeStartDate))
    : [];

  trendG.selectAll("*").remove();

  if (appState.selectedState) {
    trendTitle.text(`Trend: National vs. ${appState.selectedState}`);
  } else {
    trendTitle.text("Trend: National");
  }
  updateTrendLegend(appState.selectedState, nationalColor, stateColor);

  if (!nationalRows.length && !stateRows.length) {
    trendG
      .append("text")
      .attr("x", 6)
      .attr("y", 20)
      .attr("fill", theme.muted)
      .text("No trend data available for this indicator.");
    return;
  }

  const mergedRows = [...nationalRows, ...stateRows];
  const x = d3
    .scaleTime()
    .domain(d3.extent(mergedRows, d => d.__timeStartDate))
    .range([0, trendInnerW]);
  const y = d3.scaleLinear().domain(d3.extent(mergedRows, d => d.__value)).nice().range([trendInnerH, 0]);

  const line = d3
    .line()
    .x(d => x(d.__timeStartDate))
    .y(d => y(d.__value));

  trendG
    .append("g")
    .attr("class", "chart-grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-trendInnerW).tickFormat(""));

  trendG
    .append("path")
    .datum(nationalRows)
    .attr("fill", "none")
    .attr("stroke", nationalColor)
    .attr("stroke-width", 2.3)
    .attr("d", line);

  drawTrendPoints(nationalRows, x, y, nationalColor, "United States");

  if (stateRows.length) {
    trendG
      .append("path")
      .datum(stateRows)
      .attr("fill", "none")
      .attr("stroke", stateColor)
      .attr("stroke-width", 2.3)
      .attr("d", line);

    drawTrendPoints(stateRows, x, y, stateColor, d => d.__state);
  }

  trendG
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${trendInnerH})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d3.timeFormat("%b %Y")));

  trendG
    .append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`));
}

function drawTrendPoints(rows, xScale, yScale, color, labelForRow) {
  const showTrendTooltip = (event, d) => {
    const label = typeof labelForRow === "function" ? labelForRow(d) : labelForRow;
    showBoundedTooltip(event, buildTrendTooltipHtml(label, d));
  };

  trendG
    .append("g")
    .selectAll("circle")
    .data(rows)
    .join("circle")
    .attr("class", "trend-point")
    .attr("cx", d => xScale(d.__timeStartDate))
    .attr("cy", d => yScale(d.__value))
    .attr("r", 4.4)
    .attr("fill", color)
    .attr("stroke", theme.surface)
    .attr("stroke-width", 1.6)
    .on("mousemove", showTrendTooltip)
    .on("mouseleave", hideTooltip);

  // Invisible hit areas make dense timeline points easier to hover without
  // changing the visible chart marks.
  trendG
    .append("g")
    .selectAll("circle")
    .data(rows)
    .join("circle")
    .attr("class", "trend-hit-area")
    .attr("cx", d => xScale(d.__timeStartDate))
    .attr("cy", d => yScale(d.__value))
    .attr("r", 11)
    .attr("fill", "transparent")
    .on("mousemove", showTrendTooltip)
    .on("mouseleave", hideTooltip);
}

function updateTrendLegend(selectedState, nationalColor, stateColor) {
  const legendItems = [{ label: "United States", color: nationalColor }];
  if (selectedState) {
    legendItems.push({ label: selectedState, color: stateColor });
  }

  const items = d3
    .select("#trendLegend")
    .selectAll(".trend-legend-item")
    .data(legendItems, d => d.label)
    .join("span")
    .attr("class", "trend-legend-item");

  items
    .selectAll(".trend-legend-swatch")
    .data(d => [d])
    .join("span")
    .attr("class", "trend-legend-swatch")
    .style("color", d => d.color);

  items
    .selectAll(".trend-legend-label")
    .data(d => [d])
    .join("span")
    .attr("class", "trend-legend-label")
    .text(d => d.label);
}

function updateFingerprintLegend(selectedState, stateColor, nationalColor) {
  const legendItems = selectedState
    ? [
        { label: selectedState, color: stateColor },
        { label: "United States", color: nationalColor, dashed: true }
      ]
    : [];

  const items = d3
    .select("#fingerprintLegend")
    .selectAll(".trend-legend-item")
    .data(legendItems, d => d.label)
    .join("span")
    .attr("class", "trend-legend-item");

  items
    .selectAll(".trend-legend-swatch")
    .data(d => [d])
    .join("span")
    .attr("class", "trend-legend-swatch")
    .style("color", d => d.color)
    .style("border-top-style", d => (d.dashed ? "dashed" : "solid"));

  items
    .selectAll(".trend-legend-label")
    .data(d => [d])
    .join("span")
    .attr("class", "trend-legend-label")
    .text(d => d.label);
}

function buildFingerprintTooltipHtml(d, selectedState) {
  const stateValue = Number.isFinite(d.stateValue) ? `${d.stateValue.toFixed(1)}%` : "N/A";
  const nationalValue = Number.isFinite(d.nationalValue) ? `${d.nationalValue.toFixed(1)}%` : "N/A";
  const difference = Number.isFinite(d.stateValue) && Number.isFinite(d.nationalValue) ? d.stateValue - d.nationalValue : null;
  const differenceText = difference == null ? "N/A" : `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} pts`;
  const shortLabel = getFingerprintShortLabel(d.indicator);

  return (
    `<strong>${shortLabel}</strong>` +
    `<span class="tooltip-muted">${d.indicator}</span>` +
    `<span>${selectedState}: ${stateValue}</span>` +
    `<span>US: ${nationalValue}</span>` +
    `<span>&Delta;: ${differenceText}</span>`
  );
}

function getFingerprintShortLabel(indicator) {
  return fingerprintLabelMap.get(indicator) || indicator;
}

function showBoundedTooltip(event, html) {
  const padding = 16;
  const offset = 12;
  tooltip.style("display", "block").attr("aria-hidden", "false").html(html);

  // Use viewport coordinates, then add scroll offsets, so tooltips stay within
  // the visible window even when the atlas page is scrolled on smaller screens.
  const node = tooltip.node();
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

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function hideTooltip() {
  tooltip.style("display", "none").attr("aria-hidden", "true");
}

function drawFingerprintPoints(series, selectedState, chartRadius) {
  const maxValue = d3.max(series, d => Math.max(d.stateValue || 0, d.nationalValue || 0)) || 1;
  const r = d3.scaleLinear().domain([0, maxValue]).range([0, chartRadius]);
  const angleStep = (Math.PI * 2) / series.length;

  const points = [];
  series.forEach((d, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    if (d.stateValue != null) {
      points.push({
        ...d,
        seriesType: "State",
        value: d.stateValue,
        ci: d.stateCI,
        x: Math.cos(angle) * r(d.stateValue),
        y: Math.sin(angle) * r(d.stateValue),
        color: theme.primary
      });
    }
    if (d.nationalValue != null) {
      points.push({
        ...d,
        seriesType: "National",
        value: d.nationalValue,
        ci: d.nationalCI,
        x: Math.cos(angle) * r(d.nationalValue),
        y: Math.sin(angle) * r(d.nationalValue),
        color: theme.accent
      });
    }
  });

  fingerprintG
    .append("g")
    .selectAll("circle")
    .data(points)
    .join("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 4.2)
    .attr("fill", d => d.color)
    .attr("stroke", theme.surface)
    .attr("stroke-width", 1.2)
    .on("mousemove", (event, d) => {
      showBoundedTooltip(event, buildFingerprintTooltipHtml(d, selectedState));
    })
    .on("mouseleave", hideTooltip);
}

function cleanDataset(rawRows) {
  if (!rawRows.length) {
    return {
      rows: [],
      stateData: [],
      indicators: []
    };
  }

  const columns = Object.keys(rawRows[0]);
  const columnMap = {
    indicator: findColumn(columns, ["indicator", "measure", "question", "metric"]),
    group: findColumn(columns, ["group", "category", "breakdown"]),
    subgroup: findColumn(columns, ["subgroup", "sub group", "strata"]),
    timeLabel: findColumn(columns, ["time period label", "time period", "period", "wave"]),
    timeStart: findColumn(columns, ["time period start date", "start date"]),
    state: findColumn(columns, ["state", "geography", "location"]),
    value: findColumn(columns, ["value", "estimate", "percent", "rate"]),
    lowCI: findColumn(columns, ["low ci", "lower ci", "lower confidence", "lcl"]),
    highCI: findColumn(columns, ["high ci", "upper ci", "upper confidence", "ucl"]),
    confidenceInterval: findColumn(columns, ["confidence interval", "ci", "interval"])
  };

  const normalizedRows = rawRows.map(row => {
    const indicator = readField(row, columnMap.indicator);
    const group = readField(row, columnMap.group);
    const subgroup = readField(row, columnMap.subgroup);
    const timeLabel = readField(row, columnMap.timeLabel);
    const state = readField(row, columnMap.state);
    const value = parseNumber(readField(row, columnMap.value));
    const lowCI = parseNumber(readField(row, columnMap.lowCI));
    const highCI = parseNumber(readField(row, columnMap.highCI));
    const confidenceInterval = readField(row, columnMap.confidenceInterval);
    const timeStartDate = parseDate(readField(row, columnMap.timeStart));

    return {
      ...row,
      __indicator: indicator,
      __group: group,
      __subgroup: subgroup,
      __timeLabel: timeLabel,
      __timeStartDate: timeStartDate,
      __state: state,
      __stateKey: normalizeStateName(state),
      __value: value,
      __confidenceInterval: confidenceInterval || formatConfidenceInterval(lowCI, highCI),
      __groupType: inferGroupType(group)
    };
  });

  const stateData = normalizedRows.filter(d => d.__groupType === "state");

  const indicators = sortAlphaUnique(normalizedRows.map(d => d.__indicator));

  return {
    rows: normalizedRows,
    stateData,
    indicators
  };
}

function normalizeHeader(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeStateName(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumn(columns, aliases) {
  const normalizedColumns = columns.map(c => ({ original: c, normalized: normalizeHeader(c) }));

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const exact = normalizedColumns.find(c => c.normalized === normalizedAlias);
    if (exact) return exact.original;
  }

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const partial = normalizedColumns.find(c => c.normalized.includes(normalizedAlias));
    if (partial) return partial.original;
  }

  return null;
}

function readField(row, key) {
  if (!key || !(key in row)) return "";
  return String(row[key] ?? "").trim();
}

function parseNumber(value) {
  if (value == null || value === "") return null;
  const cleaned = String(value).replace(/,/g, "").replace(/%/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date;

  // Some time labels arrive as ranges rather than ISO dates. Sorting by the
  // range start keeps the slider and trend charts in chronological order.
  const rangeMatch = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s+-.*,\s*(\d{4})$/);
  if (rangeMatch) {
    const [, startMonth, startDay, year] = rangeMatch;
    const rangeDate = new Date(`${startMonth} ${startDay}, ${year}`);
    return Number.isNaN(rangeDate.getTime()) ? null : rangeDate;
  }

  return null;
}

function formatConfidenceInterval(low, high) {
  if (low == null || high == null) return "";
  return `${low.toFixed(1)} - ${high.toFixed(1)}`;
}

function inferGroupType(groupName) {
  const group = String(groupName || "").toLowerCase();
  if (group.includes("state")) return "state";
  if (group.includes("national estimate") || group === "national" || group.includes("overall")) {
    return "national";
  }
  return "demographic";
}

function sortAlphaUnique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort(d3.ascending);
}

function sortTimePeriods(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => {
    const da = parseDate(a);
    const db = parseDate(b);
    if (da && db) return d3.ascending(da, db);
    return d3.ascending(a, b);
  });
}

function getLatestTimeForIndicator(timePeriodsByIndicator, indicatorName) {
  const options = timePeriodsByIndicator.get(indicatorName) || [];
  return options.length ? options[options.length - 1] : null;
}

function buildMapTooltipHtml(stateName, row, value) {
  const indicator = appState.selectedIndicator || "N/A";
  const time = appState.selectedTime || "N/A";
  const estimate = value == null ? "No data" : `${value.toFixed(1)}%`;
  const ci = row && row.__confidenceInterval ? row.__confidenceInterval : "N/A";

  return `
    <strong>${stateName}</strong>
    <span class="tooltip-muted">${indicator}</span>
    <span>Time: ${time}</span>
    <span>Estimate: ${estimate}</span>
    <span>Confidence Interval: ${ci}</span>
  `;
}

function buildTrendTooltipHtml(seriesLabel, row) {
  const estimate = Number.isFinite(row.__value) ? `${row.__value.toFixed(1)}%` : "No data";
  const ci = row && row.__confidenceInterval ? row.__confidenceInterval : "N/A";

  return `
    <strong>${seriesLabel}</strong>
    <span>Time: ${row.__timeLabel}</span>
    <span>Percent: ${estimate}</span>
    <span>Confidence Interval: ${ci}</span>
  `;
}

function getThemeTokens() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

  return {
    surface: read("--color-surface", "#fffefd"),
    muted: read("--color-muted", "#6f7f92"),
    grid: read("--color-grid", "#e7edf4"),
    primary: read("--color-primary", "#1f5f9f"),
    primaryFill: "rgba(31, 95, 159, 0.12)",
    accent: read("--color-accent", "#c4662b"),
    mapEmpty: read("--color-map-empty", "#e9eef5")
  };
}
