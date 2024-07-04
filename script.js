// Global variables
let tickerInfo = {};
let secInfo = {};
let trackedStocks = [];
let numericalProperties = [];
let sectorColors = {};

// Fetch JSON data
async function fetchJSONData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
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
        tickerInfo = await fetchJSONData('ticker_info.json');
        secInfo = await fetchJSONData('sec_info.json');

        console.log("Ticker Info:", tickerInfo);
        console.log("Sector Info:", secInfo);

        // Get numerical properties
        const sampleTicker = Object.keys(tickerInfo)[0];
        numericalProperties = Object.keys(tickerInfo[sampleTicker]).filter(prop => 
            typeof tickerInfo[sampleTicker][prop] === 'number');

        console.log("Numerical Properties:", numericalProperties);

        // Populate dropdowns
        populateDropdowns();

        // Set up event listeners
        document.getElementById('property1').addEventListener('change', updatePlot);
        document.getElementById('property2').addEventListener('change', updatePlot);
        document.getElementById('filterProperty').addEventListener('change', updatePlot);
        document.getElementById('filterValue').addEventListener('input', updatePlot);
        document.getElementById('filterComparison').addEventListener('change', updatePlot);
        document.getElementById('logScale1').addEventListener('change', updatePlot);
        document.getElementById('logScale2').addEventListener('change', updatePlot);
        document.getElementById('colorBySector').addEventListener('change', updatePlot);
        document.getElementById('showDiagonal').addEventListener('change', updatePlot);
        document.getElementById('swapProperties').addEventListener('click', swapProperties);
        document.getElementById('addStockButton').addEventListener('click', addStock);

        // Initial plot
        updatePlot();
    } catch (error) {
        console.error("Error initializing application:", error);
    }
}

// Populate dropdown menus
function populateDropdowns() {
    console.log("Populating dropdowns...");
    const dropdowns = ['property1', 'property2', 'filterProperty'];
    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = ''; // Clear existing options
        numericalProperties.forEach(prop => {
            const option = document.createElement('option');
            option.value = prop;
            option.textContent = prop;
            select.appendChild(option);
        });
    });
    document.getElementById('filterProperty').insertAdjacentHTML('afterbegin', '<option value="None">None</option>');
    console.log("Dropdowns populated.");
}

// Update the plot
function updatePlot() {
    console.log("Updating plot...");
    const prop1 = document.getElementById('property1').value;
    const prop2 = document.getElementById('property2').value;
    const filterProp = document.getElementById('filterProperty').value;
    const filterValue = parseFloat(document.getElementById('filterValue').value);
    const filterComparison = document.getElementById('filterComparison').value;
    const logScale1 = document.getElementById('logScale1').checked;
    const logScale2 = document.getElementById('logScale2').checked;
    const colorBySector = document.getElementById('colorBySector').checked;
    const showDiagonal = document.getElementById('showDiagonal').checked;

    console.log("Selected properties:", prop1, prop2);
    console.log("Filter:", filterProp, filterValue, filterComparison);

    const data = [];
    const sectors = new Set();

    for (const [ticker, info] of Object.entries(tickerInfo)) {
        if (prop1 in info && prop2 in info && (filterProp === 'None' || filterProp in info)) {
            const x = info[prop1];
            const y = info[prop2];
            const filterVal = filterProp !== 'None' ? info[filterProp] : 0;
            
            if (isValidNumber(x) && isValidNumber(y) && isValidNumber(filterVal)) {
                if (applyFilter(filterVal, filterValue, filterComparison)) {
                    const sector = secInfo[ticker]?.sector || 'Unknown';
                    sectors.add(sector);
                    
                    if (!data[sector]) {
                        data[sector] = { x: [], y: [], text: [], type: 'scatter', mode: 'markers', name: sector };
                    }
                    
                    data[sector].x.push(x);
                    data[sector].y.push(y);
                    data[sector].text.push(ticker);
                }
            }
        }
    }

    console.log("Processed data:", data);

    // Assign colors to sectors
    assignSectorColors(sectors);

    // Convert data object to array and assign colors
    const plotData = Object.entries(data).map(([sector, sectorData]) => ({
        ...sectorData,
        marker: { color: sectorColors[sector] }
    }));

    // Add traced stocks
    const tracedData = {
        x: [],
        y: [],
        text: [],
        type: 'scatter',
        mode: 'markers',
        name: 'Tracked Stocks',
        marker: { color: 'red', size: 10 }
    };

    trackedStocks.forEach(ticker => {
        if (ticker in tickerInfo && prop1 in tickerInfo[ticker] && prop2 in tickerInfo[ticker]) {
            tracedData.x.push(tickerInfo[ticker][prop1]);
            tracedData.y.push(tickerInfo[ticker][prop2]);
            tracedData.text.push(ticker);
        }
    });

    if (tracedData.x.length > 0) {
        plotData.push(tracedData);
    }

    // Add diagonal line if requested
    if (showDiagonal) {
        const allX = plotData.flatMap(d => d.x);
        const allY = plotData.flatMap(d => d.y);
        const min = Math.min(...allX, ...allY);
        const max = Math.max(...allX, ...allY);
        plotData.push({
            x: [min, max],
            y: [min, max],
            type: 'scatter',
            mode: 'lines',
            name: 'x = y',
            line: { color: 'black', dash: 'dash' }
        });
    }

    const layout = {
        title: `${prop2} vs ${prop1}`,
        xaxis: { title: prop1, type: logScale1 ? 'log' : 'linear' },
        yaxis: { title: prop2, type: logScale2 ? 'log' : 'linear' },
        hovermode: 'closest'
    };

    console.log("Plotting data:", plotData);
    console.log("Layout:", layout);

    Plotly.newPlot('plotDiv', plotData, layout);
    console.log("Plot updated.");
}

// Helper function to check if a value is a valid number
function isValidNumber(value) {
    return typeof value === 'number' && isFinite(value);
}

// Apply filter to data
function applyFilter(value, filterValue, comparison) {
    if (isNaN(filterValue)) return true;
    switch (comparison) {
        case '>': return value > filterValue;
        case '<': return value < filterValue;
        case '==': return value == filterValue;
        default: return true;
    }
}

// Assign colors to sectors
function assignSectorColors(sectors) {
    const colors = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    [...sectors].forEach((sector, index) => {
        if (!(sector in sectorColors)) {
            sectorColors[sector] = colors[index % colors.length];
        }
    });
}

// Swap properties
function swapProperties() {
    const prop1 = document.getElementById('property1');
    const prop2 = document.getElementById('property2');
    [prop1.value, prop2.value] = [prop2.value, prop1.value];
    updatePlot();
}

// Add stock to tracked stocks
function addStock() {
    const ticker = document.getElementById('addStock').value.toUpperCase();
    if (ticker in tickerInfo && !trackedStocks.includes(ticker)) {
        trackedStocks.push(ticker);
        updateTrackedStocksList();
        updatePlot();
    }
    document.getElementById('addStock').value = '';
}

// Update tracked stocks list
function updateTrackedStocksList() {
    const list = document.getElementById('trackedStocksList');
    list.innerHTML = '';
    trackedStocks.forEach(ticker => {
        const li = document.createElement('li');
        li.textContent = ticker;
        li.addEventListener('click', () => removeStock(ticker));
        list.appendChild(li);
    });
}

// Remove stock from tracked stocks
function removeStock(ticker) {
    trackedStocks = trackedStocks.filter(t => t !== ticker);
    updateTrackedStocksList();
    updatePlot();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);