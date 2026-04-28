/**
 * Performance Diagnostic Utility
 * Logs all Firestore operations with timing to identify slow queries
 * 
 * View results in browser console - look for [PERF] logs
 * Remove this file after diagnosing the issue
 */

type PerfEntry = {
  operation: string
  collection: string
  duration: number
  docCount?: number
  timestamp: number
}

const perfLog: PerfEntry[] = []

export function logPerf(operation: string, collection: string, duration: number, docCount?: number) {
  const entry: PerfEntry = {
    operation,
    collection,
    duration,
    docCount,
    timestamp: Date.now(),
  }
  perfLog.push(entry)
  
  // Log immediately if slow
  if (duration > 100) {
    console.warn(
      `[PERF] SLOW: ${operation}(${collection}) took ${duration.toFixed(0)}ms` +
      (docCount !== undefined ? ` - ${docCount} docs` : '')
    )
  }
}

export function getPerfSummary() {
  if (perfLog.length === 0) return null
  
  const byCollection: Record<string, { count: number; totalTime: number; totalDocs: number }> = {}
  
  for (const entry of perfLog) {
    if (!byCollection[entry.collection]) {
      byCollection[entry.collection] = { count: 0, totalTime: 0, totalDocs: 0 }
    }
    byCollection[entry.collection].count++
    byCollection[entry.collection].totalTime += entry.duration
    byCollection[entry.collection].totalDocs += entry.docCount || 0
  }
  
  const totalTime = perfLog.reduce((sum, e) => sum + e.duration, 0)
  const slowest = [...perfLog].sort((a, b) => b.duration - a.duration).slice(0, 5)
  
  return {
    totalOperations: perfLog.length,
    totalTime: totalTime.toFixed(0) + 'ms',
    byCollection,
    slowest5: slowest.map(e => ({
      operation: `${e.operation}(${e.collection})`,
      duration: e.duration.toFixed(0) + 'ms',
      docs: e.docCount,
    })),
  }
}

export function printPerfSummary() {
  const summary = getPerfSummary()
  if (!summary) {
    console.log('[PERF] No operations logged yet')
    return
  }
  
  console.group('[PERF] === PERFORMANCE SUMMARY ===')
  console.log(`Total operations: ${summary.totalOperations}`)
  console.log(`Total Firestore time: ${summary.totalTime}`)
  console.log('')
  console.log('By Collection:')
  console.table(summary.byCollection)
  console.log('')
  console.log('Top 5 Slowest:')
  console.table(summary.slowest5)
  console.groupEnd()
}

export function clearPerfLog() {
  perfLog.length = 0
}

// Auto-print summary after page load
if (typeof window !== 'undefined') {
  // Print summary 5 seconds after page load
  setTimeout(() => {
    printPerfSummary()
  }, 5000)
  
  // Also expose to window for manual inspection
  ;(window as unknown as Record<string, unknown>).perfSummary = printPerfSummary
  ;(window as unknown as Record<string, unknown>).perfLog = perfLog
}
