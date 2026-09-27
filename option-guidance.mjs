// Factory unavailability must be backed by a complete, reviewed model-year option list.
// Do not derive this registry from the vehicles currently on the lot.
export const factoryUnavailableRules = [];
export function optionGuidance(query, rules=factoryUnavailableRules) {
 const year=query.terms.find(t=>/^20\d{2}$/.test(t));
 const findings=rules.filter(r=>r.sourceUrl&&r.reviewedAt&&r.completeOptionList===true&&String(r.year)===year&&r.modelTerms.every(t=>query.terms.includes(t))&&(!r.trimTerms||r.trimTerms.every(t=>query.terms.includes(t)))&&query.requirements.some(q=>q.id===r.feature&&q.wanted));
 return findings.map(r=>({kind:'factory-unavailable',message:`${r.label} is not a factory option for the ${r.year} ${r.modelLabel}${r.trimLabel?' '+r.trimLabel:''}.`,sourceUrl:r.sourceUrl}));
}
export function noMatchGuidance(query){
 const special=query.requirements.find(r=>r.wanted&&['interiorPurple','interiorPink','interiorOrange','interiorYellow'].includes(r.id));
 return special?'No exact matches for that interior color and your other choices. Ask Sam or Ryan about factory color options, or change the interior color to explore another combination.':null;
}
