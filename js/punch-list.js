import { MAX_PHOTOS, MAX_ORIGINAL_BYTES, preparePhoto } from './repair-photos.js';
import {services,estimate} from './punch-pricing.js';
const form=document.querySelector('#repair-form'),container=document.querySelector('#services'),status=document.querySelector('#status'),photoInput=document.querySelector('#repair-photos');
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
for(const s of services){const card=document.createElement('article');card.className='service';card.innerHTML=`<label><input type="checkbox" value="${s.id}">${s.name}</label><p>${s.description}</p><p><b>${s.min?`${money(s.min)}–${money(s.max)} / ${s.unit} · labor reference`:'Photo review for pricing'}</b></p><label>Quantity ${s.unit?`(${s.unit})`:''}<input class="quantity" type="number" min="1" max="10000" step="1" value="1" aria-label="${s.name} quantity" disabled></label>`;container.append(card);}
function items(){return [...container.querySelectorAll('.service')].filter(c=>c.querySelector('[type=checkbox]').checked).map(c=>({id:c.querySelector('[type=checkbox]').value,quantity:Number(c.querySelector('[type=number]').value)}));}
function update(){for(const c of container.children)c.querySelector('[type=number]').disabled=!c.querySelector('[type=checkbox]').checked;const selected=items(),list=document.querySelector('#selected-list');list.replaceChildren();for(const i of selected){const p=document.createElement('p');p.textContent=`${services.find(s=>s.id===i.id).name} × ${i.quantity}`;list.append(p);}if(!selected.length)list.textContent='Select a repair to get started.';try{const e=estimate(selected);document.querySelector('#total').textContent=selected.length?`${e.low?`${money(e.low)}–${money(e.high)} reference labor`:''}${e.review?` · ${e.review} item(s) need review`:''}`:'';}catch{document.querySelector('#total').textContent='Enter a quantity from 1 to 10,000.';}}
container.addEventListener('input',update);
const params=new URLSearchParams(location.search);const interest=params.get('service');if(services.some(s=>s.id===interest)){container.querySelector(`input[value="${interest}"]`).checked=true;update();}
const photoStatus = document.querySelector('#photo-status');
const clearPhotos = document.querySelector('#clear-photos');
const preview = document.querySelector('#photo-preview');
const button = form.querySelector('button[type=submit]');
let photos = [];
let previewUrls = [];
let selection = 0;
let preparing = false;
let sending = false;

async function updatePhotos() {
  const revision = ++selection;
  const files = [...photoInput.files];
  previewUrls.forEach(url => URL.revokeObjectURL(url));
  previewUrls = [];
  preview.replaceChildren();
  photos = [];
  preparing = false;
  photoStatus.textContent = '';
  photoInput.setCustomValidity('');
  clearPhotos.hidden = !files.length;
  if (!files.length) return;
  const limitError = files.length > MAX_PHOTOS ? 'Choose up to 5 photos.'
    : files.some(file => file.size > MAX_ORIGINAL_BYTES) ? 'Choose photos under 20 MB each.' : '';
  if (limitError) {
    const message = limitError + ' You can also remove the photos and send your list.';
    photoInput.setCustomValidity(message);
    photoStatus.textContent = message;
    return;
  }
  preparing = true;
  photoStatus.textContent = 'Preparing photos…';
  try {
    const prepared = [];
    for (const file of files) {
      if (revision !== selection) return;
      prepared.push(await preparePhoto(file));
    }
    if (revision !== selection) return;
    photos = prepared;
    for (const photo of photos) {
      const image = document.createElement('img');
      image.src = URL.createObjectURL(photo);
      previewUrls.push(image.src);
      image.alt = 'Selected repair photo';
      preview.append(image);
    }
    photoStatus.textContent = `${photos.length} photo(s) ready.`;
  } catch {
    if (revision !== selection) return;
    const message = 'This device could not open one of the photos. Choose a JPG or PNG, remove the photos and send your list, or text us your photos.';
    photoStatus.textContent = message;
    photoInput.setCustomValidity(message);
  } finally {
    if (revision === selection) preparing = false;
  }
}

photoInput.addEventListener('change', updatePhotos);
clearPhotos.addEventListener('click', () => {
  photoInput.value = '';
  updatePhotos();
  photoInput.focus();
});

function encode(photo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ content: reader.result.split(',')[1] });
    reader.onerror = reject;
    reader.readAsDataURL(photo);
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  const selected = items();
  status.dataset.error = 'true';
  if (!selected.length) {
    status.textContent = 'Choose at least one repair.';
    container.querySelector('input').focus();
    return;
  }
  try { estimate(selected); } catch {
    status.textContent = 'Check your repair quantities.';
    return;
  }
  if (preparing) {
    status.textContent = 'Wait for your photos to finish preparing, then try again.';
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  sending = true;
  button.disabled = photoInput.disabled = clearPhotos.disabled = true;
  status.dataset.error = 'false';
  status.textContent = 'Sending your request…';
  let timer;
  let accepted = false;
  try {
    const attachments = await Promise.all(photos.map(encode));
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 25000);
    const response = await fetch('/.netlify/functions/punch-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, items: selected, photos: attachments,
        details: document.querySelector('#details').value,
        campaignTag: window.bentosCampaign || '',
        campaign: params.get('utm_campaign') || '',
        source: params.get('utm_source') || '',
        medium: params.get('utm_medium') || '',
        interest: services.some(service => service.id === interest) ? interest : '' }),
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(response.status === 429
      ? 'Too many attempts. Wait a minute before trying again.'
      : body.error || 'Delivery could not be confirmed.');
    accepted = true;
    status.textContent = 'Your request was accepted. We’ll review your list and contact you to confirm pricing. No work is booked yet.';
    button.textContent = 'Request sent';
    if (response.status === 201 && body.reference) {
      const ownerTest = data.email.trim().toLowerCase() === 'charlesbgroup@gmail.com';
      window.bentosTrack?.(ownerTest ? 'punch_list_test_success' : 'punch_list_submitted');
    }
  } catch (error) {
    status.dataset.error = 'true';
    status.textContent = `${error.name === 'AbortError' ? 'Confirmation timed out. You can retry the same request or call us.' : error.message} Your entries are still here.`;
  } finally {
    clearTimeout(timer);
    if (!accepted) {
      button.disabled = photoInput.disabled = clearPhotos.disabled = false;
      sending = false;
    }
  }
});

form.addEventListener('input', event => {
  if (event.target.name === 'website') return;
  if (form.dataset.started) return;
  form.dataset.started = 'true';
  window.bentosTrack?.('punch_list_started');
});
