// Paint color names: the same color is printed many ways ("Diamond Black Crystal Pearl-Coat Exterior Paint" on a window
// sticker, "Diamond Black Crystal Pearl" in a buyer's guide). `colorKey` reduces a name to the words that tell colors
// apart, so a sticker and a guide name match; `colorName` gives the readable name; `swatch` a display color.

const filler=/\b(?:exterior|paint|clear|coat|clearcoat|pearl|pearlcoat|tri|metallic|crystal|color)\b/g;
export function colorKey(name){
 return String(name||'').normalize('NFKC').toLowerCase().replace(/^exterior color:\s*/,'').replace(/[‘’'"!*]/g,'').replace(/[-/]+/g,' ')
  .replace(filler,' ').replace(/\s+/g,' ').trim();
}
// "Exterior Color: Bright White Clear-Coat Exterior Paint" → "Bright White"; "SUMMIT WHITE" → "Summit White".
export function colorName(line){
 let s=String(line||'').replace(/^Exterior Color:\s*/i,'').replace(/\b(?:Exterior\s+)?Paint\b/gi,'').replace(/\bClear[- ]?Coat\b/gi,'').replace(/\bPearl[- ]Coat\b/gi,'Pearl').replace(/\s+/g,' ').trim();
 if(s===s.toUpperCase())s=s.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
 return s.replace(/-(?=[A-Z])/g,' ');
}
// A display color for a swatch, from the words in the name. Unknown names get a neutral gray.
const named=[[/mojito/,'#8dc63f'],[/^41$|\b41\b|olive|tank|sarge/,'#5b5a3c'],[/anvil|earl|ghost|sting|destroyer|ceramic|vapor|baltic|granite|steel gr|sterling|gray|grey/,'#6b7177'],
 [/joose|green machine|sublime/,'#a8c43a'],[/serrano|green/,'#4f6b4a'],[/tuscadero|purple|haze/,'#8a2c6f'],[/canyon lake/,'#4c7d86'],[/peel out|orange|punk/,'#e2661d'],
 [/copper|bronze|river rock|sandstone/,'#9b6a4a'],[/hydro|bludicrous|b5|forged|steel blue|fathom|reign|midnight|blue/,'#2457a6'],
 [/red|redeye|cherry|delmonico|molten|velvet|firecracker|octane|flame/,'#b3212e'],[/white|ivory|knuckle|summit white/,'#f4f4f2'],[/silver|zynith|billet|nickel|mist/,'#b9bdc1'],
 [/black|after dark|db black/,'#111316']];
export function swatch(name){const k=colorKey(name)||String(name||'').toLowerCase();for(const [p,c] of named)if(p.test(k))return c;return '#8a9096';}
