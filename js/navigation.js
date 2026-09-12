document.addEventListener("DOMContentLoaded", () => {
    const navMenu = document.querySelector(".menu-nav");
    const navList = document.querySelector(".menu-nav ul");
    const moreMenu = document.querySelector(".more-menu");
    const moreDropdown = document.querySelector("#more-menu-list");
    const toggleButton = document.querySelector(".more-toggle");
    const hamburguerBtn = document.querySelector(".menu-hamburguer");

    // Financing is a planning resource, not an enabled lending offer. Add the
    // link consistently to shared navigation without duplicating page markup.
    if (navList && !navList.querySelector('[href$="financing"], [href$="financing.html"]')) {
        const financingItem = document.createElement("li");
        financingItem.innerHTML = '<a href="./financing.html" class="button" id="menu-financing">Financing</a>';
        navList.insertBefore(financingItem, moreMenu || null);
    }

    // Seleção dos itens (li)
    const aboutUsMenu = document.querySelector("#menu-about")?.parentElement;
    const galleryMenu = document.querySelector("#menu-gallery")?.parentElement;
    const blogMenu = document.querySelector("#menu-blog")?.parentElement;

    const movableItems = [aboutUsMenu, galleryMenu, blogMenu];

    if (!navList || !moreMenu || !moreDropdown || !toggleButton || movableItems.some(item => !item)) {
        return;
    }

    function resetMenuPositions() {
        // Insere de volta na lista principal antes do botão "More"
        navList.insertBefore(aboutUsMenu, moreMenu);
        navList.insertBefore(galleryMenu, moreMenu);
        navList.insertBefore(blogMenu, moreMenu);
    }

    function adjustMenu() {
        const windowWidth = window.innerWidth;

        // 1. Reset padrão
        resetMenuPositions();
        moreDropdown.hidden = true;

        // 2. Lógica de Breakpoints (Prioridade do menor para o maior)

        // ABAIXO DE 664px: Menu Hamburguer (Lógica de CSS geralmente assume aqui)
        if (windowWidth < 664) {
            // No mobile, geralmente não usamos o dropdown "More", 
            // os itens ficam na vertical via CSS.
            return;
        }

        // ABAIXO DE 848px: Gallery, Blog E About dentro do "More"
        if (windowWidth < 848) {
            moreDropdown.appendChild(aboutUsMenu);
            moreDropdown.appendChild(galleryMenu);
            moreDropdown.appendChild(blogMenu);
        }
        // ABAIXO DE 942px: Apenas Gallery e Blog dentro do "More"
        else if (windowWidth < 942) {
            moreDropdown.appendChild(galleryMenu);
            moreDropdown.appendChild(blogMenu);
        }
        // ACIMA DE 942px: Tudo visível (Já garantido pelo resetMenuPositions)
    }

    toggleButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
        toggleButton.setAttribute("aria-expanded", !isExpanded);
        moreDropdown.hidden = isExpanded;
        moreMenu.classList.toggle("open");
    });

    // Fechar ao clicar fora
    document.addEventListener("click", () => {
        toggleButton.setAttribute("aria-expanded", "false");
        moreDropdown.hidden = true;
        moreMenu.classList.remove("open");
    });

    let isMenuHidden = true;
    hamburguerBtn.addEventListener("click", () => {
        navMenu.style.display = isMenuHidden ? 'block' : '';
        isMenuHidden = !isMenuHidden;
    });

    window.addEventListener("resize", adjustMenu);
    adjustMenu(); // Execução inicial

    const windowWidth = window.innerWidth;

    if (windowWidth < 760) {
        const header = document.querySelector('#main-header');
        let lastScroll = 0;
    
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
    
            if (currentScroll <= 150) {
                // No topo da página, o header sempre aparece
                header.classList.remove('header-hidden');
                return;
            }
    
            if (currentScroll > lastScroll && !header.classList.contains('header-hidden')) {
                // Scroll pra baixo: esconde
                header.classList.add('header-hidden');
            } else if (currentScroll < lastScroll && header.classList.contains('header-hidden')) {
                // Scroll pra cima: mostra
                header.classList.remove('header-hidden');
            }
    
            lastScroll = currentScroll;
        });
    }
});
