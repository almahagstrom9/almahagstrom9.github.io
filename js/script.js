
const CSV_FILE = "avg_student_loan_balance_2020_cty.csv";

const margin = { top: 20, right: 20, bottom: 20, left: 20 };
const outerWidth = 800;
const outerHeight = 500;
const width = outerWidth - margin.left - margin.right;
const height = outerHeight - margin.top - margin.bottom;

const vis = d3.select("#vis").style("position", "relative");

// ---- Controls bar ----
const controls = vis
  .append("div")
  .style("display", "flex")
  .style("justify-content", "flex-end")
  .style("align-items", "center")
  .style("gap", "10px")
  .style("margin", "0 0 10px 0");

// Back button 
const backBtn = controls
  .append("button")
  .text("← Back to USA")
  .style("visibility", "hidden") 
  .style("border", "1px solid #d0d0d0")
  .style("background", "#ffffff")
  .style("padding", "8px 10px")
  .style("border-radius", "10px")
  .style("box-shadow", "0 1px 2px rgba(0,0,0,0.08)")
  .style("cursor", "pointer")
  .style("font", "600 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif");

  // ---- Race group 
  const raceGroup = controls
  .append("div")
  .style("display", "flex")
  .style("align-items", "center")
  .style("gap", "6px");

  raceGroup
  .append("span")
  .text("Race:")
  .style("font", "600 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif");

  const raceSelect = raceGroup
  .append("select")
  .style("border", "1px solid #d0d0d0")
  .style("background", "#ffffff")
  .style("padding", "7px 10px")
  .style("border-radius", "10px")
  .style("box-shadow", "0 1px 2px rgba(0,0,0,0.08)")
  .style("cursor", "pointer")
  .style("font", "600 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif");






// ---- SVG ----
const root = vis
  .append("svg")
  .attr("width", outerWidth)
  .attr("height", outerHeight)
  .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("display", "block");

const svg = root
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Layers
const statesLayer = svg.append("g").attr("class", "states-layer");
const countiesLayer = svg.append("g").attr("class", "counties-layer");
const outlineLayer = svg.append("g").attr("class", "outline-layer");

