// Fail closed: a failed capture must never replace the working snapshot.
export function validateCapture(capture, vehicles, rejects) {
  if (!capture.complete || rejects.length || !vehicles.length)
    throw new Error('Capture incomplete, empty, or rejected records present; keeping previous inventory.');
  for (const type of ['new', 'used']) {
    const segment = capture.segments?.[type];
    if (!segment || segment.error || !Number.isInteger(segment.advertisedTotal) ||
        segment.advertisedTotal < 1 || segment.records.length !== segment.advertisedTotal ||
        segment.unparsed.length)
      throw new Error(`Cannot verify complete ${type} inventory; keeping previous snapshot.`);
  }
  if (capture.advertisedTotal !== vehicles.length ||
      vehicles.some(v => String(v.locationId) !== '18393'))
    throw new Error('Inventory count or store scope mismatch; keeping previous snapshot.');
}

export function mergeSticker(previous, fresh) {
  if (previous?.status === 'verified' && fresh?.status !== 'verified')
    return {...previous, lastAttemptAt: fresh.checkedAt, lastAttemptStatus: fresh.status};
  return fresh;
}
