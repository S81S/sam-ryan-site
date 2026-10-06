// Run repeatedly after window.__scanBg([...]) until "done" is true. Each call waits up to 35 seconds.
for (let i = 0; i < 35 && !window.__bgDone; i++) await new Promise(r => setTimeout(r, 1000));
({ done: window.__bgDone, n: Object.keys(window.__acc).length, statuses: Object.values(window.__acc).map(r => (r.http || '') + (r.text ? 't' : r.small ? 's' : r.error ? 'e' : '?')).join(' ') })
