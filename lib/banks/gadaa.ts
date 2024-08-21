import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getGadaaRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Gadaa Bank exchange rates...')

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

    const url = 'https://www.gadaabank.com.et/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const rates = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll('#wpdtSimpleTable-1 tbody tr')
      )
      const result: any = {}

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length < 5) return // Ensure row has enough columns

        const currency = cells[0].innerText.trim().replace(/<.*>/, '').trim()
        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())
        const transactionalBuying = parseFloat(cells[3].innerText.trim())
        const transactionalSelling = parseFloat(cells[4].innerText.trim())

        if (
          !isNaN(cashBuying) &&
          !isNaN(cashSelling) &&
          !isNaN(transactionalBuying) &&
          !isNaN(transactionalSelling)
        ) {
          result[currency] = {
            cashBuying,
            cashSelling,
            transactionalBuying,
            transactionalSelling,
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
