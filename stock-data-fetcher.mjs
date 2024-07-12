import fs from "fs/promises";
import { createReadStream } from "fs";
import csv from "csv-parser";
import yahooFinance from "yahoo-finance2";

const tickersFilePath = "all_usd_tickers.csv";
const lastUpdatedFilePath = "last_updated.json";
const numericalProperties = [
	"52WeekChange",
	"SandP52WeekChange",
	"ask",
	"askSize",
	"auditRisk",
	"averageDailyVolume10Day",
	"averageVolume",
	"averageVolume10days",
	"beta",
	"bid",
	"bidSize",
	"boardRisk",
	"bookValue",
	"cash",
	"compensationAsOfEpochDate",
	"compensationRisk",
	"currentPrice",
	"currentRatio",
	"dateShortInterest",
	"dayHigh",
	"dayLow",
	"debtToEquity",
	"dividendRate",
	"dividendYield",
	"earningsGrowth",
	"earningsQuarterlyGrowth",
	"ebitda",
	"ebitdaMargins",
	"enterpriseToEbitda",
	"enterpriseToRevenue",
	"enterpriseValue",
	"exDividendDate",
	"fiftyDayAverage",
	"fiftyTwoWeekHigh",
	"fiftyTwoWeekLow",
	"firstTradeDateEpochUtc",
	"fiveYearAvgDividendYield",
	"floatShares",
	"forwardEps",
	"forwardPE",
	"freeCashflow",
	"fullTimeEmployees",
	"grossMargins",
	"grossProfits",
	"heldPercentInsiders",
	"heldPercentInstitutions",
	"impliedSharesOutstanding",
	"lastDividendDate",
	"lastDividendValue",
	"lastFiscalYearEnd",
	"lastSplitDate",
	"marketCap",
	"maxAge",
	"mostRecentQuarter",
	"netIncome",
	"netIncomeToCommon",
	"netTangibleAssets",
	"nextFiscalYearEnd",
	"numberOfAnalystOpinions",
	"open",
	"operatingCashflow",
	"operatingMargins",
	"overallRisk",
	"payoutRatio",
	"pegRatio",
	"previousClose",
	"priceToBook",
	"priceToSalesTrailing12Months",
	"profitMargins",
	"quickRatio",
	"recommendationMean",
	"regularMarketDayHigh",
	"regularMarketDayLow",
	"regularMarketOpen",
	"regularMarketPreviousClose",
	"regularMarketVolume",
	"returnOnAssets",
	"returnOnEquity",
	"revenueGrowth",
	"revenuePerShare",
	"shareHolderRightsRisk",
	"sharesOutstanding",
	"sharesPercentSharesOut",
	"sharesShort",
	"sharesShortPreviousMonthDate",
	"sharesShortPriorMonth",
	"shortPercentOfFloat",
	"shortRatio",
	"targetHighPrice",
	"targetLowPrice",
	"targetMeanPrice",
	"targetMedianPrice",
	"totalAssets",
	"totalCash",
	"totalCashPerShare",
	"totalCurrentAssets",
	"totalDebt",
	"totalRevenue",
	"trailingAnnualDividendRate",
	"trailingAnnualDividendYield",
	"trailingEps",
	"trailingPE",
	"trailingPegRatio",
	"twoHundredDayAverage",
	"volume",
];
// Add a delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkLastUpdated() {
	try {
		const data = await fs.readFile(lastUpdatedFilePath, "utf8");
		const { timestamp } = JSON.parse(data);
		const lastUpdated = new Date(timestamp);
		console.log("Last Update:", lastUpdated);
		const now = new Date();
		console.log("Date Now:", now);
		const hoursSinceLastUpdate = (now - lastUpdated) / (1000 * 60 * 60);
		console.log(hoursSinceLastUpdate);
		return hoursSinceLastUpdate > 4;
	} catch (error) {
		console.error("Error reading last_updated.json:", error);
		return true; // If there's an error reading the file, proceed with update
	}
}

