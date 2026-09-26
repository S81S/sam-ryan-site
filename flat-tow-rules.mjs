export const flatTowRules=[
  {
    "model": "Wrangler",
    "modelPattern": "\\bWRANGLER\\b",
    "drivetrainPattern": "\\b4X4\\b|command.trac|rock.trac|selec.trac",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Jeep/Wrangler/102316_26_JL_OM_EN_USC_DIGITAL_E1.pdf",
    "years": [
      2026
    ]
  },
  {
    "model": "Gladiator",
    "modelPattern": "\\bGLADIATOR\\b",
    "drivetrainPattern": "\\b4X4\\b|command.trac|rock.trac",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Jeep/Gladiator/105199_26_JT_OM_EN_USC_DIGITAL_E1_V1.pdf",
    "years": [
      2026
    ]
  },
  {
    "model": "Grand Cherokee",
    "modelPattern": "\\bGRAND CHEROKEE\\b",
    "drivetrainPattern": "quadra.trac ii\\b|quadra.drive ii\\b",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Jeep/Grand_Cherokee_and_4xe/104917_26_WL_OM_EN_USC_DIGITAL_E2.pdf",
    "years": [
      2026
    ]
  },
  {
    "model": "Grand Wagoneer",
    "modelPattern": "\\bGRAND WAGONEER\\b",
    "drivetrainPattern": "quadra.trac ii\\b|quadra.drive ii\\b|(?:2|two)[ -]speed(?: on[ -]demand)? transfer case",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Jeep/Grand_Wagoneer/105358_26_WS_OM_EN_USC_DIGITAL_E2.pdf",
    "years": [
      2026
    ]
  },
  {
    "model": "Ram 1500",
    "modelPattern": "\\bRAM 1500\\b",
    "drivetrainPattern": "\\b4X4\\b|\\b4WD\\b",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Ram/1500/104308_26_DT_OM_EN_USC_DIGITAL_E2.pdf",
    "years": [
      2026
    ]
  },
  {
    "model": "Ram 2500/3500",
    "modelPattern": "\\bRAM (?:2500|3500)\\b",
    "drivetrainPattern": "\\b4X4\\b|\\b4WD\\b",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Ram/2500_3500/104746_26_DJD2_OM_EN_USC_DIGITAL_E3.pdf",
    "years": [
      2026
    ]
  },
  {
    "model": "Durango",
    "modelPattern": "\\bDURANGO\\b",
    "drivetrainPattern": "2.speed.*transfer case|two.speed.*transfer case",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Dodge/Durango/102469_26_WD_OM_EN_USC_DIGITAL_E1.pdf",
    "years": [
      2026
    ]
  },
  {
    "model": "Gladiator",
    "modelPattern": "\\bGLADIATOR\\b",
    "drivetrainPattern": "\\b4X4\\b|command.trac|rock.trac",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-ca/Jeep/2025/Gladiator/100033_25_JT_OM_EN_USC_DIGITAL_E1.pdf",
    "years": [
      2025
    ]
  },
  {
    "model": "Wrangler",
    "modelPattern": "\\bWRANGLER\\b",
    "drivetrainPattern": "\\b4X4\\b|command.trac|rock.trac|selec.trac",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-ca/Jeep/2025/Wrangler/100051_25_JL_OM_EN_USC_DIGITAL_E1.pdf",
    "years": [
      2025
    ]
  },
  {
    "model": "Ram 1500",
    "modelPattern": "\\bRAM 1500\\b",
    "drivetrainPattern": "\\b4X4\\b|\\b4WD\\b",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us/Ram/2025/1500_DT/100531_25_DT_OM_EN_USC_DIGITAL_E2.pdf",
    "years": [
      2025
    ]
  },
  {
    "model": "Ram 2500/3500",
    "modelPattern": "\\bRAM (?:2500|3500)\\b",
    "drivetrainPattern": "\\b4X4\\b|\\b4WD\\b",
    "sourceUrl": "https://vehicleinfo.mopar.com/assets/publications/en-us/Ram/2022/2500_3500/om_html/GUID-88CE4950-CBB0-471B-969A-A17CD86083CC.html",
    "years": [
      2022
    ]
  }
];
export function flatTowEvidence(raw){
 const year=Number(raw.map(l=>l.match(/^(20\d{2}) MODEL YEAR/i)).find(Boolean)?.[1]);
 const yearLine=raw.findIndex(l=>/^20\d{2} MODEL YEAR/i.test(l));
 const identity=raw.slice(yearLine,yearLine+2).join(' ');
 for(const rule of flatTowRules){
  if(!rule.years.includes(year)||!new RegExp(rule.modelPattern,'i').test(identity))continue;
  if(/PROMASTER|CHASSIS CAB|CLASSIC|4XE/i.test(identity))return null;
  if(rule.model==='Durango'&&/\bSRT\b|HELLCAT/i.test(identity))return null;
  const evidence=raw.filter(l=>new RegExp(rule.drivetrainPattern,'i').test(l));
  if(!evidence.length)return null;
  const setup=/Wrangler|Gladiator/.test(rule.model)?'Transfer case in Neutral; automatic transmission in Park or manual transmission in gear.':'Transfer case in Neutral and transmission in Park.';
  return {value:true,evidence:[evidence[0],`${year} ${rule.model}: factory manual supports recreational flat towing for this drivetrain. ${setup} Follow the complete linked procedure and confirm towing equipment and vehicle condition.`],sourceUrl:rule.sourceUrl,method:'sticker-plus-owner-manual'};
 }
 return null;
}
