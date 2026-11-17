import { services, estimate } from '../../js/punch-pricing.js';
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
export async function handler(event,context,deps={}){
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 if(!event.body||Buffer.byteLength(event.body)>4500000)return reply(413,{error:'Please keep photos under 3 MB total.'});
 let d;try{d=JSON.parse(event.body);}catch{return reply(400,{error:'Invalid request'});}
 if(!d||typeof d!=='object'||Array.isArray(d))return reply(400,{error:'Invalid request'});
 if(d.website)return reply(202,{ok:true});
 const clean=(v,max=3000)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max):'';
 const name=clean(d.name,120),email=clean(d.email,254),zip=clean(d.zip,10),phone=clean(d.phone,40);
 if(name.length<2||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{5}(-\d{4})?$/.test(zip)||phone.replace(/\D/g,'').length<10||!Array.isArray(d.items)||d.items.length<1||d.items.length>services.length)return reply(400,{error:'Check your contact details and select at least one repair.'});
 let totals;try{if(new Set(d.items.map(i=>i.id)).size!==d.items.length)throw Error();totals=estimate(d.items);}catch{return reply(400,{error:'Check selected services and quantities.'});}
 if(!Array.isArray(d.photos)||d.photos.length>5)return reply(400,{error:'Choose up to 5 photos.'});
 let bytes=0;const attachments=[];
 for(const p of d.photos){if(typeof p.content!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(p.content))return reply(400,{error:'Invalid photo.'});const b=Buffer.from(p.content,'base64');bytes+=b.length;let ext;if(b.subarray(0,3).equals(Buffer.from([255,216,255])))ext='jpg';else if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';else if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')ext='webp';else return reply(400,{error:'Use JPG, PNG or WebP photos.'});attachments.push({filename:`repair-${attachments.length+1}.${ext}`,content:p.content});}
 if(bytes>3000000)return reply(413,{error:'Please keep photos under 3 MB total.'});
 const env=deps.env||process.env;if(!env.RESEND_API_KEY)return reply(503,{error:'Delivery is unavailable. Your list is still here; please call (678) 571-7028.'});
 const items=d.items.map(i=>{const s=services.find(s=>s.id===i.id);return `${s.name}: ${i.quantity} ${s.unit||'item(s)'} — ${s.min?`$${s.min*i.quantity}–$${s.max*i.quantity} reference labor`:'Photo review needed'}`;});
 const text=[`New Punch List request`, `Name: ${name}`,`Email: ${email}`,`Phone: ${phone}`,`ZIP: ${zip}`,...items,`Reference labor subtotal: $${totals.low}–$${totals.high}; ${totals.review} service(s) need review. Not a final quote.`, `Details: ${clean(d.details)}`,`Timing: ${clean(d.timing,100)}`,`Campaign: ${clean(d.campaign,100)}`,`Service link: ${clean(d.interest,100)}`,`Photos: ${attachments.length}`].join('\n');
 try{const r=await (deps.fetch||fetch)('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:"Bento's Group Website <leads@bentos-group.com>",to:['charlesbgroup@gmail.com'],reply_to:email,subject:`Website Punch List — ${zip}`,text,attachments})});if(!r.ok)return reply(502,{error:'Delivery could not be confirmed. Please retry or call (678) 571-7028.'});const result=await r.json();if(!result.id)return reply(502,{error:'Delivery could not be confirmed.'});return reply(201,{ok:true,reference:result.id});}catch{return reply(502,{error:'Connection failed. Your list is still here. Please try again.'});}
}
