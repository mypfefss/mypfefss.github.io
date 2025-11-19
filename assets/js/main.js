// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
});

// Smooth Scrolling for Internal Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar Background on Scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    }
});

// Animate Elements on Scroll - Enhanced version
function animateOnScroll() {
    // Original selectors for backward compatibility (removed .stat-item)
    const legacyElements = document.querySelectorAll('.feature, .program-item, .organizer, .workshop-card, .schedule-item, .benefit-card, .info-card, .contact-card, .registration-card, .partner-logo');
    
    legacyElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });

    // New scroll reveal system with timeline synchronization
    const scrollRevealElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, .text-reveal');
    
    scrollRevealElements.forEach((element, index) => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        const elementVisible = 100;
        
        if (elementTop < window.innerHeight - elementVisible && elementBottom > 0) {
            element.classList.add('revealed');
            
            // Special handling for schedule items to create synchronized timeline
            if (element.classList.contains('schedule-item')) {
                // Add a small delay to make the timeline segment appear with the content
                setTimeout(() => {
                    element.classList.add('timeline-revealed');
                }, 200);
            }
        }
    });

    // Parallax effect for background elements
    const parallaxElements = document.querySelectorAll('.parallax-bg');
    const scrolled = window.pageYOffset;
    
    parallaxElements.forEach(element => {
        const rate = scrolled * -0.5;
        element.style.transform = `translateY(${rate}px)`;
    });
}

// Initialize animation styles - Enhanced version
document.addEventListener('DOMContentLoaded', function() {
    // Original legacy elements (removed .stat-item)
    const legacyElements = document.querySelectorAll('.feature, .program-item, .organizer, .workshop-card, .schedule-item, .benefit-card, .info-card, .contact-card, .registration-card, .partner-logo');
    legacyElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    // Initialize scroll reveal elements
    const scrollRevealElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, .text-reveal');
    scrollRevealElements.forEach((element, index) => {
        // Add stagger delay for elements in the same container
        const container = element.closest('section, .container');
        if (container) {
            const elementsInContainer = container.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, .text-reveal');
            const elementIndex = Array.from(elementsInContainer).indexOf(element);
            if (elementIndex < 6) {
                element.classList.add(`delay-${elementIndex + 1}`);
            }
        }
    });

    // Trigger initial animation check
    animateOnScroll();
});

window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// Registration Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('registrationModal');
    const registerBtns = document.querySelectorAll('.register-btn');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelRegistration');
    const modalTitle = document.getElementById('modalTitle');
    const academicSection = document.getElementById('academicSection');

    if (modal && registerBtns.length > 0) {
        registerBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                if (type === 'student') {
                    modalTitle.textContent = 'Student Registration';
                    academicSection.style.display = 'block';
                } else {
                    modalTitle.textContent = 'Company Registration';
                    academicSection.style.display = 'none';
                }
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            });
        });

        [closeModal, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function() {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                });
            }
        });

        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
});

// FAQ Functionality
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', function() {
                const isActive = item.classList.contains('active');
                
                // Close all FAQ items
                faqItems.forEach(faq => faq.classList.remove('active'));
                
                // Open clicked item if it wasn't already active
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        }
    });
});

// Registration Form Handling
function handleRegistration(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        submitBtn.style.opacity = '0.7';
        
        try {
            // Collect form data
            const formData = new FormData(form);
            const registrationData = Object.fromEntries(formData.entries());
            
            // Handle multiple workshop selections
            const workshops = formData.getAll('workshops');
            registrationData.workshops = workshops;
            
            console.log('Submitting Registration Data:', registrationData);
            
            // Get Google Script URL from config
            const GOOGLE_SCRIPT_URL = typeof CONFIG !== 'undefined' ? CONFIG.STUDENT_SCRIPT_URL : 'YOUR_STUDENT_SCRIPT_URL_HERE';
            
            // Check if URL is configured
            if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_STUDENT_SCRIPT_URL_HERE') {
                console.error('Student Script URL not configured! Please update assets/js/config.js');
                throw new Error('Configuration required');
            }
            
            // Send data to Google Sheets
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for Google Apps Script
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData)
            });
            
            // Note: With 'no-cors' mode, we can't read the response
            // but if no error is thrown, the request was sent successfully
            
            console.log('Registration submitted successfully');
            
            // Show success message
            showSuccessMessage('Registration submitted successfully! We will contact you soon.');
            
            // Close modal
            const modal = document.getElementById('registrationModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            
            // Reset form
            form.reset();
            
        } catch (error) {
            console.error('Error submitting registration:', error);
            showErrorMessage('There was an error submitting your registration. Please try again or contact us directly.');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            submitBtn.style.opacity = '1';
        }
    });
}

