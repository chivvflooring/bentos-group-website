export const services = [
  {id:'recoat',name:'Hardwood screen & recoat',unit:'sq ft',min:2,max:2,description:'Refresh a compatible existing finish. No sanding to bare wood. Minimum visit and condition confirmed after review.'},
  {id:'mirror',name:'Mirror installation',unit:'mirror',min:80,max:100,description:'Labor for a standard customer-supplied mirror; wall support and size reviewed.'},
  {id:'toilet',name:'Toilet remove & reinstall',unit:'toilet',min:180,max:250,description:'Labor using the existing location. Fixture, flange repairs and licensed trade scope confirmed separately.'},
  {id:'vanity',name:'Vanity cabinet installation',unit:'cabinet',min:350,max:450,description:'Labor for a customer-supplied cabinet. Countertop, plumbing and wall repairs priced separately.'},
  {id:'paint',name:'Painting & drywall touch-ups',description:'Walls, ceilings, doors, trim or a room refresh. Add photos and approximate dimensions.'},
  {id:'kitchen',name:'Kitchen cabinet refresh',description:'Cabinet painting, hardware, backsplash or countertops. Keep your layout and choose the changes you need.'},
  {id:'bath',name:'Bathroom repairs & refresh',description:'Caulking, damaged tile, fixtures or a larger update. Show us each area.'},
  {id:'deck',name:'Deck repairs, stain & paint',description:'Boards, stairs, rails and weathered finishes. Share overall and close-up photos.'},
  {id:'water',name:'Gutters, driveway & water concerns',description:'Overflowing gutters, pooling water or stains. Photos help plan an inspection; concealed damage needs assessment.'},
  {id:'small',name:'Doors, trim & other small repairs',description:'Sticking doors, loose trim, cabinet adjustments or another item on your list.'}
];
export function estimate(items) {
 let low=0,high=0,review=0;
 for(const item of items){const s=services.find(s=>s.id===item.id);if(!s||!Number.isFinite(item.quantity)||item.quantity<1||item.quantity>10000)throw new Error('Invalid repair quantity');if(s.min){low+=s.min*item.quantity;high+=s.max*item.quantity;}else review++;}
 return {low,high,review};
}
