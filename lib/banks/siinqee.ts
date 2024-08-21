import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getSiinqeeRates = async () => {
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

    const url = 'https://siinqeebank.com/foreign-currency/'

    await page.goto(url, { waitUntil: 'networkidle2' }) // Wait until network is idle

    console.log('Parsing exchange rates...')

    const tableSelector = '.table-2 tbody tr'

    await page.waitForSelector(tableSelector).catch((e) => {
      console.error('Could not get selector', e)
    })

    console.log('Table selector found')

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))
      return rows.reduce((acc, row) => {
        const cells = row.querySelectorAll('td')

        if (cells.length < 3) return acc

        const currencyCode = cells[0].textContent
          ?.trim()
          .slice(-3)
          .toUpperCase()

        if (!currencyCode) return acc
        const cashBuying = parseFloat((cells[1].textContent || '').trim())
        const cashSelling = parseFloat((cells[2].textContent || '').trim())

        if (!currencyCode || isNaN(cashBuying) || isNaN(cashSelling)) return acc

        return {
          ...acc,
          [currencyCode]: {
            cashBuying,
            cashSelling,
          },
        }
      }, {})
    }, tableSelector)

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
