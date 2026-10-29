const serviceOptions = [["flooring", "Flooring"], ["kitchen", "Kitchen"], ["bathroom", "Bathroom"], ["home-addition", "Home addition"], ["new-construction", "Custom home"], ["basement", "Basement"], ["decks", "Decks"], ["painting", "Painting"]];

document.querySelectorAll('.area-card[data-city]').forEach((card) => {
  if (card.querySelector(".card-actions")) return;
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
