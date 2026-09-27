// Factory table columns reviewed visually; model-year and trim scope are deliberate.
const base='https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/';
export const additionalFactoryRules=[];
function add(model,trims,kind,features,packages,page){
 const file=model==='Pacifica'?'shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_Pacifica.pdf':`brochures-literature/2026/2026-JEEP-${model.toUpperCase().replaceAll(' ','-')}.pdf`;
 for(const feature of features)additionalFactoryRules.push({id:[model,2026,trims.join('-'),kind,feature,packages.join('-')].join(':'),model,year:2026,trims,kind,feature,packages,sourceUrl:base+file+'#page='+page,reviewedAt:'2026-09-26'});
}
const compass=['Latitude','Latitude Altitude','Limited','Limited Altitude','Trailhawk'];
add('Compass',compass,'standard',['heatedSeats','heatedWheel','carplay','androidAuto'],[],4);
add('Compass',compass,'standard',['laneAssist','forwardWarning','blindSpot','rearCross','emergencyBrake','driverAlert','backupCamera','remoteStart','passiveEntry','pushStart','keylessEntry'],[],5);
add('Compass',['Limited','Limited Altitude','Trailhawk'],'standard',['powerDriver','adaptiveCruise'],[],4);
add('Compass',['Limited','Limited Altitude','Trailhawk'],'standard',['powerLiftgate','dualClimate','rainWipers'],[],3);
add('Compass',['Trailhawk'],'standard',['towHooks','skidPlates'],[],3);
add('Compass',['Latitude Altitude'],'package',['powerDriver','dualClimate','powerLiftgate'],['Convenience Group'],5);
add('Compass',['Latitude Altitude'],'package',['wireless','fogLights','rainWipers','adaptiveCruise'],['Driver Assistance Group'],5);
add('Compass',['Limited','Limited Altitude','Trailhawk'],'package',['wireless','trafficSigns'],['Driver Assist Group I'],5);
add('Compass',['Latitude Altitude'],'package',['sunroof','panoramic','alpine','premiumAudio'],['Sun and Sound Group'],5);
add('Compass',['Limited','Limited Altitude','Trailhawk'],'package',['sunroof','panoramic','alpine','premiumAudio','navigation'],['Sun, Sound and NAV Group','Sun Sound and NAV Group'],5);
add('Compass',['Trailhawk'],'package',['tow'],['Trailer Tow Group'],5);
add('Compass',['Latitude Altitude','Limited','Limited Altitude','Trailhawk'],'optional',['sunroof','panoramic'],['Sun and Sound Group','Sun, Sound and NAV Group','Sun Sound and NAV Group'],3);
const gc=['Laredo Altitude','Limited','Limited Reserve','Summit'];
add('Grand Cherokee',gc,'standard',['heatedSeats','heatedWheel','carplay','androidAuto','navigation','adaptiveCruise','laneAssist','blindSpot','rearCross','emergencyBrake','forwardWarning','parkingSensors','remoteStart','passiveEntry'],[],4);
add('Grand Cherokee',gc,'standard',['powerDriver'],[],3);
add('Grand Cherokee',['Limited','Limited Reserve','Summit'],'standard',['powerPassenger','memorySeats'],[],3);
add('Grand Cherokee',['Limited','Limited Reserve','Summit'],'standard',['rearHeated'],[],4);
add('Grand Cherokee',['Limited Reserve','Summit'],'standard',['sunroof','panoramic','wireless','rainWipers','leather'],[],3);
add('Grand Cherokee',['Limited Reserve','Summit'],'standard',['ventilated','surroundCamera','driverAlert'],[],4);
add('Grand Cherokee',['Summit'],'standard',['massage','rearVented','mcintosh','premiumAudio','trafficSigns'],[],4);
add('Grand Cherokee',['Limited','Limited Reserve'],'standard',['alpine','premiumAudio'],[],4);
add('Grand Cherokee',['Limited'],'package',['surroundCamera','wireless','rainWipers','passiveEntry','parkingSensors'],['Luxury Tech Group II'],5);
add('Grand Cherokee',['Limited'],'package',['sunroof','panoramic'],['Limited Altitude Package'],5);
add('Grand Cherokee',['Limited Reserve'],'package',['hud'],['Premium Pack'],5);
add('Grand Cherokee',['Summit'],'package',['hud'],['Advanced Protech Group IV'],5);
add('Grand Cherokee',['Laredo Altitude','Limited','Limited Reserve'],'package',['tow'],['Trailer Tow Package'],5);
add('Grand Cherokee',['Summit'],'standard',['tow'],[],5);
add('Grand Cherokee',['Laredo Altitude','Limited'],'optional',['sunroof'],['Limited Altitude Package','Luxury Tech Group II'],3);
add('Grand Cherokee',['Limited'],'optional',['panoramic'],['Limited Altitude Package','Luxury Tech Group II'],3);
add('Grand Cherokee',['Limited'],'optional',['surroundCamera'],['Luxury Tech Group II'],4);
add('Grand Cherokee',['Limited Reserve'],'optional',['hud'],['Premium Pack'],5);
add('Grand Cherokee',['Summit'],'optional',['hud'],['Advanced Protech Group IV'],5);
// These Pacifica rules apply to gas models only. PHEV has separate package columns.
const pacifica=['Select','Limited','Pinnacle'];
add('Pacifica',pacifica,'standard',['powerDriver','heatedSeats','adaptiveCruise','blindSpot','rearCross','forwardWarning','laneAssist','emergencyBrake','keylessEntry','passiveEntry','carplay','androidAuto'],[],4);
add('Pacifica',['Limited','Pinnacle'],'standard',['wireless','powerPassenger','rearHeated','ventilated','navigation','leather'],[],4);
add('Pacifica',['Pinnacle'],'standard',['familyCamera','surroundCamera','harman','premiumAudio'],[],4);
add('Pacifica',['Limited'],'standard',['alpine','premiumAudio'],[],4);
add('Pacifica',['Select','Limited'],'package',['surroundCamera','parkingSensors'],['Safety Sphere Group'],5);
add('Pacifica',['Select','Limited'],'package',['familyCamera','outlet','powerPassenger'],['Uconnect Theater Family Group','Uconnect Theater Family Group II'],5);
add('Pacifica',['Select','Limited'],'optional',['surroundCamera'],['Safety Sphere Group'],4);
