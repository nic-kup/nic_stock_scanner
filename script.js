// Global variables
let tickerInfo = {};
let secInfo = {};
let yearFinData = {};
let numericalProperties = [];
let trackedStocks = [];
let selectedSectors = [];
let selectedIndustries = [];
let allIndustries = [];
let bestFitState = 0;

import { updatePlot } from "./plotFunctions.js";
import { initializeFuzzySearch, handleFuzzySearch } from "./fuzzySearch.js";

const infoMetrics = [
	"marketCap",
	"enterpriseValue",
	"freeCashflow",
	"operatingCashflow",
	"trailingPE",
	"forwardPE",
	"dividendYield",
	"priceToBook",
];

const defaultState = {
	p1: "marketCap",
	p2: "freeCashflow",
	l1: false,
	l2: false,
	f: [],
};

// Global variable
let filterCount = 0;

// Fetch JSON data
async function fetchJSONData(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log(`Data successfully fetched from ${url}`);
		return data;
	} catch (error) {
		console.error(`Error fetching ${url}:`, error);
		throw error;
	}
}

// Initialize the application
async function init() {
	try {
		console.log("Initializing application...");

		// Fetch data
		tickerInfo = await fetchJSONData("ticker_info.json");
		secInfo = await fetchJSONData("sec_info.json");
		yearFinData = await fetchJSONData("yearfin.json");

		// Get numerical properties
		const sampleTicker = "AAPL";
		if (!tickerInfo[sampleTicker]) {
			throw new Error(`Sample ticker ${sampleTicker} not found in data`);
		}
		numericalProperties = Object.keys(tickerInfo[sampleTicker]).filter(
			(prop) => typeof tickerInfo[sampleTicker][prop] === "number"
		);

		// Set default values
		const property1Select = document.getElementById("property1");
		const property2Select = document.getElementById("property2");
		document
			.getElementById("logScale1")
			.addEventListener("change", () =>
				updatePlot(tickerInfo, secInfo, trackedStocks, true)
			);
		document
			.getElementById("logScale2")
			.addEventListener("change", () =>
				updatePlot(tickerInfo, secInfo, trackedStocks, true)
			);

		const bestFitPill = document.getElementById("bestFitPill");
		bestFitPill.addEventListener("click", toggleBestFit);

		// Replace existing event listeners for color by sector and show diagonal
		const colorBySectorPill = document.getElementById("colorBySectorPill");
		colorBySectorPill.addEventListener("click", toggleColorBySector);

		const showDiagonalPill = document.getElementById("showDiagonalPill");
		showDiagonalPill.addEventListener("click", toggleShowDiagonal);

		// Specifically for Prop1 and Prop2
		initializeFuzzySearch(numericalProperties, () =>
			updatePlot(tickerInfo, secInfo, trackedStocks, true)
		);

		// Set up filter functionality
		document
			.getElementById("addFilter")
			.addEventListener("click", addFilter);

		// Set up swap properties functionality
		document
			.getElementById("swapProperties")
			.addEventListener("click", swapProperties);

		// Set up add stock functionality
		handleFuzzySearch(
			"addStock",
			"addStockResults",
			Object.keys(tickerInfo),
			addStock
		);

		const sectors = [
			...new Set(Object.values(secInfo).map((info) => info.sector)),
		];

		handleFuzzySearch(
			"sectorFilter",
			"sectorFilterResults",
			sectors,
			addSectorFilter
		);

		allIndustries = [
			...new Set(Object.values(secInfo).map((info) => info.industry)),
		];
		updateIndustryFilterOptions();

		// Read state from URL if available
		const stateLoaded = readStateFromURL();

		// Update URL with initial state if not loaded from URL
		if (!stateLoaded) {
			if (numericalProperties.includes("marketCap")) {
				property1Select.value = "marketCap";
			}
			if (numericalProperties.includes("freeCashflow")) {
				property2Select.value = "freeCashflow";
			}
			updateURLWithState();
		}

		// Initial plot
		updatePlot(tickerInfo, secInfo, trackedStocks);

		// Update last updated timestamp
		await updateLastUpdated();
	} catch (error) {
		console.error("Error initializing application:", error);
		document.body.innerHTML = `<h1>Error initializing application</h1><p>${error.message}</p>`;
	}
}

