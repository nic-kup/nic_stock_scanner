import { handleStockClick, updateURLWithState } from "./script.js";

// Helper functions
let sectorColors = {};

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

// Helper function to check if a value is a valid number
function isValidNumber(value) {
	return typeof value === "number" && isFinite(value) && !isNaN(value);
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

function updatePlot(tickerInfo, secInfo, trackedStocks, resetZoom = false) {
	console.log("Updating plot...");
	const prop1 = document.getElementById("property1").value;
	const prop2 = document.getElementById("property2").value;
	const logScale1 = document.getElementById("logScale1").checked;
	const logScale2 = document.getElementById("logScale2").checked;
	const colorBySector = document.getElementById("colorBySector").checked;
	const showDiagonal = document.getElementById("showDiagonal").checked;
	const showBestFit = document.getElementById("showBestFit").checked;

	const currentLayout = document.getElementById("plotDiv").layout;

	console.log("Selected properties:", prop1, prop2);

	const data = {};
	const sectors = new Set();
	let allX = [];
	let allY = [];

	// Set to keep track of plotted tickers
	const plottedTickers = new Set();

	function addDataPoint(ticker, x, y, sector, isTracked) {
		if (!plottedTickers.has(ticker)) {
			plottedTickers.add(ticker);

			if (isTracked) {
				return;
			}

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
	const selectedIndustriesElement =
		document.getElementById("selectedIndustries");
	const selectedIndustries = Array.from(
		selectedIndustriesElement.children
	).map((child) => child.dataset.industry);

	for (const [ticker, info] of Object.entries(tickerInfo)) {
		if (
			selectedIndustries.length === 0 ||
			(selectedIndustries.includes(secInfo[ticker].industry) &&
				prop1 in info &&
				prop2 in info)
		) {
			const x = info[prop1];
			const y = info[prop2];

			if (isValidNumber(x) && isValidNumber(y)) {
				let passesAllFilters = true;

				// Only apply filters if there are any
				if (filters.length > 0) {
					for (const filter of filters) {
						const filterId = filter.dataset.filterId;
						const leftInput = document.getElementById(
							`filterLeft${filterId}`
						);
						const rightInput = document.getElementById(
							`filterRight${filterId}`
						);
						const comparisonButton = document.getElementById(
							`filterComparison${filterId}`
						);

						// Check if all filter elements exist
						if (leftInput && rightInput && comparisonButton) {
							const leftValue = leftInput.value.trim();
							const rightValue = rightInput.value.trim();
							const comparison = comparisonButton.textContent;

							// Skip empty filters
							if (leftValue === "" || rightValue === "") {
								continue;
							}

							let leftNumber = parseFloat(leftValue);
							let rightNumber = parseFloat(rightValue);

							if (isNaN(leftNumber)) {
								leftNumber = info[leftValue];
							}
							if (isNaN(rightNumber)) {
								rightNumber = info[rightValue];
							}

							if (
								isValidNumber(leftNumber) &&
								isValidNumber(rightNumber)
							) {
								if (
									comparison === "≥" &&
									leftNumber < rightNumber
								) {
									passesAllFilters = false;
									break;
								} else if (
									comparison === "≤" &&
									leftNumber > rightNumber
								) {
									passesAllFilters = false;
									break;
								}
							} else {
								// If we can't compare the values, we exclude the item
								passesAllFilters = false;
								break;
							}
						}
					}
				}

				if (passesAllFilters) {
					if ((!logScale1 || x > 0) && (!logScale2 || y > 0)) {
						const sector = secInfo[ticker]?.sector || "Unknown";
						sectors.add(sector);
						const isTracked = trackedStocks.includes(ticker);
						addDataPoint(ticker, x, y, sector, isTracked);
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
		// hoverinfo: "none",
		// hovertemplate: null,
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
		marker: {
			color: "red",
			size: 10,
			line: { width: 2, color: "DarkSlateGrey" },
		},
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
		xaxis: {
			title: prop1,
			type: logScale1 ? "log" : "linear",
			range: resetZoom
				? undefined
				: currentLayout
				? currentLayout.xaxis.range
				: undefined,
		},
		yaxis: {
			title: prop2,
			type: logScale2 ? "log" : "linear",
			range: resetZoom
				? undefined
				: currentLayout
				? currentLayout.yaxis.range
				: undefined,
		},
		hovermode: "closest",
		legend: {
			orientation: "h",
			yanchor: "bottom",
			y: -0.35,
			xanchor: "center",
			x: 0.5,
		},
	};

	Plotly.newPlot("plotDiv", plotData, layout).then(function () {
		var myPlot = document.getElementById("plotDiv");

		myPlot.on("plotly_click", function (data) {
			if (data.points.length > 0) {
				var clickPoint = data.points[0];
				var ticker = clickPoint.text;
				handleStockClick(ticker);
			}
		});
		updateURLWithState();
	});
	console.log("Plot updated.");
}

export { updatePlot };