async function updateLastUpdated() {
	const timestamp = new Date().toISOString();
	await fs.writeFile(
		lastUpdatedFilePath,
		JSON.stringify({ timestamp }, null, 2)
	);
	console.log(`Timestamp updated: ${timestamp}`);
}

async function fetchStockData() {
	console.log("Checking time since last update.");
	const shouldUpdate = await checkLastUpdated();
	if (!shouldUpdate) {
		console.log("Data is less than 4 hours old.");
		return;
	}
	const tickers = [];
	const tickerInfo = {};
	const secInfo = {};
	const validTickers = [];
	const errors = {};

	// Read tickers from CSV
	await new Promise((resolve, reject) => {
		createReadStream(tickersFilePath)
			.pipe(csv(["ticker"]))
			.on("data", (row) => tickers.push(row.ticker))
			.on("end", resolve)
			.on("error", reject);
	});

	console.log(`Fetching data for ${tickers.length} tickers...`);

	for (let i = 0; i < tickers.length; i++) {
		const ticker = tickers[i];
		try {
			// Add a delay between requests to avoid rate limiting
			await delay(500); // 1 second delay

			const info = await yahooFinance.quoteSummary(ticker, {
				modules: [
					"price",
					"summaryProfile",
					"summaryDetail",
					"balanceSheetHistory",
					"financialData",
					"defaultKeyStatistics",
				],
			});

			if (
				info.price?.currency === "USD" &&
				info.price?.marketCap !== undefined
			) {
				secInfo[ticker] = {
					sector: info.summaryProfile?.sector || "N/A",
					industry: info.summaryProfile?.industry || "N/A",
				};

				tickerInfo[ticker] = {};
				for (const prop of numericalProperties) {
					if (info.financialData && prop in info.financialData) {
						tickerInfo[ticker][prop] = info.financialData[prop];
					} else if (
						info.summaryDetail &&
						prop in info.summaryDetail
					) {
						tickerInfo[ticker][prop] = info.summaryDetail[prop];
					} else if (
						info.summaryProfile &&
						prop in info.summaryProfile
					) {
						tickerInfo[ticker][prop] = info.summaryProfile[prop];
					} else if (
						info.defaultKeyStatistics &&
						prop in info.defaultKeyStatistics
					) {
						tickerInfo[ticker][prop] =
							info.defaultKeyStatistics[prop];
					} else if (
						info.balanceSheetHistory &&
						prop in info.balanceSheetHistory
					) {
						tickerInfo[ticker][prop] =
							info.balanceSheetHistory[prop];
					}
				}

				// Only add to validTickers if we have some financial data
				if (Object.keys(tickerInfo[ticker]).length > 0) {
					validTickers.push(ticker);
				} else {
					errors[ticker] = "No financial data available";
				}
			} else {
				errors[ticker] =
					"Currency is not USD or information not available";
			}
		} catch (error) {
			errors[ticker] = error.message;
			console.error(`Error fetching data for ${ticker}:`, error.message);

			// If we encounter a rate limit error, wait for a longer time
			if (error.message.includes("Too Many Requests")) {
				console.log("Rate limit reached. Waiting for 60 seconds...");
				await delay(60000); // Wait for 60 seconds
			}
		}
		if (i % 200 === 0 || i === tickers.length - 1) {
			console.log(`Progress: ${i + 1}/${tickers.length}`);
		}
	}

	// Save final results to JSON files
	await fs.writeFile("ticker_info.json", JSON.stringify(tickerInfo, null, 2));
	await fs.writeFile("sec_info.json", JSON.stringify(secInfo, null, 2));
	await fs.writeFile(
		"valid_tickers.json",
		JSON.stringify(validTickers, null, 2)
	);
	await fs.writeFile("errors.json", JSON.stringify(errors, null, 2));

	console.log(`Data fetching complete. JSON files have been created.`);
	console.log(
		`Successfully fetched data for ${validTickers.length} tickers.`
	);
	console.log(
		`Encountered errors for ${
			Object.keys(errors).length
		} tickers. See errors.json for details.`
	);
	await updateLastUpdated();
}

fetchStockData().catch(console.error);