// Partnership Form Handling
function handlePartnershipForm(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        submitBtn.style.opacity = '0.7';
        
        try {
            // Collect form data
            const formData = new FormData(form);
            const partnershipData = Object.fromEntries(formData.entries());
            
            console.log('Submitting Partnership Data:', partnershipData);
            
            // Get Google Script URL from config
            const GOOGLE_SCRIPT_URL = typeof CONFIG !== 'undefined' ? CONFIG.PARTNER_SCRIPT_URL : 'YOUR_PARTNER_SCRIPT_URL_HERE';
            
            // Check if URL is configured
            if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_PARTNER_SCRIPT_URL_HERE') {
                console.error('Partner Script URL not configured! Please update assets/js/config.js');
                throw new Error('Configuration required');
            }
            
            // Send data to Google Sheets
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for Google Apps Script
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(partnershipData)
            });
            
            // Note: With 'no-cors' mode, we can't read the response
            // but if no error is thrown, the request was sent successfully
            
            console.log('Form submitted successfully');
            
            // Show success message
            showSuccessMessage('Partnership request submitted successfully! We will contact you soon to discuss the details.');
            
            // Reset form
            form.reset();
            
        } catch (error) {
            console.error('Error submitting form:', error);
            showErrorMessage('There was an error submitting your request. Please try again or contact us directly.');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            submitBtn.style.opacity = '1';
        }
    });
}

// Success Message Display
function showSuccessMessage(message) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 2001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // Animate in
    setTimeout(() => {
        successDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            successDiv.remove();
        }, 300);
    }, 5000);
}

// Error Message Display
function showErrorMessage(message) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 2001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Animate in
    setTimeout(() => {
        errorDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            errorDiv.remove();
        }, 300);
    }, 5000);
}

// Initialize forms when page loads
document.addEventListener('DOMContentLoaded', function() {
    const registrationForm = document.getElementById('registrationForm');
    const partnershipForms = document.querySelectorAll('.partnership-form');
    
    if (registrationForm) {
        handleRegistration(registrationForm);
    }
    
    partnershipForms.forEach(handlePartnershipForm);
});

// REMOVED OLD COUNTER SYSTEM - using new StatsCounter class instead

// Preloader (optional)
window.addEventListener('load', function() {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
});

// Back to Top Button
function createBackToTopButton() {
    const button = document.createElement('button');
    button.innerHTML = '<i class="fas fa-chevron-up"></i>';
    button.className = 'back-to-top';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        z-index: 1000;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            button.style.display = 'flex';
        } else {
            button.style.display = 'none';
        }
    });
    
    document.body.appendChild(button);
}

// Schedule Item Hover Effects
document.addEventListener('DOMContentLoaded', function() {
    const scheduleItems = document.querySelectorAll('.schedule-item');
    
    scheduleItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });
});

// Workshop Card Animations
document.addEventListener('DOMContentLoaded', function() {
    const workshopCards = document.querySelectorAll('.workshop-card');
    
    workshopCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.addEventListener('mouseenter', function() {
            this.querySelector('.workshop-icon').style.transform = 'rotateY(180deg)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.querySelector('.workshop-icon').style.transform = 'rotateY(0)';
        });
    });
});

// Initialize back to top button
document.addEventListener('DOMContentLoaded', createBackToTopButton);

// Load schedule from JSON
async function loadSchedule() {
    try {
        // Try different possible paths depending on where the page is located
        const possiblePaths = ['./data/schedule.json', '../data/schedule.json', '/data/schedule.json'];
        let data = null;
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    data = await response.json();
                    break;
                }
            } catch (err) {
                // Continue to next path
                continue;
            }
        }
        
        if (data && data.schedule) {
            displaySchedule(data.schedule);
        } else {
            console.warn('No schedule data found, using fallback');
            displayFallbackSchedule();
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
        displayFallbackSchedule();
    }
}

