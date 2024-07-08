// Global variables
let tickerInfo = {};
let secInfo = {};
let trackedStocks = [];
let numericalProperties = [];
let sectorColors = {};

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

		// Get numerical properties using AAPL as the sample ticker
		const sampleTicker = "AAPL";
		if (!tickerInfo[sampleTicker]) {
			throw new Error(`Sample ticker ${sampleTicker} not found in data`);
		}
		numericalProperties = Object.keys(tickerInfo[sampleTicker]).filter(
			(prop) => typeof tickerInfo[sampleTicker][prop] === "number"
		);

		// Populate dropdowns
		populateDropdowns();

		// Set up event listeners
		console.log("Setting up event listeners");
		document
			.getElementById("property1")
			.addEventListener("change", updatePlot);
		document
			.getElementById("property2")
			.addEventListener("change", updatePlot);
		document
			.getElementById("addFilter")
			.addEventListener("click", addFilter);
		document
			.getElementById("logScale1")
			.addEventListener("change", updatePlot);
		document
			.getElementById("logScale2")
			.addEventListener("change", updatePlot);
		document
			.getElementById("colorBySector")
			.addEventListener("change", updatePlot);
		document
			.getElementById("showDiagonal")
			.addEventListener("change", updatePlot);
		document
			.getElementById("showBestFit")
			.addEventListener("change", updatePlot);
		document
			.getElementById("swapProperties")
			.addEventListener("click", swapProperties);
		document
			.getElementById("addStockButton")
			.addEventListener("click", addStock);

		// Set default values
		const property1Select = document.getElementById("property1");
		const property2Select = document.getElementById("property2");
		if (numericalProperties.includes("marketCap")) {
			property1Select.value = "marketCap";
			console.log("Set Property1 to Market Cap.");
		} else {
			console.log("Market Cap not found?");
		}
		if (numericalProperties.includes("totalCash")) {
			property2Select.value = "totalCash";
			console.log("Set Property2 to Total Cash.");
		}

		document.getElementById("logScale1").value = true;
		document.getElementById("logScale2").value = true;

		// Initial plot
		updatePlot();

		// Update "Last Updated"
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
        <label for="filterProperty${filterCount}">Filter Property:</label>
        <select id="filterProperty${filterCount}" class="filterProperty"></select>
        <input type="number" id="filterValue${filterCount}" class="filterValue" placeholder="Filter Value">
        <select id="filterComparison${filterCount}" class="filterComparison">
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value="==">=</option>
        </select>
        <button class="removeFilter" onclick="removeFilter(${filterCount})">Remove</button>
    `;
	filtersDiv.appendChild(newFilter);

	// Populate the new dropdown
	const newDropdown = document.getElementById(`filterProperty${filterCount}`);
	populateFilterDropdown(newDropdown);

	// Add event listeners for the new filter inputs
	document
		.getElementById(`filterProperty${filterCount}`)
		.addEventListener("change", updatePlot);
	document
		.getElementById(`filterValue${filterCount}`)
		.addEventListener("input", updatePlot);
	document
		.getElementById(`filterComparison${filterCount}`)
		.addEventListener("change", updatePlot);

	filterCount++;
	updatePlot();
}

function removeFilter(id) {
	const filterToRemove = document.querySelector(
		`.filter[data-filter-id="${id}"]`
	);
	if (filterToRemove) {
		filterToRemove.remove();
		updatePlot();
	}
}

// Populate dropdown menus
function populateDropdowns() {
	console.log("Populating dropdowns...");
	const dropdowns = ["property1", "property2"];
	dropdowns.forEach((id) => {
		const select = document.getElementById(id);
		select.innerHTML = ""; // Clear existing options
		numericalProperties.forEach((prop) => {
			const option = document.createElement("option");
			option.value = prop;
			option.textContent = prop;
			select.appendChild(option);
		});
	});
	console.log("Dropdowns populated.");
}

// Add this helper function to populate filter dropdowns
function populateFilterDropdown(dropdown) {
	dropdown.innerHTML = '<option value="None">None</option>';
	numericalProperties.forEach((prop) => {
		const option = document.createElement("option");
		option.value = prop;
		option.textContent = prop;
		dropdown.appendChild(option);
	});
}

// Helper function to transform data based on log scale
function transformData(xData, yData, isLogScaleX, isLogScaleY) {
	const transformedX = [];
	const transformedY = [];

	for (let i = 0; i < xData.length; i++) {
		if ((!isLogScaleX || xData[i] > 0) && (!isLogScaleY || yData[i] > 0)) {
			transformedX.push(isLogScaleX ? Math.log(xData[i]) : xData[i]);
			transformedY.push(isLogScaleY ? Math.log(yData[i]) : yData[i]);
		}
	}

	return { transformedX, transformedY };
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
		} ago`;
	} catch (error) {
		console.error("Error fetching last updated timestamp:", error);
	}
}

