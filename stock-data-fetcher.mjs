import fs from 'fs/promises';
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import yahooFinance from 'yahoo-finance2';

const tickersFilePath = 'all_usd_tickers.csv';
const numericalProperties = [
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
  'grossProfits',
  'freeCashflow',
  'operatingCashflow',
  'earningsGrowth',
  'revenueGrowth',
  'grossMargins',
  'ebitdaMargins',
  'operatingMargins',
  'profitMargins',
  'financialCurrency'
];

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
      const info = await yahooFinance.quoteSummary(ticker, { modules: ["price", "summaryProfile", "financialData"] });
      
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
    }

    if (i % 100 === 0 || i === tickers.length - 1) {
      console.log(`Progress: ${i + 1}/${tickers.length}`);
    }
  }

  // Save results to JSON files
  await fs.writeFile('ticker_info.json', JSON.stringify(tickerInfo, null, 2));
  await fs.writeFile('sec_info.json', JSON.stringify(secInfo, null, 2));
  await fs.writeFile('valid_tickers.json', JSON.stringify(validTickers, null, 2));
  await fs.writeFile('errors.json', JSON.stringify(errors, null, 2));

  console.log(`Data fetching complete. JSON files have been created.`);
  console.log(`Successfully fetched data for ${validTickers.length} tickers.`);
  console.log(`Encountered errors for ${Object.keys(errors).length} tickers. See errors.json for details.`);
}

fetchStockData().catch(console.error);