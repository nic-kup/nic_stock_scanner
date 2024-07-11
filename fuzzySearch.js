// fuzzySearch.js

function fuzzySearch(query, list) {
	return list.filter((item) =>
		item.toLowerCase().includes(query.toLowerCase())
	);
}

function handleFuzzySearch(
	inputId,
	resultsId,
	numericalProperties,
	updatePlotFunction
) {
	let currentFocus = -1;

	function setupSearch() {
		const input = document.getElementById(inputId);
		const results = document.getElementById(resultsId);

		if (!input || !results) {
			console.error("SetupSearch failed. Retrying in soon.");
			setTimeout(setupSearch, 500);
			return;
		}

		input.addEventListener("input", function () {
			const query = this.value;
			const matches = fuzzySearch(query, numericalProperties);
			updateResults(matches);
		});

		input.addEventListener("keydown", function (e) {
			const items = results.getElementsByClassName("search-result");
			if (items.length === 0) return;

			if (e.key === "ArrowDown") {
				currentFocus++;
				addActive(items);
				e.preventDefault();
			} else if (e.key === "ArrowUp") {
				currentFocus--;
				addActive(items);
				e.preventDefault();
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (currentFocus > -1) {
					if (items[currentFocus]) {
						selectItem(items[currentFocus]);
					}
				}
			}
		});

		results.addEventListener("click", function (e) {
			if (e.target.classList.contains("search-result")) {
				selectItem(e.target);
			}
		});

		// Close results when clicking outside
		document.addEventListener("click", function (e) {
			if (e.target !== input && e.target !== results) {
				results.innerHTML = "";
				currentFocus = -1;
			}
		});
	}

	function updateResults(matches) {
		const results = document.getElementById(resultsId);
		if (matches.length === 0) {
			results.innerHTML =
				'<div class="no-results">No matches found</div>';
		} else {
			results.innerHTML = matches
				.map(
					(match, index) =>
						`<div class="search-result" data-index="${index}">${match}</div>`
				)
				.join("");
		}
		currentFocus = -1;
	}

	function addActive(items) {
		if (!items || items.length === 0) return false;
		removeActive(items);
		currentFocus = Math.max(0, Math.min(currentFocus, items.length - 1));
		items[currentFocus].classList.add("search-result-active");
	}

	function removeActive(items) {
		for (let i = 0; i < items.length; i++) {
			items[i].classList.remove("search-result-active");
		}
	}

	function selectItem(item) {
		const input = document.getElementById(inputId);
		input.value = item.textContent;
		document.getElementById(resultsId).innerHTML = "";
		currentFocus = -1;
		updatePlotFunction();
	}

	// Start the setup process
	setupSearch();
}

function initializeFuzzySearch(numericalProperties, updatePlotFunction) {
	handleFuzzySearch(
		"property1",
		"property1Results",
		numericalProperties,
		updatePlotFunction
	);
	handleFuzzySearch(
		"property2",
		"property2Results",
		numericalProperties,
		updatePlotFunction
	);
}

export { initializeFuzzySearch, handleFuzzySearch };
