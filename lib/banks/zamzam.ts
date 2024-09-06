import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getZamZamRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping ZamZam Bank exchange rates...')

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

    // Block images, stylesheets, and fonts to speed up the scraping
    page.setRequestInterception(true)
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort()
      } else {
        req.continue()
      }
    })

    const url = 'https://zamzambank.com/exchange-rates/todays-exchange-rate/'

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })

    console.log('Parsing exchange rates...')

    const rowSelector = 'div.elementor-element.e-con.e-child' // Broader selector

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))

      console.log('Total Rows:', rows.length) // Debug to check how many rows are selected

      return rows.reduce((acc, row) => {
        const currency = row
          .querySelector('.elementor-icon-box-title span')
          ?.textContent?.trim()

        // Find all text editor cells inside the row
        const cells = row.querySelectorAll('.elementor-widget-text-editor')

        // Make sure there are at least 4 cells before proceeding
        if (cells.length < 4) return acc

        const cashBuying = parseFloat(cells[0]?.textContent?.trim() || '')
        const cashSelling = parseFloat(cells[1]?.textContent?.trim() || '')
        const transactionalBuying = parseFloat(
          cells[2]?.textContent?.trim() || ''
        )
        const transactionalSelling = parseFloat(
          cells[3]?.textContent?.trim() || ''
        )

        if (
          !currency ||
          isNaN(cashBuying) ||
          isNaN(cashSelling) ||
          isNaN(transactionalBuying) ||
          isNaN(transactionalSelling)
        ) {
          return acc
        }

        // Add parsed data to accumulator
        acc[currency] = {
          cashBuying,
          cashSelling,
          transactionalBuying,
          transactionalSelling,
        }

        return acc
      }, {} as any)
    }, rowSelector)

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
