// Global App State
let timerInterval = null;

// DOM Elements
const lockScreen = document.getElementById('lock-screen');
const passwordInput = document.getElementById('password-input');
const errorMessage = document.getElementById('error-message');
const mainContent = document.getElementById('main-content');
const loginBtn = document.getElementById('login-btn');

// Frame styling rotating options
const frameStyles = [
    { class: 'frame-wood', crooked: 'crooked-left' },
    { class: 'frame-oak', crooked: 'crooked-right' },
    { class: 'frame-gold', crooked: 'crooked-slight-left' },
    { class: 'frame-wood', crooked: 'crooked-slight-right' },
    { class: 'frame-oak', crooked: 'crooked-left' },
    { class: 'frame-gold', crooked: 'crooked-right' }
];

// Event Listeners
passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        attemptUnlock();
    }
});

loginBtn.addEventListener('click', attemptUnlock);

// Unlock logic
function attemptUnlock() {
    const password = passwordInput.value;
    
    if (!password) {
        showError('Please enter a password.');
        return;
    }

    if (typeof ENCRYPTED_DATA === 'undefined') {
        showError('No encrypted data found. Please create data.js using the Encryptor tool.');
        return;
    }

    try {
        // Decrypt using CryptoJS
        const decryptedBytes = CryptoJS.AES.decrypt(ENCRYPTED_DATA, password);
        const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedText) {
            showError('Incorrect password! Please try again.');
            return;
        }

        const data = JSON.parse(decryptedText);
        
        // Success
        hideError();
        unlockApp(data);
        
    } catch (error) {
        console.error(error);
        showError('Incorrect password or corrupted data.');
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.add('visible');
    passwordInput.style.borderColor = '#C0392B';
    passwordInput.focus();
}

function hideError() {
    errorMessage.classList.remove('visible');
    passwordInput.style.borderColor = '#D1DBD6';
}

function unlockApp(data) {
    lockScreen.classList.add('hidden');
    mainContent.classList.add('visible');
    
    // Render the photos
    renderGallery(data.images);
    
    // Start countdown
    startTimer(data.startDate, data.endDate);
}

// Name-based placement engine for the 5 pictures
function distributeImages(imagesList) {
    const placements = {
        left: null, // Bild1
        right: null, // Bild2
        bottom: [] // Bild3, Bild4, Bild5
    };
    
    const unplaced = [];
    
    imagesList.forEach(img => {
        let name = '';
        let data = '';
        if (typeof img === 'object' && img !== null) {
            name = (img.name || '').toLowerCase();
            data = img.data || '';
        } else {
            data = img;
        }

        // Match based on filename containing specific numbers
        // E.g., Bild1.jpg -> left, Bild2.png -> right, Bild3 -> bottom[0], etc.
        if (name.includes('bild1') || (name.includes('1') && !name.includes('10') && !name.includes('11') && !name.includes('12'))) {
            placements.left = { data, name };
        } else if (name.includes('bild2') || name.includes('2')) {
            placements.right = { data, name };
        } else if (name.includes('bild3') || name.includes('3')) {
            placements.bottom[0] = { data, name };
        } else if (name.includes('bild4') || name.includes('4')) {
            placements.bottom[1] = { data, name };
        } else if (name.includes('bild5') || name.includes('5')) {
            placements.bottom[2] = { data, name };
        } else {
            unplaced.push({ data, name });
        }
    });

    // Fallback placement (sequential if filenames lack matching tags)
    if (!placements.left && unplaced.length > 0) placements.left = unplaced.shift();
    if (!placements.right && unplaced.length > 0) placements.right = unplaced.shift();
    
    for (let i = 0; i < 3; i++) {
        if (!placements.bottom[i] && unplaced.length > 0) {
            placements.bottom[i] = unplaced.shift();
        }
    }

    return placements;
}

