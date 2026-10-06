// One static header for the main site and generated vehicle pages.
const maps='https://www.google.com/maps/place/Samuel+Sweitzer+at+Covert+Chrysler+Dodge+Jeep+Ram+of+Austin/data=!4m2!3m1!1s0x8644cbf5d9aed9b9:0xc8c2bee601bd021?hl=en';
const headLinks='<link rel="icon" href="/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/phone-badge.css?v=stacked2"><link rel="stylesheet" href="/site-shell.css?v=20261005-fixes">';
function phone(advisor='Sam',header=false){
 const ryan=advisor==='Ryan',number=ryan?'401-410-4727':'737-209-1320',tel=ryan?'+14014104727':'+17372091320';
 return `<a href="tel:${tel}" class="sam-phone${ryan?' ryan-phone':''}${header?' header-phone':''}" aria-label="Call ${advisor} at ${number}"><img class="sam-phone-stacked${ryan?' ryan-phone-stacked':''}" src="/${ryan?'ryan-phone-stacked-v1.webp':'sam-phone-stacked-v2.webp'}" alt="${number}" width="1546" height="1017" decoding="async"></a>`;
}
function header(route='',advisor='Sam'){
 const links=[['/inventory','Find Your Car'],['/trim-guide','Compare Trims'],['/compare','Compare VINs'],['/see-yourself','Your Driveway'],['/reviews','Reviews'],['/guides','Guides'],['/sam','Sam'],['/ryan','Ryan']];
 return `<header class="site-header" data-site-header><div class="wrap nav-wrap"><a href="/" class="brand"><span class="brand-main">Cars With <b>Sam</b></span><small>Cars &amp; Straight Answers • Covert CDJR Austin</small></a>${phone(advisor,true)}<script>document.documentElement.classList.add('js')</script><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" onclick="var o=this.getAttribute('aria-expanded')!=='true';this.setAttribute('aria-expanded',o);document.getElementById('primary-nav').classList.toggle('is-open',o)"><span aria-hidden="true">☰</span> Menu</button><nav id="primary-nav" class="nav-links" aria-label="Primary navigation">${links.map(([url,label])=>`<a href="${url}"${route===url?' class="active" aria-current="page"':''}>${label}</a>`).join('')}</nav><a class="header-cta" href="/contact${advisor==='Ryan'?'?advisor=Ryan':''}">LET'S TALK</a></div></header><div class="affiliation-bar"><div class="wrap affiliation-inner"><a class="visit-link" href="${maps}" target="_blank" rel="noopener noreferrer" aria-label="Open Sam Sweitzer’s Google Maps listing at 8107 Research Blvd, Austin, TX 78758 (opens in a new tab)"><span><strong>Visit us at:</strong> Covert CDJR Austin</span><span class="visit-address">8107 Research Blvd, Austin, TX 78758<span class="visit-directions">Google Maps ↗</span></span></a></div></div>`;
}
function mobileBar(route='',advisor='Sam'){
 const vin=route.match(/^\/vehicle-([A-HJ-NPR-Z0-9]{17})$/)?.[1];
 const contact=vin?`/contact?vehicle=${vin}&amp;advisor=${advisor}`:advisor==='Ryan'?'/contact?advisor=Ryan':'/contact';
 return `<div class="sticky-mobile" role="navigation" aria-label="Quick shopping actions"><a href="/inventory">Find Your Car</a><a href="${contact}">Ask Us</a></div>`;
}
module.exports={maps,headLinks,phone,header,mobileBar};