function displaySchedule(scheduleItems) {
    const container = document.querySelector('.schedule-list');
    if (!container) {
        console.warn('Schedule container (.schedule-list) not found');
        return;
    }
    
    const html = scheduleItems.map((item, index) => `
        <div class="schedule-item ${item.featured ? 'featured' : ''} scroll-reveal delay-${Math.min(index + 1, 6)}">
            <div class="schedule-time">
            </div>
            <div class="schedule-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                
                ${item.speaker ? `
                    <div class="speaker-info">
                        <div class="speaker-details">
                            <i class="fas fa-user-tie"></i>
                            <div class="speaker-text">
                                <strong>${item.speaker.name}</strong>
                                <span>${item.speaker.title}</span>
                                <small>${item.speaker.company}</small>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${item.tags && item.tags.length > 0 || item.time || item.location ? `
                    <div class="schedule-tags">
                        ${item.time ? `<span class="schedule-tag tag-time">${item.time}</span>` : ''}
                        ${item.location ? `<span class="schedule-tag tag-place">${item.location}</span>` : ''}
                        ${item.tags ? item.tags.map(tag => `
                            <span class="schedule-tag tag-${tag}">${tag}</span>
                        `).join('') : ''}
                    </div>
                ` : ''}
                
                ${item.details ? `
                    <div class="schedule-details">
                        ${item.details.map(detail => `
                            <span class="detail-item">
                                <i class="fas ${detail.icon || 'fa-info-circle'}"></i> 
                                ${detail.text}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Re-initialize scroll animations for the newly loaded content
    setTimeout(() => {
        animateOnScroll();
    }, 100);
    
    console.log('Schedule loaded successfully');
}

function displayFallbackSchedule() {
    const container = document.querySelector('.schedule-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="schedule-item scroll-reveal delay-1">
            <div class="schedule-time">
                <span class="time">09:00</span>
            </div>
            <div class="schedule-content">
                <h3>Opening Ceremony</h3>
                <p>Welcome address and event overview</p>
            </div>
        </div>
        <div class="schedule-item scroll-reveal delay-2">
            <div class="schedule-time">
                <span class="time">10:15</span>
            </div>
            <div class="schedule-content">
                <h3>Technical Workshops</h3>
                <p>Hands-on sessions on latest technologies</p>
            </div>
        </div>
        <div class="schedule-item scroll-reveal delay-3">
            <div class="schedule-time">
                <span class="time">13:45</span>
            </div>
            <div class="schedule-content">
                <h3>Company Booths</h3>
                <p>Explore opportunities and network</p>
            </div>
        </div>
        <div class="schedule-item scroll-reveal delay-4">
            <div class="schedule-time">
                <span class="time">15:45</span>
            </div>
            <div class="schedule-content">
                <h3>Partner Workshops</h3>
                <p>Special sessions by industry partners</p>
            </div>
        </div>
    `;
    
    // Re-initialize scroll animations for the newly loaded content
    setTimeout(() => {
        animateOnScroll();
    }, 100);
    
    console.log('Fallback schedule loaded');
}

// Load schedule when page loads
document.addEventListener('DOMContentLoaded', loadSchedule);
document.addEventListener('DOMContentLoaded', loadSchedule);
// Load former partners from JSON
async function loadFormerPartners() {
    try {
        console.log('Loading former partners...');
        
        // Try different possible paths depending on where the page is located
        const possiblePaths = ['./data/partners.json', '../data/partners.json', '/data/partners.json'];
        let data = null;
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    data = await response.json();
                    console.log('Partners data loaded from:', path, data);
                    break;
                }
            } catch (err) {
                console.log('Failed to load from path:', path);
                continue;
            }
        }
        
        if (data && data.formerPartners && Array.isArray(data.formerPartners)) {
            displayFormerPartners(data.formerPartners);
        } else {
            console.warn('No partners data found, using fallback');
            displayPartnersFallback();
        }
    } catch (error) {
        console.error('Error loading former partners:', error);
        displayPartnersFallback();
    }
}

function addPartnerHoverEffects() {
    const partnerLogos = document.querySelectorAll('.partner-logo');
    
    partnerLogos.forEach(logo => {
        logo.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        logo.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}


// Load partners when page loads (only on sponsors page)
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the sponsors/partners page
    if (window.location.pathname.includes('sponsors.html') || 
        document.querySelector('.former-partners')) {
        loadFormerPartners();
    }
});

function displayFormerPartners(partners) {
    const container = document.querySelector('.partners-grid');
    if (!container) {
        console.warn('Partners grid container not found');
        return;
    }
    
    const html = partners.map((partner, index) => `
        <div class="partner-logo scroll-reveal delay-${Math.min(index + 1, 6)}" data-category="${partner.category}" data-year="${partner.year}">
            <img src="${partner.logo}" alt="${partner.name}" title="${partner.name} - ${partner.category}">
            <div class="partner-info">
                <h4>${partner.name}</h4>
                
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Add hover effects
    addPartnerHoverEffects();
    
    // Re-initialize scroll animations for the newly loaded content
    setTimeout(() => {
        animateOnScroll();
    }, 100);
}

function addPartnerHoverEffects() {
    const partnerLogos = document.querySelectorAll('.partner-logo');
    
    partnerLogos.forEach(logo => {
        logo.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        logo.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

function displayPartnersFallback() {
    const container = document.querySelector('.partners-grid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="partner-logo scroll-reveal delay-1">
            <div class="partner-placeholder">
                <i class="fas fa-building"></i>
                <p>Partner logos will be displayed here</p>
            </div>
        </div>
        <div class="partner-logo scroll-reveal delay-2">
            <div class="partner-placeholder">
                <i class="fas fa-handshake"></i>
                <p>Become a partner today</p>
            </div>
        </div>
    `;
    
    // Re-initialize scroll animations for the newly loaded content
    setTimeout(() => {
        animateOnScroll();
    }, 100);
}

// Load partners when page loads (only on sponsors page)
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the sponsors/partners page
    if (window.location.pathname.includes('sponsors.html') || 
        document.querySelector('.former-partners')) {
        loadFormerPartners();
    }
    
    // Check if we're on the program page
    if (window.location.pathname.includes('program.html') || 
        document.querySelector('.workshops-grid')) {
        loadWorkshops();
    }
});

// Load workshops from JSON
async function loadWorkshops() {
    try {
        console.log('Loading workshops...');
        
        // Try different possible paths depending on where the page is located
        const possiblePaths = ['./data/workshops.json', '../data/workshops.json', '/data/workshops.json'];
        let data = null;
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    data = await response.json();
                    console.log('Workshops data loaded from:', path, data);
                    break;
                }
            } catch (err) {
                console.log('Failed to load from path:', path);
                continue;
            }
        }
        
        if (data && data.workshops && Array.isArray(data.workshops)) {
            displayWorkshops(data.workshops);
        } else {
            console.warn('No workshops data found, using fallback');
            displayWorkshopsFallback();
        }
    } catch (error) {
        console.error('Error loading workshops:', error);
        displayWorkshopsFallback();
    }
}

function displayWorkshops(workshops) {
    const container = document.querySelector('.workshops-grid');
    if (!container) {
        console.warn('Workshops grid container not found');
        return;
    }
    
    const html = workshops.map((workshop, index) => `
        <div class="workshop-card scroll-reveal delay-${Math.min(index + 1, 6)}">
            <div class="workshop-icon">
                <i class="${workshop.icon}"></i>
            </div>
            <h3>${workshop.title}</h3>
            <p class="workshop-time">${workshop.time}</p>
            <p>${workshop.description}</p>
            <div class="workshop-info">
                ${workshop.features.map(feature => `
                    <span><i class="${feature.icon}"></i> ${feature.text}</span>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Re-initialize scroll animations for the newly loaded content
    setTimeout(() => {
        animateOnScroll();
    }, 100);
    
    console.log('Workshops loaded successfully');
}

function displayWorkshopsFallback() {
    const container = document.querySelector('.workshops-grid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="workshop-card scroll-reveal delay-1">
            <div class="workshop-icon">
                <i class="fas fa-brain"></i>
            </div>
            <h3>AI & Machine Learning</h3>
            <p class="workshop-time">10:15 - 11:45 AM</p>
            <p>Explore the fundamentals of artificial intelligence and machine learning.</p>
            <div class="workshop-info">
                <span><i class="fas fa-user"></i> Expert Instructors</span>
                <span><i class="fas fa-laptop"></i> Hands-on Coding</span>
                <span><i class="fas fa-certificate"></i> Certificates</span>
            </div>
        </div>
        <div class="workshop-card scroll-reveal delay-2">
            <div class="workshop-icon">
                <i class="fas fa-mobile-alt"></i>
            </div>
            <h3>Mobile Development</h3>
            <p class="workshop-time">10:15 - 11:45 AM</p>
            <p>Learn modern mobile app development using React Native and Flutter.</p>
            <div class="workshop-info">
                <span><i class="fas fa-code"></i> Live Coding</span>
                <span><i class="fas fa-mobile"></i> Cross-platform</span>
                <span><i class="fas fa-rocket"></i> Deploy Apps</span>
            </div>
        </div>
    `;
    
    // Re-initialize scroll animations for the newly loaded content
    setTimeout(() => {
        animateOnScroll();
    }, 100);
    
    console.log('Fallback workshops loaded');
}

// New Stats Counter System with Enhanced Protection
class StatsCounter {
    constructor() {
        this.hasAnimated = false;
        this.isAnimating = false;
        this.animationFrames = [];
        this.statElements = [];
        this.counterWorkedOnce = false; // New boolean flag for first-time protection
        this.init();
    }

    init() {
        // Check if counter has already worked once
        if (this.counterWorkedOnce) {
            console.log('Stats counter already executed once, skipping...');
            return;
        }

        // Wait for DOM to be ready, then start animation immediately
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startAnimation());
        } else {
            this.startAnimation();
        }
    }

    startAnimation() {
        // Triple protection: check all conditions
        if (this.counterWorkedOnce || this.hasAnimated || this.isAnimating) {
            console.log('Stats counter blocked by protection flags');
            return;
        }

        const statsSection = document.querySelector('.stats');
        if (!statsSection) return;

        // Set the first-time flag immediately
        this.counterWorkedOnce = true;

        // Store stat elements for protection
        this.statElements = Array.from(document.querySelectorAll('.stat-item'));
        
        // Mark each stat element to prevent other systems from interfering
        this.statElements.forEach(element => {
            element.setAttribute('data-stats-controlled', 'true');
            element.setAttribute('data-counter-executed', 'true'); // Additional marker
            // Ensure they're visible and positioned correctly
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });

        // Start animation immediately when page loads
        this.animateStats();
    }

    animateStats() {
        // Check all protection flags
        if (this.counterWorkedOnce && this.hasAnimated) {
            console.log('Animation blocked: already completed');
            return;
        }
        
        if (this.hasAnimated || this.isAnimating) return;
        
        this.hasAnimated = true;
        this.isAnimating = true;
        
        console.log('Starting stats animation for the first and only time');
        
        const statItems = document.querySelectorAll('.stat-item');
        
        // Define the stats data
        const statsData = [
            { target: 350, suffix: '+', duration: 2000 },
            { target: 20, suffix: '+', duration: 1500 },
            { target: 5, suffix: '+', duration: 1000 },
            { target: 14, suffix: 'th', duration: 1200 }
        ];

        let completedAnimations = 0;
        const totalAnimations = statItems.length;

        statItems.forEach((item, index) => {
            const numberElement = item.querySelector('.stat-number');
            const data = statsData[index];
            
            if (!numberElement || !data) return;

            // Start animation with slight delay for staggered effect
            setTimeout(() => {
                this.animateNumber(numberElement, data.target, data.suffix, data.duration, () => {
                    completedAnimations++;
                    if (completedAnimations === totalAnimations) {
                        this.isAnimating = false;
                        // Lock the final values to prevent any changes
                        this.lockFinalValues();
                        console.log('Stats counter animation completed and permanently locked');
                    }
                });
            }, index * 200);
        });
    }

    animateNumber(element, target, suffix, duration, onComplete) {
        const startTime = Date.now();
        const startValue = 0;
        let animationId;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (target - startValue) * easeOutCubic);
            
            // Update display
            if (progress < 1 && this.isAnimating) {
                element.textContent = currentValue;
                animationId = requestAnimationFrame(animate);
                this.animationFrames.push(animationId);
            } else {
                // Animation complete - show final value with suffix
                element.textContent = target + suffix;
                element.setAttribute('data-final-value', target + suffix);
                // Remove this frame from tracking
                const frameIndex = this.animationFrames.indexOf(animationId);
                if (frameIndex > -1) {
                    this.animationFrames.splice(frameIndex, 1);
                }
                if (onComplete) onComplete();
            }
        };
        
        animationId = requestAnimationFrame(animate);
        this.animationFrames.push(animationId);
    }

    lockFinalValues() {
        // Ensure final values are locked and can't be changed
        this.statElements.forEach(element => {
            const numberElement = element.querySelector('.stat-number');
            if (numberElement) {
                const finalValue = numberElement.getAttribute('data-final-value');
                if (finalValue) {
                    // Create a locked text node
                    const lockedText = document.createTextNode(finalValue);
                    numberElement.innerHTML = '';
                    numberElement.appendChild(lockedText);
                    
                    // Prevent any style changes
                    numberElement.style.pointerEvents = 'none';
                    element.style.pointerEvents = 'none';
                }
            }
        });
    }

    // Method to cancel all ongoing animations if needed
    cancelAnimations() {
        this.animationFrames.forEach(frameId => {
            cancelAnimationFrame(frameId);
        });
        this.animationFrames = [];
        this.isAnimating = false;
    }
}

// Initialize the stats counter
const statsCounter = new StatsCounter();

// Additional protection: Override any attempts to modify stat numbers
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the stats counter to initialize
    setTimeout(() => {
        const statItems = document.querySelectorAll('.stat-item[data-stats-controlled="true"]');
        
        // Create a MutationObserver to protect against external changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('stat-number')) {
                        const finalValue = target.getAttribute('data-final-value');
                        if (finalValue && target.textContent !== finalValue) {
                            // Restore the correct value if it was changed
                            target.textContent = finalValue;
                        }
                    }
                }
            });
        });
        
        // Observe each stat item for changes
        statItems.forEach(item => {
            observer.observe(item, {
                childList: true,
                subtree: true,
                characterData: true
            });
        });
    }, 3000); // Wait 3 seconds for animation to complete
});

