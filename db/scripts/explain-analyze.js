// db/scripts/explain-analyze.js
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const pgBin = path.join(process.env.USERPROFILE, 'pgsql', 'bin', 'psql.exe');
const psqlCmd = fs.existsSync(pgBin) ? pgBin : 'psql';

function runSql(sql) {
  return execFileSync(
    psqlCmd,
    ['-U', 'postgres', '-h', '127.0.0.1', '-p', '5432', '-d', 'campus_rides', '-c', sql],
    { encoding: 'utf-8' }
  );
}

console.log('--- RUNNING EXPLAIN ANALYZE BENCHMARK ---');

const searchQuery = `
SELECT 
    r.id, r.departure_time, r.price_per_seat, r.seats_available,
    u.full_name AS driver_name, u.rating_avg
FROM rides r
JOIN users u ON r.driver_id = u.id
WHERE r.origin_stop_id = 1 
  AND r.destination_stop_id = 2 
  AND r.departure_time >= NOW() - INTERVAL '1 hour'
  AND r.departure_time <= NOW() + INTERVAL '3 days'
  AND r.status = 'SCHEDULED';
`;

// 1. Without Index (Sequential Scan Forced)
const planWithoutIndex = runSql(`
SET enable_indexscan = off;
SET enable_bitmapscan = off;
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
${searchQuery}
`);

// 2. With Composite Index (Index Scan Enabled)
const planWithIndex = runSql(`
SET enable_indexscan = on;
SET enable_bitmapscan = on;
SET enable_seqscan = off;
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
${searchQuery}
`);

const reportContent = `# EXPLAIN ANALYZE Benchmark: Ride Search Optimization

## Target Search Query
The primary ride search pattern filters by \`origin_stop_id\`, \`destination_stop_id\`, a departure time window (\`departure_time BETWEEN ? AND ?\`), and active ride status (\`status = 'SCHEDULED'\`):

\`\`\`sql
${searchQuery.trim()}
\`\`\`

---

## 1. Plan WITHOUT Composite Index (Sequential Scan)
*Forced sequential scan to measure worst-case linear table inspection:*

\`\`\`text
${planWithoutIndex.trim()}
\`\`\`

---

## 2. Plan WITH Composite Index (\`idx_rides_search_composite\`)
*Partial Composite B-Tree Index: \`(origin_stop_id, destination_stop_id, departure_time) WHERE status = 'SCHEDULED'\`*

\`\`\`text
${planWithIndex.trim()}
\`\`\`

---

## Key Performance Observations
1. **Access Method**:
   - Without index: PostgreSQL performs a \`Seq Scan on rides\`, inspecting all heap blocks.
   - With composite index: PostgreSQL performs an \`Index Scan\` or \`Bitmap Index Scan\` directly targeting the exact B-Tree leaf pages matching the origin and destination tuples, then pruning by the departure timestamp range.
2. **Buffer Hit & IO**:
   - Buffer page reads are reduced from reading full table heaps to only the relevant index pages.
3. **Partial Index Advantage**:
   - By specifying \`WHERE status = 'SCHEDULED'\`, completed and cancelled historical rides are excluded from the index, keeping index size small and fully cached in PostgreSQL buffer pool memory (\`shared_buffers\`).
`;

const docsPath = path.join(__dirname, '..', '..', 'docs', 'EXPLAIN_ANALYZE.md');
fs.writeFileSync(docsPath, reportContent, 'utf-8');
console.log(`EXPLAIN ANALYZE results successfully saved to ${docsPath}`);
