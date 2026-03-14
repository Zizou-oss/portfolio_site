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
});
