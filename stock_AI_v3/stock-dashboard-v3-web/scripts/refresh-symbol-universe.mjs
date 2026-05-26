#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'data', 'symbol-universe.json');
const SOURCES = [
  {
    market: 'TWSE',
    url: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    codeKeys: ['Code'],
    nameKeys: ['Name'],
    industryKeys: [],
  },
  {
    market: 'TPEx',
    url: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes',
    codeKeys: ['SecuritiesCompanyCode'],
    nameKeys: ['CompanyName'],
    industryKeys: [],
  },
  {
    market: 'TWSE',
    url: 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L',
    codeKeys: ['公司代號'],
    nameKeys: ['公司簡稱', '公司名稱'],
    industryKeys: ['產業別'],
  },
  {
    market: 'TPEx',
    url: 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O',
    codeKeys: ['SecuritiesCompanyCode'],
    nameKeys: ['CompanyAbbreviation', 'CompanyName'],
    industryKeys: ['SecuritiesIndustryCode'],
  },
];

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

const byTicker = new Map();
for (const source of SOURCES) {
  const res = await fetch(source.url);
  if (!res.ok) throw new Error(`${source.url} -> ${res.status}`);
  const rows = await res.json();
  for (const row of rows) {
    const code = pick(row, source.codeKeys);
    if (!code || !/^[0-9A-Z]{4,8}$/i.test(code)) continue;
    const shortName = pick(row, source.nameKeys);
    const industryCode = pick(row, source.industryKeys);
    const ticker = `${code}.TW`;
    const existing = byTicker.get(ticker);
    byTicker.set(ticker, {
      ticker,
      code,
      name: shortName ?? existing?.name ?? ticker,
      kind: /^00/.test(code) ? 'etf' : 'stock',
      market: existing?.market ?? source.market,
      industryCode: industryCode ?? existing?.industryCode ?? null,
    });
  }
}
const entries = Array.from(byTicker.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: 'TWSE/TPEx OpenAPI', entries }, null, 2) + '\n');
console.log(`Wrote ${entries.length} symbols to ${OUT}`);
const target = entries.find((e) => e.code === '2307');
if (target) console.log(`2307 = ${target.name} (${target.market})`);