// Tooltip
const tip = d3
  .select("body")
  .append("div")
  .style("position", "absolute")
  .style("background", "rgba(0,0,0,0.85)")
  .style("color", "#fff")
  .style("padding", "6px 8px")
  .style("border-radius", "8px")
  .style("font", "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
  .style("pointer-events", "none")
  .style("display", "none");

const fmt0 = d3.format(",.0f");

// FIPS -> state name
const STATE_NAME_BY_FIPS = {
  "01": "Alabama","02":"Alaska","04":"Arizona","05":"Arkansas","06":"California","08":"Colorado","09":"Connecticut",
  "10":"Delaware","11":"District of Columbia","12":"Florida","13":"Georgia","15":"Hawaii","16":"Idaho","17":"Illinois",
  "18":"Indiana","19":"Iowa","20":"Kansas","21":"Kentucky","22":"Louisiana","23":"Maine","24":"Maryland","25":"Massachusetts",
  "26":"Michigan","27":"Minnesota","28":"Mississippi","29":"Missouri","30":"Montana","31":"Nebraska","32":"Nevada",
  "33":"New Hampshire","34":"New Jersey","35":"New Mexico","36":"New York","37":"North Carolina","38":"North Dakota",
  "39":"Ohio","40":"Oklahoma","41":"Oregon","42":"Pennsylvania","44":"Rhode Island","45":"South Carolina","46":"South Dakota",
  "47":"Tennessee","48":"Texas","49":"Utah","50":"Vermont","51":"Virginia","53":"Washington","54":"West Virginia",
  "55":"Wisconsin","56":"Wyoming"
};

// topojson loader
function loadTopojsonClient() {
  return new Promise((resolve, reject) => {
    if (window.topojson) return resolve(window.topojson);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/topojson-client@3";
    s.onload = () => resolve(window.topojson);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

(async function main() {
  const topojson = await loadTopojsonClient();

  // ---- Load CSV ----
  const rows = await d3.csv(CSV_FILE, (d) => ({
    par_state: +d.par_state,
    par_county: +d.par_county,
    kid_race: d.kid_race,
    par_pctile: +d.par_pctile,
    county_name: d.county_name,
    value: +d.shrunk_xkid_stubalance2020
  }));

  // Populate race dropdown from data
  const races = Array.from(new Set(rows.map(d => d.kid_race))).sort();
  // Put Pooled first if it exists
  const orderedRaces = ["Pooled", ...races.filter(r => r !== "Pooled")];

  raceSelect
    .selectAll("option")
    .data(orderedRaces)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  // Default race
  let currentRace = orderedRaces.includes("Pooled") ? "Pooled" : orderedRaces[0];
  raceSelect.property("value", currentRace);

  // Always keep same percentile default
  const DEFAULT_PCTILE = -9;

  // Geometry
  const [statesTopo, countiesTopo] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json")
  ]);

  const states = topojson.feature(statesTopo, statesTopo.objects.states).features;
  const counties = topojson.feature(countiesTopo, countiesTopo.objects.counties).features;

  // Projection/path for USA
  const projectionUSA = d3.geoAlbersUsa().fitSize([width, height], {
    type: "FeatureCollection",
    features: states
  });
  const pathUSA = d3.geoPath(projectionUSA);

  // Current “view state”
  let activeStateFips2 = null;

  // Rebuild any time race changes
  let slice = [];
  let countyValueByFips = new Map();
  let countyNameByFips = new Map();
  let stateAvgByFips2 = new Map();
  let stateColor = null;

  // helpers
  const countyFips5 = (d) =>
    String(d.par_state).padStart(2, "0") + String(d.par_county).padStart(3, "0");

  function rebuildForRace(race) {
    // build slice for chosen race
    slice = rows.filter((d) => d.kid_race === race && d.par_pctile === DEFAULT_PCTILE);

    countyValueByFips = new Map(slice.map((d) => [countyFips5(d), d.value]));
    countyNameByFips = new Map(slice.map((d) => [countyFips5(d), d.county_name]));

    // Compute state averages
    const byState = d3.group(slice, (d) => String(d.par_state).padStart(2, "0"));
    stateAvgByFips2 = new Map();
    for (const [st, arr] of byState.entries()) {
      const vals = arr.map((d) => d.value).filter(Number.isFinite);
      stateAvgByFips2.set(st, d3.mean(vals));
    }

    // Color scale for states
    const stateAvgs = Array.from(stateAvgByFips2.values()).filter(Number.isFinite);
    stateColor = d3.scaleSequential(d3.interpolateReds).domain(d3.extent(stateAvgs.length ? stateAvgs : [0, 1]));
  }

  function drawUSA() {
    activeStateFips2 = null;
    backBtn.style("visibility", "hidden");


    // clear counties layer
    countiesLayer.selectAll("*").remove();
    outlineLayer.selectAll("*").remove();

    // show states
    statesLayer.selectAll("*").style("display", null);

    const statePaths = statesLayer
      .selectAll("path")
      .data(states, (d) => d.id)
      .join("path")
      .style("display", null)
      .attr("d", pathUSA)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.7)
      .attr("opacity", 1)
      .attr("fill", (d) => {
        const st = String(d.id).padStart(2, "0");
        const v = stateAvgByFips2.get(st);
        return Number.isFinite(v) ? stateColor(v) : "#eee";
      })
      .style("cursor", "pointer")
      .on("mousemove", (event, d) => {
        const st = String(d.id).padStart(2, "0");
        const name = STATE_NAME_BY_FIPS[st] ?? `State ${st}`;
        const v = stateAvgByFips2.get(st);

        tip
          .style("display", "block")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px")
          .html(`
            <div><b>${name}</b></div>
            <div>Race: ${currentRace}</div>
            <div>Avg (state): ${Number.isFinite(v) ? fmt0(v) : "N/A"}</div>
            <div style="opacity:.85;">Click for counties</div>
          `);
      })
      .on("mouseout", () => tip.style("display", "none"))
      .on("click", (event, d) => {
        const st = String(d.id).padStart(2, "0");
        drawStateCounties(st);
      });

    statePaths.raise();
  }

  function drawStateCounties(stateFips2) {
    activeStateFips2 = stateFips2;
    backBtn.style("visibility", "visible");


    // hide states completely
    statesLayer.selectAll("path").style("display", "none");

    const stateCounties = counties.filter((c) =>
      String(c.id).padStart(5, "0").startsWith(stateFips2)
    );

    let projectionState;

    // Alaska
    if (stateFips2 === "02") {
      projectionState = d3.geoAlbers()
        .rotate([154, 0])
        .center([-2, 58.5])
        .parallels([55, 65])
        .fitSize([width, height], {
          type: "FeatureCollection",
          features: stateCounties
        });

    // Hawaii
    } else if (stateFips2 === "15") {
      projectionState = d3.geoMercator()
        .center([-157, 20.5])
        .fitSize([width, height], {
          type: "FeatureCollection",
          features: stateCounties
        });

    // Lower 48 states
    } else {
      projectionState = d3.geoMercator()
        .fitSize([width, height], {
          type: "FeatureCollection",
          features: stateCounties
        });
    }


    const pathState = d3.geoPath(projectionState);

    const vals = stateCounties
      .map((c) => countyValueByFips.get(String(c.id).padStart(5, "0")))
      .filter(Number.isFinite);

    const countyColor = d3
      .scaleSequential(d3.interpolateReds)
      .domain(d3.extent(vals.length ? vals : [0, 1]));

    countiesLayer.selectAll("*").remove();
    outlineLayer.selectAll("*").remove();

    countiesLayer
      .selectAll("path")
      .data(stateCounties, (d) => d.id)
      .join("path")
      .attr("d", pathState)
      .attr("fill", (d) => {
        const f = String(d.id).padStart(5, "0");
        const v = countyValueByFips.get(f);
        return Number.isFinite(v) ? countyColor(v) : "#eee";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.6)
      .on("mousemove", (event, d) => {
        const f = String(d.id).padStart(5, "0");
        const name = countyNameByFips.get(f) ?? "Unknown county";
        const v = countyValueByFips.get(f);

        tip
          .style("display", "block")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px")
          .html(`
            <div><b>${name}</b></div>
            <div>Race: ${currentRace}</div>
            <div>Avg (county): ${Number.isFinite(v) ? fmt0(v) : "N/A"}</div>
          `);
      })
      .on("mouseout", () => tip.style("display", "none"));

    outlineLayer
      .append("path")
      .datum({ type: "FeatureCollection", features: stateCounties })
      .attr("d", pathState)
      .attr("fill", "none")
      .attr("stroke", "#111")
      .attr("stroke-width", 1);
  }

  // Wire button + filter events
  backBtn.on("click", () => drawUSA());

  raceSelect.on("change", () => {
    currentRace = raceSelect.property("value");
    rebuildForRace(currentRace);

    // Redraw depending on current view
    if (activeStateFips2) drawStateCounties(activeStateFips2);
    else drawUSA();
  });

  // Initial draw
  rebuildForRace(currentRace);
  drawUSA();
})().catch((err) => {
  console.error(err);
  alert("Error loading files. Check CSV_FILE path/name and run via a local server.");
});
