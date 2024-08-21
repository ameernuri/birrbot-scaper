import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getAbyssiniaRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Bank of Abyssinia exchange rates...')

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
    const url = 'https://www.bankofabyssinia.com/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = '#tablepress-15 tbody tr'
    const nextButtonSelector = '#tablepress-15_next'

    const exchangeRates: {
      [key: string]: {
        cashBuying: number
        cashSelling: number
        transactionalBuying?: number
        transactionalSelling?: number
      }
    } = {}

    let hasNextPage = true

    while (hasNextPage) {
      await page.waitForSelector(currencySelector)

      const pageRates = await page.evaluate((selector) => {
        const rows = Array.from(document.querySelectorAll(selector))

        return rows.reduce((acc: any, row) => {
          const cells = row.querySelectorAll('td')

          if (cells.length >= 3) {
            const currencyCode = cells[0].innerText.trim().toUpperCase()
            const cashBuying = parseFloat(cells[1].innerText.trim())
            const cashSelling = parseFloat(cells[2].innerText.trim())
            const transactionalBuying = cells[1].innerText.trim()
              ? parseFloat(cells[1].innerText.trim())
              : undefined
            const transactionalSelling = cells[2].innerText.trim()
              ? parseFloat(cells[2].innerText.trim())
              : undefined

            if (currencyCode && !isNaN(cashBuying) && !isNaN(cashSelling)) {
              if (!acc[currencyCode]) {
                acc[currencyCode] = {
                  cashBuying,
                  cashSelling,
                  transactionalBuying,
                  transactionalSelling,
                }
              } else {
                acc[currencyCode].transactionalBuying = transactionalBuying
                acc[currencyCode].transactionalSelling = transactionalSelling
              }
            }
          }

          return acc
        }, {})
      }, currencySelector)

      Object.assign(exchangeRates, pageRates)

      const isNextDisabled = await page.$eval(nextButtonSelector, (btn) =>
        btn.classList.contains('disabled')
      )

      hasNextPage = !isNextDisabled

      if (hasNextPage) {
        await page.click(nextButtonSelector)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    await browser.close()

    if (Object.keys(exchangeRates).length > 0) {
      // console.log({ exchangeRates })
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
    if (browser) {
      browser.close()
    }
  }
}
