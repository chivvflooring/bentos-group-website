import { businessHours } from './business-hours.js';
import { scrollToChatBottom } from './utils.js';

//sessionStorage.setItem('previousPage', './' + location.pathname.split('/')[location.pathname.split('/').length - 1]);

// --- Constantes e Elementos DOM ---
//const splashScreenOverlay = document.querySelector(".splash-screen-overlay");
//const chatBtn = document.querySelector('.chat-fab');
//const chatContainer = document.querySelector('.chat-container');

// Melhoria: Usar uma constante para a chave de sessionStorage melhora a manutenibilidade
const IS_NEW_SESSION_KEY = 'isNewSession';

// --- 1. Lógica de Inicialização (Splash Screen Otimizada) ---

/**
 * Lida com a lógica de exibição/remoção da splash screen na nova sessão.
 */
function handleSplashScreen() {
    // Carrega o chat apenas após o site estar totalmente carregado
    const chatScript = document.createElement('script');
    chatScript.src = "./js/chat.js";
    chatScript.type = "module";
    document.body.appendChild(chatScript);

    if (sessionStorage.getItem(IS_NEW_SESSION_KEY) == 'false') return;

    // 1. Se já tem a classe de pular, não faz nada e apenas limpa o DOM
    /*if (document.documentElement.classList.contains('skip-splash')) {
        splashScreenOverlay.remove();
        chatBtn.hidden = false;
        return; // Encerra aqui
    }

    splashScreenOverlay.addEventListener('animationend', (event) => {
        const root = document.documentElement;
        if (event.animationName === 'sumir') {
            root.classList.remove('no-scroll');
            splashScreenOverlay.remove();
        }
    });*/

    // 1. Lista de termos suspeitos no navegador
    const botPatterns = /bot|googlebot|lighthouse|google-structured-data-testing-tool|bingbot|crawler|spider|robot|crawling/i;

    // 2. Verificação imediata
    const isAutomated = navigator.webdriver || botPatterns.test(navigator.userAgent);

    if (!isAutomated) {
        // 3. O "Pulo do Gato": Espera uma interação real ou um tempo mínimo
        // Ferramentas de análise rápida muitas vezes fecham a página em 1-2 segundos
        setTimeout(() => {
            // Só registra se a aba ainda estiver visível (bots de análise fecham rápido)
            if (document.visibilityState === 'visible') {
                // Executa ações da nova sessão (geolocalização e mostrar chat)
                // No visitor data is collected during chat initialization.
            }
        }, 3000); // 3 segundos de delay para garantir que é um humano lendo
    }

    // Define o chat para aparecer e marca a sessão como não-nova
    // O timeout deve ser igual à duração da animação 'sumir' (5s em style.css)
    setTimeout(() => {
        scrollToChatBottom();
        //chatContainer.hidden = false;
        sessionStorage.setItem(IS_NEW_SESSION_KEY, 'false');
    }, 5000);
}

// Execute assim que o DOM básico estiver pronto, sem esperar imagens
document.addEventListener('DOMContentLoaded', handleSplashScreen);

// --- 2. Lógica de Geolocalização e Notificação (Manutenção e Integração) ---

/**
 * Converte um objeto Date para o horário da Timezone de Atlanta (America/New_York).
 */
function getEasternTime() {
    const now = new Date();
    const options = { timeZone: businessHours.timezone };
    const easternNow = new Date(now.toLocaleString("en-US", options));

    const day = easternNow.getDay();
    const hour = easternNow.getHours();
    const minute = easternNow.getMinutes();
    const hourDecimal = hour + minute / 60;

    return { day, hour, minute, hourDecimal };
}

function isOpenNow() {
    const { day, hourDecimal } = getEasternTime();
    const today = businessHours.days[day];
    if (!today.hours) return false;

    const [start, end] = today.hours;
    return hourDecimal >= start && hourDecimal <= end;
}