// Renders picture frames in their corresponding slots
function renderGallery(images) {
    const leftFrameContainer = document.getElementById('left-frame-container');
    const rightFrameContainer = document.getElementById('right-frame-container');
    const galleryWall = document.getElementById('gallery-wall');
    
    leftFrameContainer.innerHTML = '';
    rightFrameContainer.innerHTML = '';
    galleryWall.innerHTML = '';
    
    if (!images || images.length === 0) {
        const noImagesMsg = document.createElement('p');
        noImagesMsg.textContent = 'No photos uploaded yet. Use the Encryptor tool to add images.';
        noImagesMsg.style.gridColumn = '1 / -1';
        noImagesMsg.style.textAlign = 'center';
        noImagesMsg.style.color = 'var(--sage-primary)';
        galleryWall.appendChild(noImagesMsg);
        return;
    }

    const placements = distributeImages(images);

    // Frame DOM builder helper
    function createFrameElement(imgObj, index) {
        if (!imgObj) return null;
        
        const design = frameStyles[index % frameStyles.length];
        
        const frameDiv = document.createElement('div');
        frameDiv.className = `picture-frame ${design.class} ${design.crooked}`;
        frameDiv.style.opacity = '0';
        frameDiv.style.transform = 'translateY(30px)';
        frameDiv.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
        
        const passepartoutDiv = document.createElement('div');
        passepartoutDiv.className = 'passepartout';
        
        const img = document.createElement('img');
        img.alt = imgObj.name || `Memory Photo`;
        img.loading = 'lazy';
        
        img.onload = function() {
            const naturalWidth = img.naturalWidth || img.width;
            const naturalHeight = img.naturalHeight || img.height;
            if (naturalWidth && naturalHeight) {
                const ratio = naturalWidth / naturalHeight;
                let width = 290;
                let height = 280;
                
                if (ratio >= 1.03) { // Landscape
                    width = 290;
                    height = 290 / ratio;
                    if (height > 280) {
                        height = 280;
                        width = 280 * ratio;
                    }
                } else { // Portrait or square
                    height = 280;
                    width = 280 * ratio;
                    if (width > 290) {
                        width = 290;
                        height = 290 / ratio;
                    }
                }
                
                img.style.width = Math.round(width) + 'px';
                img.style.height = Math.round(height) + 'px';
            }
        };
        
        img.src = imgObj.data; // Set src AFTER attaching onload to handle caching correctly
        
        passepartoutDiv.appendChild(img);
        frameDiv.appendChild(passepartoutDiv);
        
        // Staggered fade in
        setTimeout(() => {
            frameDiv.style.opacity = '1';
            frameDiv.style.transform = frameDiv.className.includes('crooked-left') ? 'rotate(-3deg) translateY(5px)' :
                                       frameDiv.className.includes('crooked-right') ? 'rotate(3.5deg) translateY(-5px)' :
                                       frameDiv.className.includes('crooked-slight-left') ? 'rotate(-1.5deg) translateY(-2px)' :
                                       'rotate(1.8deg) translateY(4px)';
        }, 150 + index * 100);

        return frameDiv;
    }

    // Inject Left Frame (Bild1)
    if (placements.left) {
        const frame = createFrameElement(placements.left, 0);
        if (frame) leftFrameContainer.appendChild(frame);
    }

    // Inject Right Frame (Bild2)
    if (placements.right) {
        const frame = createFrameElement(placements.right, 1);
        if (frame) rightFrameContainer.appendChild(frame);
    }

    // Inject Bottom Row Frames (Bild3, Bild4, Bild5)
    placements.bottom.forEach((imgObj, i) => {
        if (imgObj) {
            const frame = createFrameElement(imgObj, i + 2); // Start style index offset to keep designs rotating
            if (frame) galleryWall.appendChild(frame);
        }
    });
}

