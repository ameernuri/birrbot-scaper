import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getEnatRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH || undefined

  console.log('Scraping Enat Bank exchange rates...')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
    executablePath,
    timeout: 15000,
  })

  if (!browser) {
    Sentry.captureException(new Error('Failed to launch browser'))
    return
  }

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

    const url = 'https://www.enatbanksc.com/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = '#tablepress-1 tbody tr'
    const nextButtonSelector = '#tablepress-1_next'

    await page.waitForSelector(currencySelector, { timeout: 15000 })

    const exchangeRates = {}

    let hasNextPage = true

    while (hasNextPage) {
      console.log('Scraping page...')
      const pageRates = await page.evaluate((selector) => {
        const rows = Array.from(document.querySelectorAll(selector))

        return rows.reduce((acc: any, row) => {
          const cells = row.querySelectorAll('td')

          // Extract data only if cells are non-empty and have the correct indices
          if (
            cells.length >= 4 &&
            cells[1].innerText.trim() !== '' &&
            cells[2].innerText.trim() !== '' &&
            cells[3].innerText.trim() !== ''
          ) {
            const currencyCode = cells[1].innerText
              .trim()
              .replace(/[^a-zA-Z\s]/g, '')
              .toUpperCase()
            const cashBuying = parseFloat(cells[2].innerText.trim())
            const cashSelling = parseFloat(cells[3].innerText.trim())

            // Check for NaN values
            if (!currencyCode || isNaN(cashBuying) || isNaN(cashSelling))
              return acc

            acc[currencyCode] = {
              cashBuying,
              cashSelling,
            }
          }

          return acc
        }, {})
      }, currencySelector)

      // Merge page rates with accumulated exchangeRates
      Object.assign(exchangeRates, pageRates)

      // Check if there is a next page
      const isNextDisabled = await page.$eval(nextButtonSelector, (btn) =>
        btn.classList.contains('disabled')
      )

      if (isNextDisabled) {
        hasNextPage = false
      } else {
        await page.click(nextButtonSelector)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    await browser.close()

    if (Object.keys(exchangeRates).length > 0) {
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