// Load Event Highlights from JSON
async function loadHighlights() {
    try {
        console.log('Loading event highlights...');
        
        // Try different possible paths depending on where the page is located
        const possiblePaths = ['./data/highlights.json', '../data/highlights.json', '/data/highlights.json'];
        let data = null;
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    data = await response.json();
                    console.log('Highlights data loaded from:', path, data);
                    break;
                }
            } catch (err) {
                console.log('Failed to load highlights from path:', path);
                continue;
            }
        }
        
        if (data && data.highlights && Array.isArray(data.highlights)) {
            displayHighlights(data.highlights);
        } else {
            console.warn('No highlights data found, using fallback');
            displayHighlightsFallback();
        }
    } catch (error) {
        console.error('Error loading event highlights:', error);
        displayHighlightsFallback();
    }
}

function displayHighlights(highlights) {
    const container = document.querySelector('.program-grid');
    if (!container) {
        console.warn('Program grid container (.program-grid) not found');
        return;
    }
    
    const html = highlights.map((highlight, index) => `
        <div class="program-item scroll-reveal delay-${Math.min(index + 1, 6)}">
            <div class="program-icon">
                <i class="${highlight.icon}"></i>
            </div>
            <div class="time">${highlight.time}</div>
            <h4>${highlight.title}</h4>
            <p>${highlight.description}</p>
            <span class="program-category">${highlight.category}</span>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Re-initialize scroll animations for the newly loaded content
    setTimeout(() => {
        animateOnScroll();
    }, 100);
    
    console.log(`${highlights.length} event highlights loaded successfully`);
}

function displayHighlightsFallback() {
    const container = document.querySelector('.program-grid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="program-item scroll-reveal delay-1">
            <div class="program-icon">
                <i class="fas fa-flag"></i>
            </div>
            <div class="time">9:00 - 9:45</div>
            <h4>Opening Ceremony</h4>
            <p>Welcome address and event overview</p>
        </div>
        <div class="program-item scroll-reveal delay-2">
            <div class="program-icon">
                <i class="fas fa-laptop-code"></i>
            </div>
            <div class="time">10:15 - 11:45</div>
            <h4>Technical Workshops</h4>
            <p>Hands-on sessions on latest technologies</p>
        </div>
        <div class="program-item scroll-reveal delay-3">
            <div class="program-icon">
                <i class="fas fa-building"></i>
            </div>
            <div class="time">13:45 - 15:15</div>
            <h4>Company Booths</h4>
            <p>Explore opportunities and network</p>
        </div>
        <div class="program-item scroll-reveal delay-4">
            <div class="program-icon">
                <i class="fas fa-handshake"></i>
            </div>
            <div class="time">15:45 - 16:30</div>
            <h4>Partner Workshops</h4>
            <p>Special sessions by industry partners</p>
        </div>
    `;
    
    // Re-initialize scroll animations for the newly loaded content
    setTimeout(() => {
        animateOnScroll();
    }, 100);
    
    console.log('Fallback event highlights loaded');
}

// Load highlights when page loads (only on index page or pages with program-highlights section)
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page that should display highlights
    const highlightsSection = document.querySelector('.program-highlights');
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.includes('index.html') || window.location.pathname === '/index.html';
    
    if (highlightsSection || isIndexPage) {
        console.log('Loading highlights on page:', window.location.pathname);
        loadHighlights();
    }
});