import Nano from 'nano'

const { COUCH_URL, COUCH_USERNAME, COUCH_PASSWORD } = process.env

if (!COUCH_URL) {
  throw new Error('COUCH_URL is not set')
}

if (!COUCH_USERNAME) {
  throw new Error('COUCH_USERNAME is not set')
}

if (!COUCH_PASSWORD) {
  throw new Error('COUCH_PASSWORD is not set')
}

const db = async (name: string) => {
  const url = `http://${COUCH_USERNAME}:${COUCH_PASSWORD}@${COUCH_URL}`

  const nano = Nano(url)

  try {
    const dbList = await nano.db.list()

    if (!dbList.includes(name)) {
      await nano.db.create(name)
    }

    return nano.use(name)
  } catch (err) {
    console.error('Error accessing CouchDB:', err)
    throw new Error('Failed to access CouchDB')
  }
}

export default db
