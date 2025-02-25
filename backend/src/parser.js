import * as cheerio from 'cheerio';
import axios from 'axios';

export class MQL5Parser {
    constructor() {
        this.baseUrl = 'https://www.mql5.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    async parseSignal(url) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 30000,
                maxRedirects: 5
            });
            
            const $ = cheerio.load(response.data);

            const generalInfo = this.parseGeneralInfo($);
            const statistics = this.parseStatistics($);
            const tradeHistory = this.parseTradeHistory($);
            const distribution = this.parseDistribution($);
            const authorSignals = this.parseAuthorSignals($);

            const data = {
                generalInfo,
                statistics,
                tradeHistory,
                distribution,
                authorSignals,
                url,
                lastUpdate: new Date().toISOString()
            };

            return data;
        } catch (error) {
            console.error('Error parsing signal:', error);
            throw new Error('Failed to parse signal data');
        }
    }

    parseGeneralInfo($) {
        const info = {};
        
        $('.s-list-info__item').each((_, element) => {
            const label = $(element).find('.s-list-info__label').text().trim();
            const value = $(element).find('.s-list-info__value').text().trim();
            info[label] = value;
        });

        info.signalName = $('.s-line-card__title').text().trim();
        info.author = $('.s-line-card__author').text().trim();
        info.reliability = $('.s-indicators__item_risk').text().trim();

        return info;
    }

    parseStatistics($) {
        const stats = {};
        
        $('.s-data-columns__item').each((_, element) => {
            const label = $(element).find('.s-data-columns__label').text().trim();
            const value = $(element).find('.s-data-columns__value').text().trim();
            stats[label] = value;
        });

        return stats;
    }

    parseTradeHistory($) {
        const trades = [];
        
        $('#signalInfoTable tbody tr:not(.signalDataHidden):not(.summary)').each((_, row) => {
            const trade = {};
            $(row).find('td').each((index, cell) => {
                const value = $(cell).text().trim();
                switch(index) {
                    case 0: trade.symbol = value; break;
                    case 1: trade.time = value; break;
                    case 2: trade.type = value; break;
                    case 3: trade.volume = value; break;
                    case 4: trade.price = value; break;
                }
            });
            trades.push(trade);
        });

        return trades;
    }

    parseDistribution($) {
        const distribution = [];
        
        $('.signals-chart-dist tbody tr').each((_, row) => {
            distribution.push({
                symbol: $(row).find('.col-symbol').text().trim(),
                value: $(row).find('.col-buy-sell').text().trim(),
                percentage: $(row).find('.bar div').attr('style')?.match(/width:\s*([\d.]+)%/)?.[1] || '0'
            });
        });

        return distribution;
    }

    parseAuthorSignals($) {
        const signals = [];
        
        $('#authorsSignals .s-other-signal').each((_, element) => {
            signals.push({
                name: $(element).find('.s-other-signal__name').text().trim(),
                url: $(element).attr('href')
            });
        });

        return signals;
    }

    async validateSignalUrl(url) {
        const urlPattern = /^https:\/\/www\.mql5\.com\/[a-z]{2}\/signals\/\d+$/;
        if (!urlPattern.test(url)) {
            throw new Error('Invalid signal URL format');
        }
        return true;
    }
}

export default MQL5Parser;