// Convert "YYYY-MM-DDTHH:mm" to precise Berlin Time (Europe/Berlin) timestamp
function parseBerlinDate(dateStr) {
    if (!dateStr) return 0;
    
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    const testDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Berlin',
        hour12: false,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric'
    });
    
    const parts = formatter.formatToParts(testDate);
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    
    const berlinUTC = Date.UTC(
        parseInt(p.year),
        parseInt(p.month) - 1,
        parseInt(p.day),
        parseInt(p.hour),
        parseInt(p.minute),
        parseInt(p.second)
    );
    
    const diff = berlinUTC - testDate.getTime();
    const desiredUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
    return desiredUTC - diff;
}

// Countdown timer loop
function startTimer(startDateStr, endDateStr) {
    if (timerInterval) clearInterval(timerInterval);
    
    const startMs = parseBerlinDate(startDateStr);
    const endMs = parseBerlinDate(endDateStr);
    const totalDuration = endMs - startMs;

    const daysVal = document.getElementById('days-val');
    const hoursVal = document.getElementById('hours-val');
    const minutesVal = document.getElementById('minutes-val');
    const secondsVal = document.getElementById('seconds-val');
    
    const waveGroup = document.getElementById('wave-group');
    const percentText = document.getElementById('percent-text');

    function update() {
        const nowMs = Date.now();
        
        let remaining = endMs - nowMs;
        let elapsed = nowMs - startMs;
        
        if (remaining <= 0) {
            remaining = 0;
            elapsed = totalDuration;
            if (timerInterval) clearInterval(timerInterval);
        }

        // Calculate progress percentage
        let progress = 0;
        if (totalDuration > 0) {
            progress = elapsed / totalDuration;
            if (progress < 0) progress = 0;
            if (progress > 1) progress = 1;
        } else {
            progress = remaining <= 0 ? 1 : 0;
        }
        
        const progressPercent = Math.floor(progress * 100);
        
        // Shift waves (Y translation: 100 empty to 0 full)
        const translateY = 100 - progressPercent;
        waveGroup.setAttribute('transform', `translate(0, ${translateY})`);
        percentText.textContent = `${progressPercent}%`;

        // Calculate countdown values
        const diffSecs = Math.floor(remaining / 1000);
        const days = Math.floor(diffSecs / (3600 * 24));
        const hours = Math.floor((diffSecs % (3600 * 24)) / 3600);
        const minutes = Math.floor((diffSecs % 3600) / 60);
        const seconds = diffSecs % 60;

        daysVal.textContent = String(days).padStart(2, '0');
        hoursVal.textContent = String(hours).padStart(2, '0');
        minutesVal.textContent = String(minutes).padStart(2, '0');
        secondsVal.textContent = String(seconds).padStart(2, '0');
    }

    update();
    timerInterval = setInterval(update, 1000);
}

// Lightbox Zoom Logic
const lightboxBackdrop = document.getElementById('lightbox-backdrop');

document.addEventListener('click', function(e) {
    // Check if clicked element is inside a picture frame
    const frame = e.target.closest('.picture-frame');
    
    // Only open lightbox if it's a normal frame (not already zoomed in the lightbox)
    if (frame && !frame.classList.contains('in-lightbox')) {
        openLightbox(frame);
    }
});

lightboxBackdrop.addEventListener('click', closeLightbox);

function openLightbox(frame) {
    // Clear backdrop
    lightboxBackdrop.innerHTML = '';
    
    // Clone the frame and adjust classes
    const clone = frame.cloneNode(true);
    clone.classList.add('in-lightbox');
    
    // Remove any crooked rotation classes from the clone so it hangs straight
    clone.classList.remove('crooked-left', 'crooked-right', 'crooked-slight-left', 'crooked-slight-right');
    
    lightboxBackdrop.appendChild(clone);
    lightboxBackdrop.classList.add('visible');
    
    // Disable body scrolling while zoomed in
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightboxBackdrop.classList.remove('visible');
    document.body.style.overflow = '';
    
    // Clean up content after transition fades out
    setTimeout(() => {
        if (!lightboxBackdrop.classList.contains('visible')) {
            lightboxBackdrop.innerHTML = '';
        }
    }, 400); // matches the 0.4s transition duration
}
