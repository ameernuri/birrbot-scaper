import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getWegagenRatesOne = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Wegagen Bank exchange rates...')

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

    page.setViewport({
      width: 1280,
      height: 800,
    })

    const url = 'https://www.wegagen.com/exchange-rate-cash-notes/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const rates = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll(
          'table tbody tr:not(:first-child):not(:nth-child(2))'
        )
      )
      const result: any = {}

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length < 7) return // Ensure row has enough columns

        const currency = cells[1].innerText.trim()
        const cashBuying = parseFloat(cells[3].innerText.trim())
        const cashSelling = parseFloat(cells[4].innerText.trim())
        const transactionalBuying = parseFloat(cells[5].innerText.trim())
        const transactionalSelling = parseFloat(cells[6].innerText.trim())

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

export const getWegagenRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Wegagen Bank exchange rates...')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
  })

  try {
    const page = await browser.newPage()

    page.setViewport({
      width: 1280,
      height: 800,
    })

    const url = 'https://wegagen.com/'

    await page.goto(url, { waitUntil: 'networkidle2' }) // Wait until network is idle

    console.log('Parsing exchange rates...')

    const tableSelector = '._popexchange_sa27i_1387 table tbody tr'

    await page.waitForSelector(tableSelector, { timeout: 15000 }).catch((e) => {
      console.error('Could not get selector', e)
    })

    console.log('Table selector found')

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))
      return rows.reduce((acc, row) => {
        const cells = row.querySelectorAll('td')

        if (cells.length < 7) return acc

        const currencyCode = cells[1].textContent?.trim().toUpperCase()
        const cashBuying = parseFloat(cells[3].textContent?.trim() || '')
        const cashSelling = parseFloat(cells[4].textContent?.trim() || '')

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
