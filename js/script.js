document.addEventListener('DOMContentLoaded', function() {
    document.documentElement.classList.add('js');
    // Éléments du menu burger
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    const header = document.querySelector('.site-header');
    const body = document.body;
    
    // Gestion des liens de navigation
    const links = document.querySelectorAll('.main-nav a[href^="#"], .main-nav a[href$="index.html"]');

    // Animation du texte d'accueil
    const textRotate = document.querySelector('.text-rotate');
    if (textRotate) {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const words = (textRotate.dataset.words || '').split(',').map(w => w.trim()).filter(Boolean);
        let index = 0;
        
        if (!prefersReduced && words.length > 1) {
            setInterval(() => {
                textRotate.classList.add('is-out');
                setTimeout(() => {
                    index = (index + 1) % words.length;
                    textRotate.textContent = words[index];
                    textRotate.classList.remove('is-out');
                }, 350);
            }, 2200);
        }
    }
    
    function getHeaderHeight() {
        return header ? header.offsetHeight : 0;
    }
    
    function normalizeHash(targetHash) {
        if (!targetHash || targetHash === '') {
            return '#top';
        }
        return targetHash;
    }
    
    // Fonction pour activer le lien correspondant à la section
    function activateLink(targetHash) {
        const normalizedHash = normalizeHash(targetHash);
        links.forEach(a => {
            const href = a.getAttribute('href');
            const isHome = href === '#top' || href.endsWith('index.html');
            // Pour "Accueil" on compare l'URL, sinon on compare le hash
            if ((normalizedHash === '#top' && isHome) || href === normalizedHash) {
                a.classList.add('active');
            } else {
                a.classList.remove('active');
            }
        });
    }
    
    // Fonction pour fermer le menu burger
    function closeMenu() {
        mainNav.classList.remove('nav-open');
        mobileNavToggle.classList.remove('is-active');
        mobileNavToggle.setAttribute('aria-expanded', 'false');
        body.classList.remove('no-scroll');
    }
    
    // Fonction pour ouvrir le menu burger
    function openMenu() {
        mainNav.classList.add('nav-open');
        mobileNavToggle.classList.add('is-active');
        mobileNavToggle.setAttribute('aria-expanded', 'true');
        body.classList.add('no-scroll');
    }
    
    // Fonction pour basculer l'état du menu
    function toggleMenu() {
        if (mainNav.classList.contains('nav-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    }
    
    // Gestionnaire d'événement pour le bouton burger
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });
    }
    
    // Fermer le menu si on clique en dehors
    document.addEventListener('click', function(e) {
        if (mainNav.classList.contains('nav-open') && 
            !mainNav.contains(e.target) && 
            !mobileNavToggle.contains(e.target)) {
            closeMenu();
        }
    });
    
    // Gestion des clics sur les liens de navigation
    links.forEach(a => {
        a.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Si c'est un lien interne (avec #)
            if (href.startsWith('#')) {
                e.preventDefault();
                
                // Fermer le menu mobile si ouvert
                if (mainNav.classList.contains('nav-open')) {
                    closeMenu();
                }
                
                // Faire défiler vers la section
                if (href === '#top') {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                } else {
                    const targetElement = document.querySelector(href);
                    if (targetElement) {
                        // Calculer la position en tenant compte du header fixe
                        const headerHeight = getHeaderHeight();
                        const targetPosition = targetElement.offsetTop - headerHeight;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
                
                // Mettre à jour l'URL
                history.pushState(null, '', href);
            } else {
                // Pour le lien "Accueil" ou autres liens externes
                if (mainNav.classList.contains('nav-open')) {
                    closeMenu();
                }
            }
            
            // Activer le lien
            activateLink(href);
        });
    });
    
    // Fermer le menu avec la touche Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mainNav.classList.contains('nav-open')) {
            closeMenu();
        }
    });
    
    // Fermer le menu lors du redimensionnement de la fenêtre (passage en desktop)
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992 && mainNav.classList.contains('nav-open')) {
            closeMenu();
        }
    });
    
    // Gestion du scroll pour mettre en surbrillance le lien actif
    function handleScroll() {
        const sections = document.querySelectorAll('section[id]');
        const headerHeight = getHeaderHeight();
        const scrollPosition = window.scrollY + headerHeight + 100;
        
        // Si on est tout en haut de la page
        if (window.scrollY < 100) {
            activateLink('#top');
            return;
        }
        
        // Parcourir les sections pour trouver celle qui est visible
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                activateLink('#' + section.id);
            }
        });
    }
    
    // Écouter le scroll avec throttling pour les performances
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
    
    // Animation d'apparition des cartes projets
    const timelineItems = document.querySelectorAll('.timeline-item');
    if (timelineItems.length) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    } else {
                        entry.target.classList.remove('is-visible');
                    }
                });
            }, {
                threshold: 0.25,
                rootMargin: '0px 0px -10% 0px'
            });
            
            timelineItems.forEach(item => observer.observe(item));
        } else {
            timelineItems.forEach(item => item.classList.add('is-visible'));
        }
    }

    // Animation d'apparition des compétences
    const skillCards = document.querySelectorAll('.skill-card');
    if (skillCards.length) {
        if ('IntersectionObserver' in window) {
            const skillsObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    } else {
                        entry.target.classList.remove('is-visible');
                    }
                });
            }, {
                threshold: 0.2,
                rootMargin: '0px 0px -10% 0px'
            });
            
            skillCards.forEach(item => skillsObserver.observe(item));
        } else {
            skillCards.forEach(item => item.classList.add('is-visible'));
        }
    }
    
    // Au chargement de la page, activer le bon lien
    activateLink(window.location.hash || '#top');
    
    // Gestion de l'historique du navigateur (boutons précédent/suivant)
    window.addEventListener('popstate', function() {
        activateLink(window.location.hash || '#top');
        
        // Faire défiler vers la section correspondante
        if (window.location.hash) {
            if (window.location.hash === '#top') {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            } else {
                const targetElement = document.querySelector(window.location.hash);
                if (targetElement) {
                    const headerHeight = getHeaderHeight();
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        } else {
            // Aller en haut de la page pour "Accueil"
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });

    // --- NEW MASTERCLASS FEATURES ---

    // 1. Vanta.js 3D Background (Net Effect)
    let vantaEffect = null;
    if (window.VANTA) {
        vantaEffect = window.VANTA.NET({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0x00f0ff,
            backgroundColor: 0x050505,
            points: 12.00,
            maxDistance: 22.00,
            spacing: 18.00
        });
    }

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const updateVantaColors = (theme) => {
        if (!vantaEffect) return;
        if (theme === 'dark') {
            vantaEffect.setOptions({
                color: 0x00f0ff, // cyan
                backgroundColor: 0x050505
            });
        } else {
            vantaEffect.setOptions({
                color: 0xff6b35, // orange
                backgroundColor: 0xf6f3ef // light bg
            });
        }
    };

    const setTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);
        updateVantaColors(theme);
    };

    // Initialize Theme (Default to Dark)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    // 2. Assistant IA du portfolio
    const chatRoot = document.querySelector('.ai-chat');
    if (chatRoot) {
        const chatToggle = chatRoot.querySelector('.ai-chat-toggle');
        const chatPanel = chatRoot.querySelector('.ai-chat-panel');
        const chatClose = chatRoot.querySelector('.ai-chat-close');
        const chatForm = chatRoot.querySelector('.ai-chat-form');
        const chatInput = chatRoot.querySelector('#ai-chat-input');
        const chatMessages = chatRoot.querySelector('.ai-chat-messages');
        const chatChips = chatRoot.querySelectorAll('.ai-chip');
        const chatLaunchers = document.querySelectorAll('[data-open-chat]');
        const chatSubmitButton = chatForm ? chatForm.querySelector('button[type="submit"]') : null;
        let chatHistory = [];
        let isChatLoading = false;
        let streamFlushTimer = null;

        const scrollChatToBottom = () => {
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        };

        const setChatOpen = (isOpen) => {
            chatRoot.classList.toggle('is-open', isOpen);
            if (chatToggle) {
                chatToggle.setAttribute('aria-expanded', String(isOpen));
            }
            if (chatPanel) {
                chatPanel.hidden = !isOpen;
            }

            if (isOpen && chatInput) {
                window.requestAnimationFrame(() => {
                    chatInput.focus();
                    scrollChatToBottom();
                });
            }
        };

        const appendChatMessage = (role, text, pending = false) => {
            if (!chatMessages) {
                return null;
            }

            const message = document.createElement('article');
            message.className = `ai-message ai-message-${role}`;
            if (pending) {
                message.classList.add('is-pending');
            }

            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            message.appendChild(paragraph);
            chatMessages.appendChild(message);
            scrollChatToBottom();
            return message;
        };

        const setChatLoading = (loading) => {
            isChatLoading = loading;

            if (chatInput) {
                chatInput.disabled = loading;
            }
            if (chatSubmitButton) {
                chatSubmitButton.disabled = loading;
            }

            chatChips.forEach(chip => {
                chip.disabled = loading;
            });
        };

        const createStreamingMessage = () => {
            if (!chatMessages) {
                return null;
            }

            const message = document.createElement('article');
            message.className = 'ai-message ai-message-bot is-streaming is-awaiting';

            const paragraph = document.createElement('p');
            const typing = document.createElement('div');
            typing.className = 'ai-typing';
            typing.setAttribute('aria-hidden', 'true');
            typing.innerHTML = '<span></span><span></span><span></span>';
            message.appendChild(paragraph);
            message.appendChild(typing);
            chatMessages.appendChild(message);
            scrollChatToBottom();

            return { message, paragraph, typing, hasStarted: false, pendingText: '' };
        };

        const ensureStreamStarted = (streamTarget) => {
            if (!streamTarget || streamTarget.hasStarted) {
                return;
            }

            streamTarget.hasStarted = true;
            streamTarget.message.classList.remove('is-awaiting');
            if (streamTarget.typing) {
                streamTarget.typing.remove();
                streamTarget.typing = null;
            }
        };

        const applyStreamChunk = (streamTarget, textChunk) => {
            if (!streamTarget || !streamTarget.paragraph || !textChunk) {
                return;
            }

            ensureStreamStarted(streamTarget);

            streamTarget.paragraph.textContent += textChunk;
            scrollChatToBottom();
        };

        const finalizeStreamMessage = (streamTarget) => {
            if (streamTarget && streamTarget.message) {
                streamTarget.message.classList.remove('is-streaming');
                streamTarget.message.classList.remove('is-awaiting');
            }
            if (streamTarget && streamTarget.typing) {
                streamTarget.typing.remove();
                streamTarget.typing = null;
            }
        };

        const stopStreamFlush = () => {
            if (streamFlushTimer) {
                window.clearInterval(streamFlushTimer);
                streamFlushTimer = null;
            }
        };

        const queueStreamChunk = (streamTarget, textChunk) => {
            if (!streamTarget || !textChunk) {
                return;
            }

            streamTarget.pendingText += textChunk;

            if (streamFlushTimer) {
                return;
            }

            streamFlushTimer = window.setInterval(() => {
                if (!streamTarget.pendingText) {
                    stopStreamFlush();
                    return;
                }

                const sliceSize = streamTarget.pendingText.length > 24 ? 3 : 2;
                const nextSlice = streamTarget.pendingText.slice(0, sliceSize);
                streamTarget.pendingText = streamTarget.pendingText.slice(sliceSize);
                applyStreamChunk(streamTarget, nextSlice);

                if (!streamTarget.pendingText) {
                    stopStreamFlush();
                }
            }, 24);
        };

        const consumeEventStream = async (response, streamTarget) => {
            if (!response.body) {
                throw new Error('Flux indisponible.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finalAnswer = '';

            const processEventBlock = (block) => {
                if (!block.trim()) {
                    return;
                }

                let eventName = 'message';
                const dataLines = [];

                for (const line of block.split('\n')) {
                    if (line.startsWith('event:')) {
                        eventName = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        dataLines.push(line.slice(5).trimStart());
                    }
                }

                if (!dataLines.length) {
                    return;
                }

                let payload = {};
                try {
                    payload = JSON.parse(dataLines.join('\n'));
                } catch (error) {
                    payload = {};
                }

                if (eventName === 'chunk' && typeof payload.text === 'string') {
                    queueStreamChunk(streamTarget, payload.text);
                    finalAnswer += payload.text;
                    return;
                }

                if (eventName === 'done' && typeof payload.answer === 'string') {
                    finalAnswer = payload.answer;
                    while (streamTarget && streamTarget.pendingText) {
                        const nextSlice = streamTarget.pendingText.slice(0, 3);
                        streamTarget.pendingText = streamTarget.pendingText.slice(3);
                        applyStreamChunk(streamTarget, nextSlice);
                    }
                    stopStreamFlush();
                    if (streamTarget && streamTarget.paragraph) {
                        ensureStreamStarted(streamTarget);
                        streamTarget.paragraph.textContent = payload.answer;
                    }
                    finalizeStreamMessage(streamTarget);
                    scrollChatToBottom();
                    return;
                }

                if (eventName === 'error') {
                    throw new Error(payload.error || 'Le service IA ne repond pas.');
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
                buffer = buffer.replace(/\r\n/g, '\n');

                let separatorIndex = buffer.indexOf('\n\n');
                while (separatorIndex !== -1) {
                    const eventBlock = buffer.slice(0, separatorIndex);
                    buffer = buffer.slice(separatorIndex + 2);
                    processEventBlock(eventBlock);
                    separatorIndex = buffer.indexOf('\n\n');
                }

                if (done) {
                    break;
                }
            }

            if (buffer.trim()) {
                processEventBlock(buffer);
            }

            while (streamTarget && streamTarget.pendingText) {
                const nextSlice = streamTarget.pendingText.slice(0, 3);
                streamTarget.pendingText = streamTarget.pendingText.slice(3);
                applyStreamChunk(streamTarget, nextSlice);
            }
            stopStreamFlush();
            finalizeStreamMessage(streamTarget);
            return finalAnswer.trim();
        };

        const sendQuestion = async (rawQuestion) => {
            const question = rawQuestion.trim();

            if (!question || isChatLoading) {
                return;
            }

            setChatOpen(true);
            appendChatMessage('user', question);

            if (chatInput) {
                chatInput.value = '';
            }

            setChatLoading(true);
            const streamTarget = createStreamingMessage();

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream'
                    },
                    body: JSON.stringify({
                        question,
                        history: chatHistory,
                        stream: true
                    })
                });

                if (!response.ok) {
                    let payload = {};
                    try {
                        payload = await response.json();
                    } catch (error) {
                        payload = {};
                    }
                    throw new Error(payload.error || 'Le service IA ne repond pas.');
                }

                const answer = await consumeEventStream(response, streamTarget);

                if (!answer) {
                    throw new Error('Reponse vide.');
                }

                chatHistory = [
                    ...chatHistory,
                    { role: 'user', text: question },
                    { role: 'model', text: answer }
                ].slice(-10);
            } catch (error) {
                stopStreamFlush();
                if (streamTarget && streamTarget.message) {
                    streamTarget.message.remove();
                }
                appendChatMessage('bot', "Le chat IA n'est pas disponible pour le moment. Reessaie un peu plus tard ou contacte-moi directement via WhatsApp ou e-mail.");
            } finally {
                setChatLoading(false);
            }
        };

        if (chatToggle) {
            chatToggle.addEventListener('click', () => {
                const isOpen = chatToggle.getAttribute('aria-expanded') === 'true';
                setChatOpen(!isOpen);
            });
        }

        if (chatClose) {
            chatClose.addEventListener('click', () => {
                setChatOpen(false);
            });
        }

        if (chatForm) {
            chatForm.addEventListener('submit', (event) => {
                event.preventDefault();
                sendQuestion(chatInput ? chatInput.value : '');
            });
        }

        chatChips.forEach(chip => {
            chip.addEventListener('click', () => {
                sendQuestion(chip.dataset.question || chip.textContent || '');
            });
        });

        chatLaunchers.forEach(button => {
            button.addEventListener('click', () => {
                setChatOpen(true);
            });
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && chatPanel && !chatPanel.hidden) {
                setChatOpen(false);
            }
        });
    }

    // 3. GSAP & ScrollTrigger Animations
    if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);

        // Section Headers
        gsap.utils.toArray('.section-head').forEach(head => {
            gsap.from(head, {
                scrollTrigger: {
                    trigger: head,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                },
                y: 50,
                opacity: 0,
                duration: 0.8,
                ease: "power3.out"
            });
        });

        // About section
        gsap.from(".about-media img", {
            scrollTrigger: {
                trigger: ".about",
                start: "top 75%",
                toggleActions: "play none none reverse"
            },
            scale: 0.8,
            opacity: 0,
            duration: 1,
            ease: "back.out(1.5)"
        });

        gsap.from(".about-card", {
            scrollTrigger: {
                trigger: ".about-card",
                start: "top 85%",
                toggleActions: "play none none reverse"
            },
            x: 50,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        });
    }
});
