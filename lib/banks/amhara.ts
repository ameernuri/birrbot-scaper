import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getAmharaBankRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Amhara Bank exchange rates...')

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

    const url = 'https://www.amharabank.com.et/exchange-rate/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const rates = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll('table.wpr-data-table tbody tr')
      )
      const result: any = {}

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length < 3) return // Ensure row has enough columns

        const currency = cells[0].innerText
          .trim()
          .slice(-4)
          .replace(')', '')
          .replace('Yuan', 'CNY')
          .toUpperCase()
        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())

        if (!isNaN(cashBuying) && !isNaN(cashSelling)) {
          result[currency] = {
            cashBuying,
            cashSelling,
          }
        }
      })

      return result
    })

    await browser.close()

    if (rates && Object.keys(rates).length > 0) {
      console.log({ rates })
      return rates
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