function updatePlot() {
	console.log("Updating plot...");
	const prop1 = document.getElementById("property1").value;
	const prop2 = document.getElementById("property2").value;
	const logScale1 = document.getElementById("logScale1").checked;
	const logScale2 = document.getElementById("logScale2").checked;
	const colorBySector = document.getElementById("colorBySector").checked;
	const showDiagonal = document.getElementById("showDiagonal").checked;
	const showBestFit = document.getElementById("showBestFit").checked;

	console.log("Selected properties:", prop1, prop2);

	const data = {};
	const sectors = new Set();
	let allX = [];
	let allY = [];

	// Set to keep track of plotted tickers
	const plottedTickers = new Set();

	function addDataPoint(ticker, x, y, sector) {
		if (!plottedTickers.has(ticker)) {
			plottedTickers.add(ticker);

			const dataKey = colorBySector ? sector : "All Stocks";
			if (!data[dataKey]) {
				data[dataKey] = {
					x: [],
					y: [],
					text: [],
					type: "scatter",
					mode: "markers",
					name: dataKey,
				};
			}

			data[dataKey].x.push(x);
			data[dataKey].y.push(y);
			data[dataKey].text.push(ticker);

			allX.push(x);
			allY.push(y);
		}
	}

	const filters = document.querySelectorAll(".filter");

	for (const [ticker, info] of Object.entries(tickerInfo)) {
		if (prop1 in info && prop2 in info) {
			const x = info[prop1];
			const y = info[prop2];

			if (isValidNumber(x) && isValidNumber(y)) {
				let passesAllFilters = true;

				// Only apply filters if there are any
				if (filters.length > 0) {
					filters.forEach((filter) => {
						const filterId = filter.dataset.filterId;
						const filterPropElement = document.getElementById(
							`filterProperty${filterId}`
						);
						const filterValueElement = document.getElementById(
							`filterValue${filterId}`
						);
						const filterComparisonElement = document.getElementById(
							`filterComparison${filterId}`
						);

						// Check if all filter elements exist
						if (
							filterPropElement &&
							filterValueElement &&
							filterComparisonElement
						) {
							const filterProp = filterPropElement.value;
							const filterValue = filterValueElement.value;
							const filterComparison =
								filterComparisonElement.value;

							if (
								filterProp !== "None" &&
								filterProp in info &&
								filterValue !== ""
							) {
								const filterVal = info[filterProp];
								if (
									!applyFilter(
										filterVal,
										parseFloat(filterValue),
										filterComparison
									)
								) {
									passesAllFilters = false;
									return false; // Exit the forEach loop early
								}
							}
						}
					});
				}

				if (passesAllFilters) {
					if ((!logScale1 || x > 0) && (!logScale2 || y > 0)) {
						const sector = secInfo[ticker]?.sector || "Unknown";
						sectors.add(sector);
						addDataPoint(ticker, x, y, sector);
					}
				}
			}
		}
	}

	// Assign colors to sectors
	assignSectorColors(sectors);

	// Convert data object to array and assign colors
	const plotData = Object.entries(data).map(([key, sectorData]) => ({
		...sectorData,
		marker: { color: colorBySector ? sectorColors[key] : "blue" },
		hovertemplate: `<b>%{text}</b><br>${prop1}: %{x}<br>${prop2}: %{y}<extra></extra>`,
	}));

	// Add traced stocks
	const tracedData = {
		x: [],
		y: [],
		text: [],
		type: "scatter",
		mode: "markers",
		name: "Tracked Stocks",
		marker: { color: "red", size: 10 },
		hovertemplate: `<b>%{text}</b><br>${prop1}: %{x}<br>${prop2}: %{y}<extra></extra>`,
	};

	trackedStocks.forEach((ticker) => {
		if (
			ticker in tickerInfo &&
			prop1 in tickerInfo[ticker] &&
			prop2 in tickerInfo[ticker]
		) {
			const x = tickerInfo[ticker][prop1];
			const y = tickerInfo[ticker][prop2];
			if ((!logScale1 || x > 0) && (!logScale2 || y > 0)) {
				tracedData.x.push(x);
				tracedData.y.push(y);
				tracedData.text.push(ticker);
				plottedTickers.add(ticker); // Mark as plotted
			}
		}
	});

	if (tracedData.x.length > 0) {
		plotData.push(tracedData);
	}

	// Add diagonal line if requested
	if (showDiagonal) {
		console.log("Generating diagonal.");
		const min = Math.min(...allX, ...allY);
		const max = Math.max(...allX, ...allY);
		plotData.push({
			x: [min, max],
			y: [min, max],
			type: "scatter",
			mode: "lines",
			name: "x = y",
			line: { color: "black", dash: "dash" },
		});
	}

	// Add line of best fit if requested
	if (showBestFit && allX.length > 1) {
		console.log("Calculating Best Fit Line");
		const bestFitLine = calculateBestFitLine(
			allX,
			allY,
			logScale1,
			logScale2
		);
		plotData.push(bestFitLine);
	}

	const layout = {
		title: `${prop2} vs ${prop1}`,
		xaxis: { title: prop1, type: logScale1 ? "log" : "linear" },
		yaxis: { title: prop2, type: logScale2 ? "log" : "linear" },
		hovermode: "closest",
	};

	Plotly.newPlot("plotDiv", plotData, layout);
	console.log("Plot updated.");
}

