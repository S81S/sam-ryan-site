const inventory = window.usedInventoryData.vehicles.filter(v => v.locationId === '18393');
const section = document.createElement('section');
section.className = 'search-summary';
section.hidden = true;
section.setAttribute('aria-label', 'Ask about your comparison');
const title = document.createElement('h2');
title.textContent = 'Want help choosing between these?';
const description = document.createElement('p');
const actions = document.createElement('div');
actions.className = 'hero-actions';
const makeLink = label => {
  const a = document.createElement('a'); a.className = 'btn'; a.textContent = label; actions.append(a); return a;
};
const sam = makeLink('Text Sam your shortlist');
const ryan = makeLink('Text Ryan your shortlist');
const inquiry = makeLink('Ask about these vehicles');
section.append(title, description, actions);
document.getElementById('automatic-equipment').before(section);
function update() {
  const vins = [...new Set(['1','2','3','4','5'].map(id => document.getElementById('choose-' + id)?.value).filter(Boolean))];
  const selected = vins.map(vin => inventory.find(v => v.vin === vin)).filter(Boolean);
  section.hidden = selected.length === 0;
  description.textContent = `${selected.length} selected vehicle${selected.length === 1 ? '' : 's'}. Your message includes the stock numbers so we can pick up where you left off.`;
  const request = 'Please help me compare these vehicles:\n' + selected.map(v => `${v.title} — Stock ${v.stock || 'not listed'} — VIN ${v.vin}`).join('\n');
  const comparison = 'https://carswithsam.com/compare?vehicles=' + selected.map(v => v.vin).join(',');
  sam.href = 'sms:+17372091320?body=' + encodeURIComponent('Hi Sam, ' + request + '\n' + comparison);
  ryan.href = 'sms:+14014104727?body=' + encodeURIComponent('Hi Ryan, ' + request + '\n' + comparison);
  inquiry.href = 'contact.html?' + new URLSearchParams({request:request + '\n' + comparison});
}
document.addEventListener('compare:changed', update);
update();
