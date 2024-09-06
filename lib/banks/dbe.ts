import vision from '@google-cloud/vision'
import axios from 'axios'
import puppeteer from 'puppeteer'

const findExchangeImgUrl = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  try {
    // Navigate to the DBE homepage
    await page.goto('https://www.dbe.com.et/')

    // Wait for the image element to load
    await page.waitForSelector('.blog-featured .items-leading .leading-0 img', {
      timeout: 15000,
    })

    // Extract the image URL
    const imgUrl = await page.evaluate(() => {
      const imgElement = document.querySelector(
        '.blog-featured .items-leading .leading-0 img'
      ) as HTMLImageElement
      return imgElement ? imgElement.src : null
    })

    if (imgUrl) {
      console.log('Found exchange rate image URL:', imgUrl)
      return imgUrl
    } else {
      console.log('Exchange rate image URL not found.')
      return null
    }
  } catch (error) {
    console.error('Error while finding the exchange rate image URL:', error)
    return null
  } finally {
    await browser.close()
  }
}

// Creates a client
const client = new vision.ImageAnnotatorClient()

async function detectTextFromUrl(imageUrl: string) {
  try {
    // Fetch the image from the URL
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    const imageBuffer = Buffer.from(response.data, 'binary')

    // Performs text detection on the image buffer
    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    })
    const detections = result.textAnnotations

    if (detections?.length) {
      const text = detections[0].description
      console.log('Detected text:')
      console.log(text)
      return text
    } else {
      console.log('No text detected.')
      return ''
    }
  } catch (error) {
    console.error('Error during text detection:', error)
  }
}

function parseExchangeRates(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)

  const rates: any = {}
  let currentCurrency = ''

  lines.forEach((line, index) => {
    const parts = line.split(/\s+/)

    if (parts.length === 1 && parts[0].length === 3) {
      // This is a currency code (e.g., "USD")
      currentCurrency = parts[0]
      rates[currentCurrency] = {}
    } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
      // This is a numeric value, check if it belongs to the buying or selling field
      const value = parseFloat(parts[0])
      const nextLine = lines[index + 1]?.split(/\s+/)

      if (
        nextLine &&
        nextLine.length === 1 &&
        !isNaN(parseFloat(nextLine[0]))
      ) {
        rates[currentCurrency].cashBuying = value
        rates[currentCurrency].transactionalBuying = value
        rates[currentCurrency].cashSelling = parseFloat(nextLine[0])
        rates[currentCurrency].transactionalSelling = parseFloat(nextLine[0])
      }
    } else if (parts.length === 1 && isNaN(parseFloat(parts[0]))) {
    }
  })

  return rates
}

export const getDbeRates = async () => {
  const imageUrl = await findExchangeImgUrl()

  if (!imageUrl) {
    console.log('Exchange rate image URL not found.')
    return null
  }

  const text = await detectTextFromUrl(imageUrl)

  if (!text) {
    console.log('No text detected.')
    return null
  }

  const rates = parseExchangeRates(text)
  console.log(JSON.stringify(rates, null, 2))

  return rates
}