// Helper function to calculate the best fit line
function calculateBestFitLine(xData, yData, isLogScaleX, isLogScaleY) {
	// Filter out non-positive values for log scales
	const filteredData = xData
		.map((x, i) => [x, yData[i]])
		.filter(([x, y]) => (!isLogScaleX || x > 0) && (!isLogScaleY || y > 0));

	const transformedX = filteredData.map(([x, _]) =>
		isLogScaleX ? Math.log(x) : x
	);
	const transformedY = filteredData.map(([_, y]) =>
		isLogScaleY ? Math.log(y) : y
	);

	const { slope, intercept } = linearRegression(transformedX, transformedY);

	console.log("slope intercept", slope, intercept);

	// Generate points for the best fit line
	const minX = Math.min(...filteredData.map(([x, _]) => x));
	const maxX = Math.max(...filteredData.map(([x, _]) => x));

	const bestFitX = [minX, maxX];
	let bestFitY;

	if (isLogScaleX && isLogScaleY) {
		bestFitY = bestFitX.map((x) =>
			Math.exp(slope * Math.log(x) + intercept)
		);
	} else if (isLogScaleX) {
		bestFitY = bestFitX.map((x) => slope * Math.log(x) + intercept);
	} else if (isLogScaleY) {
		bestFitY = bestFitX.map((x) => Math.exp(slope * x + intercept));
	} else {
		bestFitY = bestFitX.map((x) => slope * x + intercept);
	}

	return {
		x: bestFitX,
		y: bestFitY,
		type: "scatter",
		mode: "lines",
		name: "Best Fit Line",
		line: { color: "red", dash: "solid" },
	};
}

// Helper function to check if a value is a valid number
function isValidNumber(value) {
	return typeof value === "number" && isFinite(value);
}

// Apply filter to data
function applyFilter(value, filterValue, comparison) {
	if (isNaN(filterValue)) return true;
	switch (comparison) {
		case ">":
			return value > filterValue;
		case "<":
			return value < filterValue;
		case "==":
			return value == filterValue;
		default:
			return true;
	}
}

// Assign colors to sectors
function assignSectorColors(sectors) {
	const colors = [
		"#1f77b4",
		"#ff7f0e",
		"#2ca02c",
		"#d62728",
		"#9467bd",
		"#8c564b",
		"#e377c2",
		"#7f7f7f",
		"#bcbd22",
		"#17becf",
	];
	[...sectors].forEach((sector, index) => {
		if (!(sector in sectorColors)) {
			sectorColors[sector] = colors[index % colors.length];
		}
	});
}

// Linear regression function
function linearRegression(x, y) {
	const n = x.length;
	let sumX = 0,
		sumY = 0,
		sumXY = 0,
		sumXX = 0;
	for (let i = 0; i < n; i++) {
		sumX += x[i];
		sumY += y[i];
		sumXY += x[i] * y[i];
		sumXX += x[i] * x[i];
	}
	const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
	const intercept = (sumY - slope * sumX) / n;
	return { slope, intercept };
}

// Swap properties
function swapProperties() {
	const prop1 = document.getElementById("property1");
	const prop2 = document.getElementById("property2");
	[prop1.value, prop2.value] = [prop2.value, prop1.value];
	updatePlot();
}

// Add stock to tracked stocks
function addStock() {
	const ticker = document.getElementById("addStock").value.toUpperCase();
	if (ticker in tickerInfo && !trackedStocks.includes(ticker)) {
		trackedStocks.push(ticker);
		updateTrackedStocksList();
		updatePlot();
	}
	document.getElementById("addStock").value = "";
}

// Update tracked stocks list
function updateTrackedStocksList() {
	const list = document.getElementById("trackedStocksList");
	list.innerHTML = "";
	trackedStocks.forEach((ticker) => {
		const li = document.createElement("li");
		li.textContent = ticker;
		li.addEventListener("click", () => removeStock(ticker));
		list.appendChild(li);
	});
}

// Remove stock from tracked stocks
function removeStock(ticker) {
	trackedStocks = trackedStocks.filter((t) => t !== ticker);
	updateTrackedStocksList();
	updatePlot();
}

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", init);
