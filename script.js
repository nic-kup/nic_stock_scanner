// Global variables
let tickerInfo = {};
let secInfo = {};
let yearFinData = {};
let numericalProperties = [];
let trackedStocks = []; // Add this line to define trackedStocks

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
		document
			.getElementById("colorBySector")
			.addEventListener("change", () =>
				updatePlot(tickerInfo, secInfo, trackedStocks, false)
			);
		document
			.getElementById("showDiagonal")
			.addEventListener("change", () =>
				updatePlot(tickerInfo, secInfo, trackedStocks, false)
			);
		document
			.getElementById("showBestFit")
			.addEventListener("change", () =>
				updatePlot(tickerInfo, secInfo, trackedStocks, false)
			);

		if (numericalProperties.includes("marketCap")) {
			property1Select.value = "marketCap";
			console.log("Set Property1 to Market Cap.");
		}
		if (numericalProperties.includes("totalCash")) {
			property2Select.value = "totalCash";
			console.log("Set Property2 to Total Cash.");
		}

		console.log("About to initialize fuzzy search...");

		// Initialize fuzzy search with a small delay
		setTimeout(() => {
			initializeFuzzySearch(numericalProperties, () =>
				updatePlot(tickerInfo, secInfo, trackedStocks, true)
			);
		}, 100);

		// Set up filter functionality
		document
			.getElementById("addFilter")
			.addEventListener("click", addFilter);

		// Set up swap properties functionality
		document
			.getElementById("swapProperties")
			.addEventListener("click", swapProperties);

		// Set up add stock functionality
		document
			.getElementById("addStockButton")
			.addEventListener("click", addStock);

		// Initial plot
		updatePlot(tickerInfo, secInfo, trackedStocks);

		// Update last updated timestamp
		await updateLastUpdated();
	} catch (error) {
		console.error("Error initializing application:", error);
		document.body.innerHTML = `<h1>Error initializing application</h1><p>${error.message}</p>`;
	}
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
function addStock() {
	const ticker = document.getElementById("addStock").value.toUpperCase();
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
	trackedStocks,
	handleStockClick,
};
