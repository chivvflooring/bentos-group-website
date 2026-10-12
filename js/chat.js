import { scrollToChatBottom } from './utils.js';

const chatFab = document.querySelector('.chat-fab');
const chatContainer = document.querySelector('.chat-container');
const closeChatBtn = document.querySelector('.close-chat-btn');
const chatForm = document.querySelector('.chat-input');
const messageList = document.querySelector('.chat-messages');
const messageInput = chatForm?.querySelector('input');
const sendButton = chatForm?.querySelector('button');
const HISTORY_KEY = 'bentos_project_helper_history';

if (chatFab && chatContainer && closeChatBtn && chatForm && messageList && messageInput && sendButton && !chatContainer.dataset.initialized) {
  // Keep helper dialogue out of search-result snippets on every page.
  chatContainer.setAttribute('data-nosnippet', '');
  chatContainer.dataset.initialized = 'true';

  // Keep real contact paths available even before a visitor types a message.
  const contactActions = document.createElement('nav');
  contactActions.className = 'chat-contact-actions';
  contactActions.setAttribute('aria-label', 'Contact the project team');
  const requestLink = document.createElement('a');
  requestLink.textContent = 'Send a project request';
  const callLink = document.createElement('a');
  callLink.href = 'tel:+16785717028';
  callLink.textContent = 'Call the team';
  const textLink = document.createElement('a');
  textLink.href = 'sms:+16785717028';
  textLink.textContent = 'Text photos';
  contactActions.append(requestLink, callLink, textLink);
  messageList.before(contactActions);

  function serviceFor(value) {
    if (/custom.home|new.construction|home.build|build.*house|lot|land|foundation/.test(value)) return 'new-construction';
    if (/floor|hardwood|vinyl|laminate|tile|stair/.test(value)) return 'flooring';
    if (/kitchen|cabinet/.test(value)) return 'kitchen';
    if (/bath|shower/.test(value)) return 'bathroom';
    return '';
  }

  let selectedService = serviceFor(window.location.pathname);
  function updateRequestLink() {
    const params = new URLSearchParams({source: 'project-helper'});
    if (selectedService) params.set('service', selectedService);
    requestLink.href = '/free-quote?' + params;
  }
  updateRequestLink();

  function readHistory() {
    try {
      const history = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(history) ? history.filter(item => item &&
        ['user', 'assistant'].includes(item.role) && typeof item.sender === 'string' &&
        typeof item.content === 'string').slice(-12).map(item => ({
          sender: item.sender.slice(0, 60), role: item.role, content: item.content.slice(0, 1000)
        })) : [];
    } catch (_) { return []; }
  }

  function displayMessage(sender, role, content, save = true) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${role === 'user' ? 'user' : 'bot'}`;

    const avatar = document.createElement('img');
    avatar.src = role === 'user' ? './assets/images/profile-user.webp' : './assets/images/bot-bella-profile.webp';
    avatar.alt = '';
    avatar.className = 'avatar';
    avatar.width = 40;
    avatar.height = 40;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    const name = document.createElement('span');
    name.className = 'user-name';
    name.textContent = sender;
    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = content;
    if (role !== 'user' && content.includes('Free Quote')) {
      const quoteLink = document.createElement('a');
      quoteLink.href = requestLink.href;
      quoteLink.textContent = ' Open the Free Quote form';
      quoteLink.className = 'chat-quote-link';
      text.append(document.createElement('br'), quoteLink);
    }
    messageContent.append(name, text);
    wrapper.append(...(role === 'user' ? [messageContent, avatar] : [avatar, messageContent]));
    messageList.appendChild(wrapper);

    if (save) {
      try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify([...readHistory(), { sender, role, content }].slice(-12)));
      } catch (_) { /* Contact options still work when browser storage is unavailable. */ }
    }
    scrollToChatBottom();
  }

  function getReply(message) {
    const value = message.toLowerCase();
    if (/quote|estimate|price|cost|schedule|appointment/.test(value)) {
      return 'For project-specific pricing or scheduling, please use the Free Quote form. It asks for the details the team needs to follow up.';
    }
    if (/floor|hardwood|vinyl|laminate|tile/.test(value)) {
      return "Flooring is the CHIVV Flooring specialty within Bento's Group. Use the Free Quote form to tell the team about your rooms, material, and project location.";
    }
    if (/kitchen|bath|remodel|renovat|addition|construction|paver|hardscap/.test(value)) {
      return "Bento's Group handles residential remodeling and construction inquiries. Share your scope and location through the Free Quote form for a project-specific response.";
    }
    return "I’m an automated project helper, not a live representative. I can direct you to Bento’s Group services; for a reliable answer about your project, please use the Free Quote form or call (678) 571-7028.";
  }

  const history = readHistory();
  if (history.length) history.forEach(message => displayMessage(message.sender, message.role, message.content, false));
  else displayMessage('Project helper', 'assistant', "Welcome! I can help route your Bento's Group remodeling or CHIVV Flooring inquiry. Messages in this helper stay in your browser and are not sent to the team.");

  function handleSendMessage() {
    const value = messageInput.value.trim().slice(0, 1000);
    if (!value) return;
    messageInput.value = '';
    selectedService = serviceFor(value.toLowerCase()) || selectedService;
    updateRequestLink();
    displayMessage('You', 'user', value);
    displayMessage('Project helper', 'assistant', getReply(value));
  }

  chatFab.addEventListener('click', () => {
    chatContainer.hidden = false;
    chatFab.hidden = true;
    messageInput.focus();
    scrollToChatBottom();
  });
  closeChatBtn.addEventListener('click', () => {
    chatContainer.hidden = true;
    chatFab.hidden = false;
    chatFab.focus();
  });
  sendButton.addEventListener('click', handleSendMessage);
  chatForm.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSendMessage();
    }
  });
}
