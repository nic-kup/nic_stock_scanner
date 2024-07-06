import fs from 'fs/promises';
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import yahooFinance from 'yahoo-finance2';

const tickersFilePath = 'all_usd_tickers.csv';
const numericalProperties = [
 'fullTimeEmployees',
 'auditRisk',
 'boardRisk',
 'compensationRisk',
 'shareHolderRightsRisk',
 'overallRisk',
 'governanceEpochDate',
 'compensationAsOfEpochDate',
 'maxAge',
 'priceHint',
 'previousClose',
 'open',
 'dayLow',
 'dayHigh',
 'regularMarketPreviousClose',
 'regularMarketOpen',
 'regularMarketDayLow',
 'regularMarketDayHigh',
 'dividendRate',
 'dividendYield',
 'exDividendDate',
 'payoutRatio',
 'fiveYearAvgDividendYield',
 'beta',
 'trailingPE',
 'forwardPE',
 'volume',
 'regularMarketVolume',
 'averageVolume',
 'averageVolume10days',
 'averageDailyVolume10Day',
 'bid',
 'ask',
 'bidSize',
 'askSize',
 'marketCap',
 'fiftyTwoWeekLow',
 'fiftyTwoWeekHigh',
 'priceToSalesTrailing12Months',
 'fiftyDayAverage',
 'twoHundredDayAverage',
 'trailingAnnualDividendRate',
 'trailingAnnualDividendYield',
 'enterpriseValue',
 'profitMargins',
 'floatShares',
 'sharesOutstanding',
 'sharesShort',
 'sharesShortPriorMonth',
 'sharesShortPreviousMonthDate',
 'dateShortInterest',
 'sharesPercentSharesOut',
 'heldPercentInsiders',
 'heldPercentInstitutions',
 'shortRatio',
 'shortPercentOfFloat',
 'impliedSharesOutstanding',
 'bookValue',
 'priceToBook',
 'lastFiscalYearEnd',
 'nextFiscalYearEnd',
 'mostRecentQuarter',
 'earningsQuarterlyGrowth',
 'netIncomeToCommon',
 'trailingEps',
 'forwardEps',
 'pegRatio',
 'lastSplitDate',
 'enterpriseToRevenue',
 'enterpriseToEbitda',
 '52WeekChange',
 'SandP52WeekChange',
 'lastDividendValue',
 'lastDividendDate',
 'firstTradeDateEpochUtc',
 'gmtOffSetMilliseconds',
 'currentPrice',
 'targetHighPrice',
 'targetLowPrice',
 'targetMeanPrice',
 'targetMedianPrice',
 'recommendationMean',
 'numberOfAnalystOpinions',
 'totalCash',
 'totalCashPerShare',
 'ebitda',
 'totalDebt',
 'quickRatio',
 'currentRatio',
 'totalRevenue',
 'debtToEquity',
 'revenuePerShare',
 'returnOnAssets',
 'returnOnEquity',
 'freeCashflow',
 'operatingCashflow',
 'earningsGrowth',
 'revenueGrowth',
 'grossMargins',
 'ebitdaMargins',
 'operatingMargins',
 'trailingPegRatio'
];
// Add a delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchStockData() {
  const tickers = [];
  const tickerInfo = {};
  const secInfo = {};
  const validTickers = [];
  const errors = {};

  // Read tickers from CSV
  await new Promise((resolve, reject) => {
    createReadStream(tickersFilePath)
      .pipe(csv(['ticker']))
      .on('data', (row) => tickers.push(row.ticker))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Fetching data for ${tickers.length} tickers...`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    try {
      // Add a delay between requests to avoid rate limiting
      await delay(500); // 1 second delay

      const info = await yahooFinance.quoteSummary(ticker, { modules: ["price", "summaryProfile", "summaryDetail",  "financialData"] });
      
      if (info.price?.currency === 'USD') {
        secInfo[ticker] = {
          sector: info.summaryProfile?.sector || 'N/A',
          industry: info.summaryProfile?.industry || 'N/A'
        };

        tickerInfo[ticker] = {};
        for (const prop of numericalProperties) {
          if (info.financialData && prop in info.financialData) {
            tickerInfo[ticker][prop] = info.financialData[prop];
          }
        }

        // Only add to validTickers if we have some financial data
        if (Object.keys(tickerInfo[ticker]).length > 0) {
          validTickers.push(ticker);
        } else {
          errors[ticker] = 'No financial data available';
        }
      } else {
        errors[ticker] = 'Currency is not USD or information not available';
      }
    } catch (error) {
      errors[ticker] = error.message;
      console.error(`Error fetching data for ${ticker}:`, error.message);
      
      // If we encounter a rate limit error, wait for a longer time
      if (error.message.includes('Too Many Requests')) {
        console.log('Rate limit reached. Waiting for 60 seconds...');
        await delay(60000); // Wait for 60 seconds
      }
    }

    if (i % 100 === 0 || i === tickers.length - 1) {
      console.log(`Progress: ${i + 1}/${tickers.length}`);
      
      // Save intermediate results every 100 tickers
      await fs.writeFile('ticker_info_intermediate.json', JSON.stringify(tickerInfo, null, 2));
      await fs.writeFile('sec_info_intermediate.json', JSON.stringify(secInfo, null, 2));
      await fs.writeFile('valid_tickers_intermediate.json', JSON.stringify(validTickers, null, 2));
      await fs.writeFile('errors_intermediate.json', JSON.stringify(errors, null, 2));
    }
  }

  // Save final results to JSON files
  await fs.writeFile('ticker_info.json', JSON.stringify(tickerInfo, null, 2));
  await fs.writeFile('sec_info.json', JSON.stringify(secInfo, null, 2));
  await fs.writeFile('valid_tickers.json', JSON.stringify(validTickers, null, 2));
  await fs.writeFile('errors.json', JSON.stringify(errors, null, 2));

  console.log(`Data fetching complete. JSON files have been created.`);
  console.log(`Successfully fetched data for ${validTickers.length} tickers.`);
  console.log(`Encountered errors for ${Object.keys(errors).length} tickers. See errors.json for details.`);
}

fetchStockData().catch(console.error);