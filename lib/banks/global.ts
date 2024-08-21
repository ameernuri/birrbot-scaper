import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getGlobalRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Global Bank exchange rates...')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
    executablePath,
  })

  try {
    const page = await browser.newPage()

    page.setRequestInterception(true)
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort()
      } else {
        req.continue()
      }
    })

    page.setViewport({
      width: 1280,
      height: 800,
    })

    const url = 'https://www.globalbankethiopia.com/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = '.wptb-table-container-matrix tbody tr'

    await page.waitForSelector(currencySelector).catch((e) => {
      console.error('could not get selector', e)
    })

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector)).slice(1)

      return rows.reduce((acc, row, i) => {
        const cells = row.querySelectorAll('td')

        if (cells.length < 3) return acc

        const currencyCode = cells[0].innerText
          .trim()
          .toUpperCase()
          .replace('GBE', 'GBP')
        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())

        if (!currencyCode || isNaN(cashBuying) || isNaN(cashSelling)) return acc

        return {
          ...acc,
          [currencyCode]: {
            cashBuying,
            cashSelling,
          },
        }
      }, {})
    }, currencySelector)

    await browser.close()

    if (exchangeRates) {
      console.log({ exchangeRates })
      return exchangeRates
    } else {
      console.log('Exchange rates not found.')
      return null
    }
  } catch (e) {
    console.error('Error fetching exchange rates:', e)
    Sentry.captureException(e)
    return null
  } finally {
    if (browser) browser.close()
  }
}