function toggleBestFit() {
	if (selectedSectors.length === 0) {
		bestFitState = (bestFitState + 1) % 2;
	} else {
		bestFitState = (bestFitState + 1) % 3;
	}

	const bestFitPill = document.getElementById("bestFitPill");
	bestFitPill.classList.toggle("active", bestFitState > 0);

	switch (bestFitState) {
		case 0:
			bestFitPill.textContent = "Best Fit (Off)";
			break;
		case 1:
			bestFitPill.textContent = "Best Fit (All)";
			break;
		case 2:
			bestFitPill.textContent = "Best Fit (Sector)";
			break;
	}

	updatePlot(tickerInfo, secInfo, trackedStocks, false);
}

function toggleColorBySector() {
	const pill = document.getElementById("colorBySectorPill");
	pill.classList.toggle("active");
	updatePlot(tickerInfo, secInfo, trackedStocks, false);
}

function toggleShowDiagonal() {
	const pill = document.getElementById("showDiagonalPill");
	pill.classList.toggle("active");
	updatePlot(tickerInfo, secInfo, trackedStocks, false);
}
function addSectorFilter(sector) {
	if (!selectedSectors.includes(sector)) {
		selectedSectors.push(sector);
		updateSelectedSectorsList();
		updateIndustryFilterOptions();
		updatePlot(tickerInfo, secInfo, trackedStocks, false);
	}
	document.getElementById("sectorFilter").value = "";
}

function removeSectorFilter(sector) {
	selectedSectors = selectedSectors.filter((s) => s !== sector);
	updateSelectedSectorsList();
	updateIndustryFilterOptions();
	updatePlot(tickerInfo, secInfo, trackedStocks, false);
}

function updateSelectedSectorsList() {
	const container = document.getElementById("selectedSectors");
	container.innerHTML = "";
	selectedSectors.forEach((sector) => {
		const pill = document.createElement("span");
		pill.className = "filter-pill";
		pill.textContent = sector;
		pill.dataset.sector = sector;
		pill.onclick = () => removeSectorFilter(sector);
		container.appendChild(pill);
	});
}

function updateIndustryFilterOptions() {
	let relevantIndustries;
	if (selectedSectors.length === 0) {
		relevantIndustries = allIndustries;
	} else {
		relevantIndustries = [
			...new Set(
				Object.entries(secInfo)
					.filter(([_, info]) =>
						selectedSectors.includes(info.sector)
					)
					.map(([_, info]) => info.industry)
			),
		];
	}
	// Update the fuzzy search handler for industry filter
	handleFuzzySearch(
		"industryFilter",
		"industryFilterResults",
		relevantIndustries,
		addIndustryFilter
	);

	// Remove any selected industries that are no longer relevant
	selectedIndustries = selectedIndustries.filter((industry) =>
		relevantIndustries.includes(industry)
	);
	updateSelectedIndustriesList();
}

function addIndustryFilter(industry) {
	if (!selectedIndustries.includes(industry)) {
		selectedIndustries.push(industry);
		updateSelectedIndustriesList();
		updatePlot(tickerInfo, secInfo, trackedStocks, false);
	}
	document.getElementById("industryFilter").value = "";
}

function removeIndustryFilter(industry) {
	selectedIndustries = selectedIndustries.filter((i) => i !== industry);
	updateSelectedIndustriesList();
	updatePlot(tickerInfo, secInfo, trackedStocks, false);
}

function updateSelectedIndustriesList() {
	const container = document.getElementById("selectedIndustries");
	container.innerHTML = "";
	selectedIndustries.forEach((industry) => {
		const pill = document.createElement("span");
		pill.className = "filter-pill";
		pill.textContent = industry;
		pill.dataset.industry = industry;
		pill.onclick = () => removeIndustryFilter(industry);
		container.appendChild(pill);
	});
}

