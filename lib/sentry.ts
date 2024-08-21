import * as Sentry from '@sentry/bun'

Sentry.init({
  dsn: 'https://2d34da18cac32f6014fe2618db6f8556@o4507633987092480.ingest.de.sentry.io/4507633990762576',
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions
})

export default Sentry
