// One-time deployment maintenance. Do not print credentials or provider bodies.
const id='18b0b2ed-aa7e-4e9e-a795-6ddbe4914de7';
const key=process.env.RESEND_API_KEY;
if(!key){console.log('Campaign tracking setup: missing environment configuration.');process.exit(0);}
try{
 const headers={Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 const r=await fetch(`https://api.resend.com/domains/${id}`,{method:'PATCH',headers,body:JSON.stringify({open_tracking:true,click_tracking:true})});
 if(!r.ok){console.log(`Campaign tracking setup: provider status ${r.status}.`);process.exit(0);}
 const v=await fetch(`https://api.resend.com/domains/${id}`,{headers});const d=await v.json();
 console.log(JSON.stringify({campaign_tracking_verified:d.open_tracking===true&&d.click_tracking===true,open_tracking:d.open_tracking,click_tracking:d.click_tracking}));
}catch{console.log('Campaign tracking setup: connection unavailable.');}