function getNextOpeningTime() {
    const { day: currentDay, hourDecimal } = getEasternTime();

    for (let i = 0; i < 7; i++) {
        const dayIndex = (currentDay + i) % 7;
        const { name, hours } = businessHours.days[dayIndex];
        if (!hours) continue;

        const [start] = hours;

        if (i === 0 && hourDecimal < start)
            return `${businessHours.messages.nextOpening.today} ${formatTime(start)}`;
        if (i === 1)
            return `${businessHours.messages.nextOpening.tomorrow} ${formatTime(start)}`;
        if (i > 1)
            return `${businessHours.messages.nextOpening.weekday} ${name} at ${formatTime(start)}`;
    }

    return businessHours.messages.nextOpening.none;
}

function formatTime(decimalHour) {
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour - hours) * 60);
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const paddedMinutes = minutes.toString().padStart(2, "0");
    return `${displayHour}:${paddedMinutes} ${suffix}`;
}

function updateOpenStatus() {
    const openStatusCircle = document.querySelector(".open-status-circle");
    const openStatusTxt = document.querySelector(".open-status-txt");

    if (!openStatusCircle || !openStatusTxt) return;

    if (isOpenNow()) {
        openStatusCircle.style.background = businessHours.colors.open;
        openStatusCircle.setAttribute("aria-label", "We are currently open");

        openStatusTxt.textContent = businessHours.messages.status.open;
    } else {
        openStatusCircle.style.background = businessHours.colors.closed;

        const nextOpen = getNextOpeningTime();
        openStatusCircle.setAttribute("aria-label", `We are currently closed. Next opening: ${nextOpen}`);

        openStatusTxt.textContent = `${businessHours.messages.status.closed} · ${nextOpen}`;
    }

    document.querySelector('.status-wrapper').style.visibility = 'visible';;
}

updateOpenStatus();

/*const contactMethodsWindow = document.querySelector('.contact-methods-window');
const getInTouchButton = document.querySelector('.button.get-in-touch');
const closeContactMethodWindowButton = contactMethodsWindow.querySelector('.button.close-contact-method-window');

// Suporte a <dialog>?
const supportsDialog = typeof HTMLDialogElement === 'function';

// Abrir janela
getInTouchButton.addEventListener('click', () => {
    if (supportsDialog && contactMethodsWindow instanceof HTMLDialogElement) {
        if (contactMethodsWindow.open) {
            contactMethodsWindow.close();
        } else {
            contactMethodsWindow.showModal();
            contactMethodsWindow.focus();
        }
    } else {
        // fallback
        contactMethodsWindow.hidden = !contactMethodsWindow.hidden;
        if (!contactMethodsWindow.hidden) {
            contactMethodsWindow.focus();
        }
    }
});

// Fechar janela
closeContactMethodWindowButton.addEventListener('click', () => {
    if (supportsDialog && contactMethodsWindow instanceof HTMLDialogElement) {
        contactMethodsWindow.close();
    } else {
        contactMethodsWindow.hidden = true;
    }
});

// Botões de método
const chatMethodButton = document.querySelector('.button.chat-method');
const mailMethodButton = document.querySelector('.button.mail-method');
const callMethodButton = document.querySelector('.button.call-method');

const chatMethodContainer = contactMethodsWindow.querySelector('.chat');
const mailMethodContainer = contactMethodsWindow.querySelector('.mail');
const callMethodContainer = contactMethodsWindow.querySelector('.call');

function selectMethod(selectedButton, selectedContainer) {
    [chatMethodButton, mailMethodButton, callMethodButton].forEach(btn => btn.classList.remove('selected'));
    selectedButton.classList.add('selected');

    [chatMethodContainer, mailMethodContainer, callMethodContainer].forEach(el => el.hidden = true);
    selectedContainer.hidden = false;
}

chatMethodButton.addEventListener('click', () => selectMethod(chatMethodButton, chatMethodContainer));
mailMethodButton.addEventListener('click', () => selectMethod(mailMethodButton, mailMethodContainer));
callMethodButton.addEventListener('click', () => selectMethod(callMethodButton, callMethodContainer));*/