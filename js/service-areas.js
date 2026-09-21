const serviceOptions = [
  ['flooring', 'Flooring'],
  ['painting', 'Painting'],
  ['new-construction', 'Construction']
];

document.querySelectorAll('.area-card[data-city]').forEach((card) => {
  const city = card.dataset.city;
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  serviceOptions.forEach(([service, label]) => {
    const link = document.createElement('a');
    link.href = `/free-quote?service=${encodeURIComponent(service)}&city=${encodeURIComponent(city)}&source=${encodeURIComponent(`service-areas-${city}`)}`;
    link.textContent = label;
    link.setAttribute('aria-label', `${label} estimate in ${card.querySelector('h3').textContent}`);
    actions.append(link);
  });

  card.append(actions);
});