function addFilter() {
	console.log("new filter", filterCount);
	const filtersDiv = document.getElementById("filters");
	const newFilter = document.createElement("div");
	const currentFilterId = filterCount;
	newFilter.className = "filter";
	newFilter.dataset.filterId = currentFilterId;
	newFilter.innerHTML = `
        <div class="input-wrapper">
            <input type="text" id="filterLeft${currentFilterId}" class="filterInput fuzzy-search" placeholder="Property or Value" autocomplete="off">
            <div id="filterLeftResults${currentFilterId}" class="search-results"></div>
        </div>
        <button id="filterComparison${currentFilterId}" class="filterComparison">≥</button>
        <div class="input-wrapper">
            <input type="text" id="filterRight${currentFilterId}" class="filterInput fuzzy-search" placeholder="Property or Value" autocomplete="off">
            <div id="filterRightResults${currentFilterId}" class="search-results"></div>
        </div>
        <button class="removeFilter">Remove</button>
    `;
	filtersDiv.appendChild(newFilter);

	// Add event listener for the remove button
	newFilter
		.querySelector(".removeFilter")
		.addEventListener("click", function () {
			removeFilter(currentFilterId);
		});

	// Initialize fuzzy search for both input fields
	["Left", "Right"].forEach((side) => {
		handleFuzzySearch(
			`filter${side}${currentFilterId}`,
			`filter${side}Results${currentFilterId}`,
			numericalProperties,
			() => updatePlot(tickerInfo, secInfo, trackedStocks, false)
		);
	});

	// Add event listeners for both input fields
	["Left", "Right"].forEach((side) => {
		document
			.getElementById(`filter${side}${currentFilterId}`)
			.addEventListener("input", () =>
				updatePlot(tickerInfo, secInfo, trackedStocks, false)
			);
	});

	// Add event listener for the comparison button
	const comparisonButton = document.getElementById(
		`filterComparison${currentFilterId}`
	);
	comparisonButton.addEventListener("click", function () {
		this.textContent = this.textContent === "≥" ? "≤" : "≥";
		updatePlot(tickerInfo, secInfo, trackedStocks, false);
	});

	filterCount++;
	updatePlot(tickerInfo, secInfo, trackedStocks);
}

function removeFilter(id) {
	console.log("remove filter", id);
	const filterToRemove = document.querySelector(
		`.filter[data-filter-id="${id}"]`
	);
	if (filterToRemove) {
		filterToRemove.remove();
		updatePlot(tickerInfo, secInfo, trackedStocks);
	}
}

async function updateLastUpdated() {
	try {
		const response = await fetch("last_updated.json");
		const data = await response.json();
		const lastUpdated = new Date(data.timestamp);
		const now = new Date();
		const hoursAgo = Math.round((now - lastUpdated) / (1000 * 60 * 60));

		const lastUpdatedElement = document.getElementById("lastUpdated");
		lastUpdatedElement.textContent = `Last updated: ${hoursAgo} hour${
			hoursAgo !== 1 ? "s" : ""
		} ago.`;
	} catch (error) {
		console.error("Error fetching last updated timestamp:", error);
	}
}

// Swap properties
function swapProperties() {
	const prop1 = document.getElementById("property1");
	const prop2 = document.getElementById("property2");
	[prop1.value, prop2.value] = [prop2.value, prop1.value];
	updatePlot(tickerInfo, secInfo, trackedStocks, true);
}

// Add stock to tracked stocks
function addStock(ticker) {
	ticker = ticker.toUpperCase();
	if (ticker in tickerInfo && !trackedStocks.includes(ticker)) {
		trackedStocks.push(ticker);
		updateTrackedStocksList();
		updatePlot(tickerInfo, secInfo, trackedStocks, false);
	}
	document.getElementById("addStock").value = "";
}

function handleStockClick(ticker) {
	console.log("Clicked on stock:", ticker);
	if (!trackedStocks.includes(ticker)) {
		trackedStocks.push(ticker);
		updateTrackedStocksList();
		updatePlot(tickerInfo, secInfo, trackedStocks, false);
	} else {
		console.log("Stock is already tracked:", ticker);
	}
}

