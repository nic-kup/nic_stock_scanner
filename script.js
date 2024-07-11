// Global variables
let tickerInfo = {};
let secInfo = {};
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
	const filtersDiv = document.getElementById("filters");
	const newFilter = document.createElement("div");
	newFilter.className = "filter";
	newFilter.dataset.filterId = filterCount;
	newFilter.innerHTML = `
        <div class="input-wrapper">
            <input type="text" id="filterProperty${filterCount}" class="filterProperty fuzzy-search" placeholder="Filter Property" autocomplete="off">
            <div id="filterPropertyResults${filterCount}" class="search-results"></div>
        </div>
        <input type="number" id="filterValue${filterCount}" class="filterValue" placeholder="Filter Value">
        <button id="filterComparison${filterCount}" class="filterComparison">≥</button>
        <button class="removeFilter" onclick="removeFilter(${filterCount})">Remove</button>
    `;
	filtersDiv.appendChild(newFilter);

	// Initialize fuzzy search for the new filter property
	handleFuzzySearch(
		`filterProperty${filterCount}`,
		`filterPropertyResults${filterCount}`,
		numericalProperties,
		() => updatePlot(tickerInfo, secInfo, trackedStocks, false)
	);

	// Add event listener for the filter value input
	document
		.getElementById(`filterValue${filterCount}`)
		.addEventListener("input", () =>
			updatePlot(tickerInfo, secInfo, trackedStocks, false)
		);

	// Add event listener for the comparison button
	const comparisonButton = document.getElementById(
		`filterComparison${filterCount}`
	);
	comparisonButton.addEventListener("click", function () {
		this.textContent = this.textContent === "≥" ? "≤" : "≥";
		updatePlot(tickerInfo, secInfo, trackedStocks, false);
	});

	filterCount++;
	updatePlot(tickerInfo, secInfo, trackedStocks);
}

function removeFilter(id) {
	const filterToRemove = document.querySelector(
		`.filter[data-filter-id="${id}"]`
	);
	if (filterToRemove) {
		filterToRemove.remove();
		updatePlot(tickerInfo, secInfo, trackedStocks);
	}
}

// Add this helper function to populate filter dropdowns
// function populateFilterDropdown(dropdown) {
// 	dropdown.innerHTML = '<option value="None">None</option>';
// 	numericalProperties.forEach((prop) => {
// 		const option = document.createElement("option");
// 		option.value = prop;
// 		option.textContent = prop;
// 		dropdown.appendChild(option);
// 	});
// }

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
		} ago`;
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
	const infoTable = document
		.getElementById("stockInfoTable")
		.querySelector("tbody");

	infoTitle.textContent = `${ticker} - ${secInfo[ticker]?.sector}`;
	infoTable.innerHTML = "";

	infoMetrics.forEach((metric) => {
		const row = infoTable.insertRow();
		const cell1 = row.insertCell(0);
		const cell2 = row.insertCell(1);

		cell1.textContent = metric;
		const value = tickerInfo[ticker][metric];
		cell2.textContent = formatValue(metric, value);
	});

	infoContainer.style.display = "block";
}

function formatValue(metric, value) {
	if (typeof value === "undefined" || value === null) return "N/A";

	switch (metric) {
		case "marketCap":
		case "enterpriseValue":
		case "freeCashflow":
		case "operatingCashflow":
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
	secInfo,
	numericalProperties,
	trackedStocks,
	handleStockClick,
};
