import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getAhaduRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Ahadu Bank exchange rates...')

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

    const url = 'https://ahadubank.com/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const slideSelector = '.swiper-slide'

    await page.waitForSelector(slideSelector).catch((e) => {
      console.error('Could not get selector', e)
    })

    console.log('Slide selector found')

    const exchangeRates = await page.evaluate((selector) => {
      const slides = Array.from(document.querySelectorAll(selector))

      return slides.reduce((acc, slide) => {
        const title = slide
          .querySelector('.elementor-icon-box-title span')
          ?.textContent?.trim()
        const description = slide
          .querySelector('.elementor-icon-box-description')
          ?.textContent?.trim()

        if (title && description) {
          const [buyingText, sellingText] = description.split('Selling:')
          const currencyName = title.split(' ')[0] // Extract currency code from title
          const buying = parseFloat(buyingText.replace('Buying:', '').trim())
          const selling = parseFloat(sellingText.trim())

          const currencyMap = {
            EURO: 'EUR',
            Canadian: 'CAD',
            Saudi: 'SAR',
            UAE: 'AED',
            US: 'USD',
            Pound: 'GBP',
          } as any

          const currencyCode =
            currencyMap[currencyName] || currencyName.toUpperCase()

          if (!isNaN(buying) && !isNaN(selling)) {
            return {
              ...acc,
              [currencyCode]: {
                cashBuying: buying,
                cashSelling: selling,
              },
            }
          }
        }
        return acc
      }, {})
    }, slideSelector)

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
    if (browser) {
      browser.close()
    }
  }
}