// Update tracked stocks list
function updateTrackedStocksList() {
	const list = document.getElementById("trackedStocksList");
	list.innerHTML = "";
	trackedStocks.forEach((ticker) => {
		const li = document.createElement("li");
		li.innerHTML = `
            <span>${ticker}</span>
            <div class="button-container">
                <button class="removeStock">Remove</button>
                <button class="moreInfo">More Info</button>
            </div>
        `;
		li.querySelector(".removeStock").addEventListener("click", () =>
			removeStock(ticker)
		);
		li.querySelector(".moreInfo").addEventListener("click", () =>
			showStockInfo(ticker)
		);
		list.appendChild(li);
	});
}

function showStockInfo(ticker) {
	const infoContainer = document.getElementById("stockInfoContainer");
	const infoTitle = document.getElementById("stockInfoTitle");

	infoTitle.textContent = `${ticker} - ${secInfo[ticker]?.sector}`;

	// Clear previous content
	infoContainer.innerHTML = "";

	// Re-add the title
	infoContainer.appendChild(infoTitle);

	// Create the table for stock metrics
	const newInfoTable = document.createElement("table");
	newInfoTable.id = "stockInfoTable";
	const tbody = document.createElement("tbody");
	newInfoTable.appendChild(tbody);
	infoContainer.appendChild(newInfoTable);

	infoMetrics.forEach((metric) => {
		const row = tbody.insertRow();
		const cell1 = row.insertCell(0);
		const cell2 = row.insertCell(1);

		cell1.textContent = metric;
		const value = tickerInfo[ticker][metric];
		cell2.textContent = formatValue(metric, value);
	});

	// Create a new div for the financial chart
	const chartDiv = document.createElement("div");
	chartDiv.id = "financialChart";
	infoContainer.appendChild(chartDiv);

	// Generate the financial chart
	generateSimpleFinancialChart(ticker);

	infoContainer.style.display = "block";
}

function generateSimpleFinancialChart(ticker) {
	const yearlyData = yearFinData[ticker];
	if (!yearlyData || yearlyData.length === 0) {
		console.log("No financial data available for", ticker);
		return;
	}

	const chartDiv = document.getElementById("financialChart");
	chartDiv.innerHTML = "<h4>Annual Revenue and Earnings</h4>";

	const allValues = yearlyData.flatMap((data) => [
		data.revenue,
		data.earnings,
	]);

	const max = Math.max(...allValues);
	const min = Math.min(...allValues);

	const squish = 0.8;
	const squish_center = 0.8;

	const zeroLine = Math.max(0, Math.min(1, min / (min - max)));
	console.log("Zero Line:", zeroLine);

	// Outer housing
	const chartContent = document.createElement("div");
	chartContent.className = "chart-content";

	// Add zero line
	const zeroLineElement = document.createElement("div");
	zeroLineElement.className = "zero-line";
	zeroLineElement.style.left = `${
		100 * (zeroLine * squish + squish_center * (1 - squish))
	}%`;
	chartContent.appendChild(zeroLineElement);

	// Add yearly data
	yearlyData.forEach((data) => {
		const yearDiv = document.createElement("div");
		yearDiv.className = "chart-year";

		const yearLabel = document.createElement("div");
		yearLabel.className = "year-label";
		yearLabel.textContent = data.date;
		yearDiv.appendChild(yearLabel);

		const bars = document.createElement("div");
		bars.className = "bars";
		bars.style.width = `${100 * squish}%`;
		bars.style.left = `${(1 - squish) * squish_center * 100}%`; // Center the bars

		const revenueBar = createBar(
			data.revenue,
			min,
			max,
			zeroLine,
			"revenue"
		);
		const earningsBar = createBar(
			data.earnings,
			min,
			max,
			zeroLine,
			"earnings"
		);

		bars.appendChild(revenueBar);
		bars.appendChild(earningsBar);
		yearDiv.appendChild(bars);
		chartContent.appendChild(yearDiv);
	});

	chartDiv.appendChild(chartContent);

	const legend = document.createElement("div");
	legend.className = "chart-legend";
	legend.innerHTML = `
        <div class="legend-item">
            <span class="legend-color revenue"></span> Revenue
        </div>
        <div class="legend-item">
            <span class="legend-color earnings"></span> Earnings
        </div>
    `;
	chartDiv.appendChild(legend);
}

