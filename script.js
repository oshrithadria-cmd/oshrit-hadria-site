// ===== 3D Carousel =====
const cards = document.querySelectorAll('.card');
const dots = document.querySelectorAll('.dot');
const totalCards = cards.length;
let currentIndex = 0;
let isAnimating = false;

function getPosition(cardIndex, activeIndex) {
    const diff = cardIndex - activeIndex;
    const wrappedDiff = ((diff + totalCards + Math.floor(totalCards / 2)) % totalCards) - Math.floor(totalCards / 2);

    switch (wrappedDiff) {
        case 0: return 'active';
        case -1: return 'prev';
        case 1: return 'next';
        case -2: return 'far-prev';
        case 2: return 'far-next';
        default: return 'hidden-card';
    }
}

function updateCarousel() {
    cards.forEach((card, i) => {
        card.classList.remove('active', 'prev', 'next', 'far-prev', 'far-next', 'hidden-card');
        const position = getPosition(i, currentIndex);
        card.classList.add(position);
    });

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
    });

    playActiveVideo();
}

function goToSlide(index) {
    if (isAnimating || index === currentIndex) return;
    isAnimating = true;
    stopAllVideos();
    currentIndex = ((index % totalCards) + totalCards) % totalCards;
    updateCarousel();
    setTimeout(() => { isAnimating = false; }, 600);
}

// Click on any card to navigate to it (only non-active cards rotate the carousel)
cards.forEach((card, i) => {
    card.addEventListener('click', (e) => {
        if (!card.classList.contains('active')) {
            e.preventDefault();
            goToSlide(i);
        }
    });
});

dots.forEach(dot => {
    dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.slide));
    });
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goToSlide(currentIndex + 1);
    if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
});

// Touch/swipe support
let touchStartX = 0;
const carousel = document.querySelector('.carousel-wrapper');

carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
}, { passive: true });

carousel.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
        if (diff > 0) goToSlide(currentIndex + 1);
        else goToSlide(currentIndex - 1);
    }
});

// ===== Video Management =====
const videoCards = document.querySelectorAll('.card-video');

// Setup video duration limits
videoCards.forEach(videoCard => {
    const video = videoCard.querySelector('.card-bg-video');
    const startTime = parseFloat(videoCard.dataset.startTime) || 0;
    const duration = parseFloat(videoCard.dataset.duration) || 0;

    video.currentTime = startTime;

    if (duration > 0) {
        video.addEventListener('timeupdate', () => {
            if (video.currentTime >= startTime + duration) {
                video.currentTime = startTime;
            }
        });
    }
});

function stopAllVideos() {
    videoCards.forEach(videoCard => {
        const video = videoCard.querySelector('.card-bg-video');
        const startTime = parseFloat(videoCard.dataset.startTime) || 0;
        video.pause();
        video.currentTime = startTime;
    });
}

function playActiveVideo() {
    const activeCard = document.querySelector('.card.active.card-video');
    if (!activeCard) return;

    const video = activeCard.querySelector('.card-bg-video');
    const startTime = parseFloat(activeCard.dataset.startTime) || 0;
    const playbackSpeed = parseFloat(activeCard.dataset.speed) || 1;

    video.currentTime = startTime;
    video.playbackRate = playbackSpeed;
    video.play().catch(() => {});
}

// Initialize carousel and auto-play first active video
updateCarousel();

// ===== Hero Video - pause when scrolled away =====
const heroVideo = document.querySelector('.hero-video');
const heroContainer = document.querySelector('.hero-video-container');

const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            heroVideo.play().catch(() => {});
        } else {
            heroVideo.pause();
        }
    });
}, { threshold: 0.3 });

heroObserver.observe(heroContainer);
