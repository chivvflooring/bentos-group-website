export function scrollToChatBottom() {
    const messageList = document.querySelector('.chat-messages');
    if (!messageList) return;
    // Timeout para garantir que o DOM já renderizou a nova div
    setTimeout(() => {
        messageList.scrollTo({
            top: messageList.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}