function createBar(value, min, max, zeroLine, className) {
	const bar = document.createElement("div");
	bar.className = `chart-bar ${className}`;

	const totalRange = Math.max(max, 0) - Math.min(min, 0);

	const width = (value / totalRange) * 100;
	if (value >= 0) {
		bar.style.left = `${zeroLine * 100}%`;
		bar.style.width = `${width}%`;
		bar.style.textAlign = "right";
	} else {
		bar.style.right = `${(1 - zeroLine) * 100}%`;
		bar.style.width = `${-width}%`;
		bar.style.textAlign = "left";
	}

	bar.textContent = `$${(value / 1e9).toFixed(2)}B`;
	return bar;
}

function formatValue(metric, value) {
	if (typeof value === "undefined" || value === null) return "N/A";

	switch (metric) {
		case "marketCap":
		case "enterpriseValue":
		case "freeCashflow":
		case "operatingCashflow":
		case "revenue":
		case "earnings":
			return `$${(value / 1e9).toFixed(2)}B`;
		case "trailingPE":
		case "forwardPE":
		case "priceToBook":
			return value.toFixed(2);
		case "dividendYield":
			return `${(value * 100).toFixed(2)}%`;
		default:
			return value.toString();
	}
}

function updateURLWithState() {
	const state = {
		p1: document.getElementById("property1").value,
		p2: document.getElementById("property2").value,
		l1: document.getElementById("logScale1").checked,
		l2: document.getElementById("logScale2").checked,
		f: Array.from(document.querySelectorAll(".filter")).map((filter) => {
			const id = filter.dataset.filterId;
			const left = document.getElementById(`filterLeft${id}`).value;
			const right = document.getElementById(`filterRight${id}`).value;
			const comparison = document.getElementById(
				`filterComparison${id}`
			).textContent;

			// If comparison is '≤', swap left and right
			return comparison === "≤" ? [right, left] : [left, right];
		}),
	};

	// Only include non-default values
	const compactState = {};
	for (const [key, value] of Object.entries(state)) {
		if (JSON.stringify(value) !== JSON.stringify(defaultState[key])) {
			compactState[key] = value;
		}
	}

	const stateString = JSON.stringify(compactState);
	const compressedState = LZString.compressToEncodedURIComponent(stateString);
	history.pushState(state, "", `?s=${compressedState}`);
}

// Function to read state from URL
function readStateFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const compressedState = urlParams.get("s");

	if (compressedState) {
		const stateString =
			LZString.decompressFromEncodedURIComponent(compressedState);
		const state = { ...defaultState, ...JSON.parse(stateString) };

		document.getElementById("property1").value = state.p1;
		document.getElementById("property2").value = state.p2;
		document.getElementById("logScale1").checked = state.l1;
		document.getElementById("logScale2").checked = state.l2;

		// Clear existing filters
		document.getElementById("filters").innerHTML = "";

		// Add filters from state
		state.f.forEach((filter) => {
			addFilter();
			const newFilter = document.querySelector(".filter:last-child");
			const id = newFilter.dataset.filterId;
			document.getElementById(`filterLeft${id}`).value = filter[0];
			document.getElementById(`filterRight${id}`).value = filter[1];
		});

		return true;
	}

	return false;
}

// Remove stock from tracked stocks
function removeStock(ticker) {
	trackedStocks = trackedStocks.filter((t) => t !== ticker);
	updateTrackedStocksList();
	updatePlot(tickerInfo, secInfo, trackedStocks);
}

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", init);

export {
	tickerInfo,
	removeFilter,
	secInfo,
	numericalProperties,
	updateURLWithState,
	trackedStocks,
	handleStockClick,
	bestFitState,
	selectedSectors,
	selectedIndustries,
};
