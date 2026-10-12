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
      quoteLink.href = './free-quote';
      quoteLink.textContent = ' Open the Free Quote form';
      quoteLink.className = 'chat-quote-link';
      text.append(document.createElement('br'), quoteLink);
    }
    messageContent.append(name, text);
    wrapper.append(...(role === 'user' ? [messageContent, avatar] : [avatar, messageContent]));
    messageList.appendChild(wrapper);

    if (save) {
      const history = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify([...history, { sender, role, content }].slice(-12)));
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

  const history = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
  if (history.length) history.forEach(message => displayMessage(message.sender, message.role, message.content, false));
  else displayMessage('Project helper', 'assistant', "Welcome! I can help route your Bento's Group remodeling or CHIVV Flooring inquiry. Messages in this helper stay in your browser and are not sent to the team.");

  function handleSendMessage() {
    const value = messageInput.value.trim();
    if (!value) return;
    messageInput.value = '';
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
