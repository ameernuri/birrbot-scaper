import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getHijraRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Hijra Bank exchange rates...')

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

    const url = 'https://hijra-bank.com/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = 'table tbody tr'

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))

      return rows.reduce((acc, row) => {
        const cells = row.querySelectorAll('td')

        const currencyName = cells[0].innerText.trim()
        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())
        const transactionalBuying = parseFloat(cells[3].innerText.trim())
        const transactionalSelling = parseFloat(cells[4].innerText.trim())

        if (!currencyName || !cashBuying || !cashSelling) return acc

        const currencyMap: any = {
          'US Dollar': 'USD',
          Euro: 'EUR',
          'Pound Sterling': 'GBP',
          'UAE DIRHAM': 'AED',
          'Saudi Riyal': 'SAR',
        }

        const code = currencyMap[currencyName]

        if (!code) return acc

        return {
          ...acc,
          [code]: {
            cashBuying,
            cashSelling,
            transactionalBuying,
            transactionalSelling,
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
