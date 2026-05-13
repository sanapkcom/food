// =============================================
//  EATSPOT – script.js  (Full Feature Upgrade)
// =============================================

let allPlaces = [];
let userLat = null;
let userLng = null;
let currentReportSpotId = null;
let editingSpotId = null;

// ─── Smooth scroll ────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// ─── Hamburger ───────────────────────────────
const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinksList = document.getElementById('nav-links');
hamburgerBtn?.addEventListener('click', () => navLinksList?.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(link =>
    link.addEventListener('click', () => navLinksList?.classList.remove('open'))
);

// ─── Haversine distance ───────────────────────
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Auto-get user location on page load ─────
function requestUserLocation() {
    const locText = document.getElementById('location-text');
    if (locText) locText.textContent = 'Locating…';
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;
                reverseGeocode(userLat, userLng);
                // Re-render cards with real distances
                displayPlaces(allPlaces);
            },
            () => {
                if (locText) locText.textContent = 'Kerala';
            }
        );
    } else {
        if (locText) locText.textContent = 'Kerala';
    }
}

async function reverseGeocode(lat, lng) {
    const locText = document.getElementById('location-text');
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        const area = data.address?.suburb || data.address?.city_district || data.address?.town || data.address?.city || 'Your Location';
        const city = data.address?.city || data.address?.state || '';
        if (locText) locText.textContent = city ? `${area}, ${city}` : area;
    } catch {
        if (locText) locText.textContent = 'Kerala';
    }
}

// ─── Location picker (Add Place form) ────────
function pickMyLocation() {
    const btn = document.getElementById('pick-location-btn');
    const display = document.getElementById('picked-location-display');
    btn.textContent = '⏳ Getting location…';
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
        pos => {
            document.getElementById('spot-lat').value = pos.coords.latitude;
            document.getElementById('spot-lng').value = pos.coords.longitude;
            display.textContent = `✅ ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
            btn.textContent = '✅ Location Captured';
            btn.disabled = false;
        },
        () => {
            btn.textContent = '📍 Use My Current Location';
            btn.disabled = false;
            alert('Could not get location. Please allow location access.');
        }
    );
}

let nominatimTimeout = null;

function initLocationSearch() {
    const input = document.getElementById('location-search');
    const list = document.getElementById('location-suggestions');
    if (!input || !list) return;

    input.addEventListener('input', () => {
        clearTimeout(nominatimTimeout);
        const query = input.value.trim();
        if (query.length < 3) { list.innerHTML = ''; list.style.display = 'none'; return; }

        nominatimTimeout = setTimeout(async () => {
            try {
                const res = await fetch(
                    'https://nominatim.openstreetmap.org/search?format=json&q=' 
                    + encodeURIComponent(query) 
                    + '&limit=6&countrycodes=in&addressdetails=1',
                    { headers: { 'Accept-Language': 'en' } }
                );
                const results = await res.json();

                if (!results.length) {
                    list.innerHTML = '<li class="suggestion-item no-result">No results found</li>';
                    list.style.display = 'block';
                    return;
                }

                list.innerHTML = results.map(r => {
                    const parts = r.display_name.split(',');
                    const shortName = parts.slice(0, 3).join(',').trim();
                    return '<li class="suggestion-item" ' +
                    'data-lat="' + r.lat + '" ' +
                    'data-lng="' + r.lon + '" ' +
                    'data-name="' + shortName + '">' +
                    shortName +
                    '</li>';
                }).join('');
                list.style.display = 'block';

                list.querySelectorAll('.suggestion-item[data-lat]').forEach(item => {
                    item.addEventListener('click', () => {
                        const lat = item.dataset.lat;
                        const lng = item.dataset.lng;
                        const name = item.dataset.name;

                        document.getElementById('spot-lat').value = lat;
                        document.getElementById('spot-lng').value = lng;
                        input.value = name;

                        if (!document.getElementById('location').value.trim()) {
                            document.getElementById('location').value = name;
                        }

                        document.getElementById('picked-location-display')
                            .textContent = 'Location pinned successfully';
                        document.getElementById('picked-location-display')
                            .style.color = '#4a5c2f';

                        list.innerHTML = '';
                        list.style.display = 'none';
                    });
                });
            } catch {
                list.innerHTML = '<li class="suggestion-item no-result">Search failed. Try again.</li>';
                list.style.display = 'block';
            }
        }, 400);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.location-search-wrapper')) {
            list.style.display = 'none';
        }
    });
}

// ─── Image preview ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const imgInput = document.getElementById('spot-image');
    if (imgInput) {
        imgInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                document.getElementById('image-preview').src = ev.target.result;
                document.getElementById('image-preview-container').style.display = 'flex';
            };
            reader.readAsDataURL(file);
        });
    }
    initLocationSearch();
    requestUserLocation();
    loadPlaces();
});

function removeImage() {
    document.getElementById('spot-image').value = '';
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('image-preview').src = '';
}

// ─── Upload image to Supabase Storage ─────────
async function uploadSpotImage(file, spotName) {
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}_${spotName.replace(/\s+/g, '_')}.${ext}`;
    const { data, error } = await db.storage
        .from('spot-images')
        .upload(filename, file, { cacheControl: '3600', upsert: false });
    if (error) { console.error('Image upload error:', error); return null; }
    const { data: urlData } = db.storage.from('spot-images').getPublicUrl(filename);
    return urlData.publicUrl;
}

// ─── Stars renderer ───────────────────────────
function renderStars(rating, interactive = false, spotId = null) {
    if (interactive) {
        return [1, 2, 3, 4, 5].map(i =>
            `<span class="star interactive-star" data-val="${i}" onclick="submitRating('${spotId}',${i})" style="cursor:pointer; font-size:1.4rem;">${i <= Math.round(rating || 0) ? '★' : '☆'}</span>`
        ).join('');
    }
    return [1, 2, 3, 4, 5].map(i => `<span class="star">${i <= Math.round(rating || 0) ? '★' : '☆'}</span>`).join('');
}

// ─── Open Now status ──────────────────────────
function getOpenStatus(openTime, closeTime) {
    if (!openTime || !closeTime) return null;
    const now = new Date();
    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    const nowMins  = now.getHours() * 60 + now.getMinutes();
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;

    // Handle overnight (e.g. 22:00 – 02:00)
    if (closeMins < openMins) {
        const isOpen = nowMins >= openMins || nowMins < closeMins;
        return isOpen
            ? { type: 'open', label: '🟢 Open Now' }
            : { type: 'closed', label: '🔴 Closed' };
    }
    const isOpen = nowMins >= openMins && nowMins < closeMins;
    // Closing soon — within 30 mins
    if (isOpen && closeMins - nowMins <= 30) {
        return { type: 'closing', label: '🟡 Closing Soon' };
    }
    return isOpen
        ? { type: 'open', label: '🟢 Open Now' }
        : { type: 'closed', label: '🔴 Closed' };
}

// ─── Place card ───────────────────────────────
async function createPlaceCard(place, index, user) {
    const imageUrl = place.image_url 
        || place.image 
        || 'https://via.placeholder.com/300x200?text=' 
        + encodeURIComponent(place.name || 'Food Spot');

    let distVal = null;
    let distLabel = 'Distance unknown';
    if (userLat && userLng && place.lat && place.lng) {
        distVal = getDistance(userLat, userLng, place.lat, place.lng);
        distLabel = distVal !== null ? `${distVal.toFixed(1)} km away` : 'Distance unknown';
    } else if (place.distance && !isNaN(place.distance)) {
        distLabel = `${parseFloat(place.distance).toFixed(1)} km away`;
    }

    // Bookmarks
    const bookmarks = getBookmarks();
    const isBookmarked = bookmarks.includes(String(place.id));
    const bookmarkIcon = isBookmarked ? '🔖' : '🏷️';

    // Get avg rating
    const avgRating = place.avg_rating || 0;
    const ratingCount = place.rating_count || 0;

    // Check if current user owns this spot
    const isOwner = user && place.user_id === user.id;

    const ownerButtons = isOwner ? `
        <div class="owner-actions">
            <button class="btn-edit" onclick="editSpot('${place.id}'); event.stopPropagation();">✏️ Edit</button>
            <button class="btn-delete" onclick="deleteSpot('${place.id}'); event.stopPropagation();">🗑️ Delete</button>
        </div>` : '';

    const hoursHtml = place.open_time && place.close_time
        ? `<p class="place-hours">🕐 ${place.open_time} – ${place.close_time}</p>`
        : '';

    // Open Now badge
    const openStatus = getOpenStatus(place.open_time, place.close_time);

    return `
        <div class="place-card" style="animation-delay:${index * 0.1}s" onclick="openSpotDetail('${place.id}')">
            <div class="card-image-container">
                <img src="${imageUrl}" alt="${place.name}" class="place-image" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'">
                ${openStatus ? `<div class="open-status-badge open-status--${openStatus.type}">${openStatus.label}</div>` : ''}
                <button class="bookmark-btn" onclick="toggleBookmark('${place.id}'); event.stopPropagation();" title="Bookmark">${bookmarkIcon}</button>
            </div>
            <div class="place-info">
                <h4 class="place-name">${place.name}</h4>
                <p class="place-location">📍 ${place.location || 'Location not added'}</p>
                ${place.food_type ? '<span class="food-type-badge">' + place.food_type + '</span>' : ''}
                ${place.description ? '<p class="place-description">' + place.description + '</p>' : ''}
                ${place.foods_available ? '<p class="place-foods">Foods: ' + place.foods_available + '</p>' : ''}
                ${hoursHtml}
                <p class="place-price price-range-badge">₹${place.min_price} – ₹${place.max_price || 'N/A'}</p>
                <div class="rating-display">
                    <span class="stars-display">${renderStars(avgRating)}</span>
                    <span class="rating-text">${avgRating ? avgRating.toFixed(1) : 'No ratings'} ${ratingCount ? `(${ratingCount})` : ''}</span>
                </div>
                <div class="card-footer">
                    <span class="place-distance">📏 ${distLabel}</span>
                </div>
                ${ownerButtons}
                <div class="added-by">🙋 Added by: ${place.added_by || 'Anonymous'}</div>
            </div>
        </div>
    `;
}

// ─── Display places ───────────────────────────
async function displayPlaces(places, isFiltering = false) {
    const { data: { user } } = await db.auth.getUser();
    const sorted = [...places].sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
    const sections = {
        'meals-100': sorted.filter(p => p.section === 'meals-100'),
        'hidden-gems': sorted.filter(p => p.section === 'hidden-gems'),
        'student-offers': sorted.filter(p => p.section === 'student-offers'),
    };

    for (const sectionId of Object.keys(sections)) {
        const grid = document.getElementById(`${sectionId}-grid`);
        if (!grid) continue;
        if (sections[sectionId].length === 0) {
            grid.innerHTML = `<div class="empty-state"><p>🍽️ No spots here yet!</p><p>Be the first to add one.</p></div>`;
        } else {
            const cards = await Promise.all(sections[sectionId].map((p, i) => createPlaceCard(p, i, user)));
            grid.style.opacity = '0.4';
            grid.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
                grid.innerHTML = cards.join('');
                grid.style.opacity = '1';
            }, 150);
        }
    }

    Object.keys(sections).forEach(sectionId => {
        const heading = document.querySelector('#' + sectionId + ' h3');
        if (heading) {
            const count = sections[sectionId].length;
            const baseName = heading.textContent.replace(/\s*\(\d+\)/, '');
            heading.textContent = baseName + (count > 0 ? ' (' + count + ')' : '');
        }
    });

    const totalShown = Object.values(sections).reduce((sum, arr) => sum + arr.length, 0);
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        if (totalShown === 0) {
            resultsDiv.innerHTML = 
                '<div class="empty-search-state">' +
                '<p>No food spots found matching your search.</p>' +
                '<p>Try changing your filters or search term.</p>' +
                '</div>';
        } else {
            resultsDiv.innerHTML = '';
        }
    }
}

// ─── Load from Supabase ───────────────────────
async function loadPlaces() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
    const { data, error } = await db.from('food_spots').select('*');
    if (spinner) spinner.style.display = 'none';
    if (error) { console.error(error); return; }
    allPlaces = data;
    displayPlaces(allPlaces);
}

// ─── Open in Maps ─────────────────────────────
function openInMaps(id) {
    const place = allPlaces.find(p => String(p.id) === String(id));
    if (!place?.lat || !place?.lng) {
        alert('Location not available for this spot.');
        return;
    }
    const dest = place.lat + ',' + place.lng;
    if (userLat && userLng) {
        window.open(
            'https://www.google.com/maps/dir/' + 
            userLat + ',' + userLng + '/' + dest, 
            '_blank'
        );
    } else {
        window.open(
            'https://www.google.com/maps/search/?api=1&query=' + dest,
            '_blank'
        );
    }
}

// ─── Spot Detail Modal ────────────────────────
async function openSpotDetail(id) {
    const place = allPlaces.find(p => String(p.id) === String(id));
    if (!place) return;

    const modal = document.getElementById('spot-detail-modal');
    const content = document.getElementById('spot-detail-content');

    // Load reviews
    const { data: reviews } = await db.from('reviews')
        .select('*')
        .eq('spot_id', id)
        .order('created_at', { ascending: false });

    const { data: { user } } = await db.auth.getUser();

    let distLabel = 'Unknown';
    if (userLat && userLng && place.lat && place.lng) {
        const d = getDistance(userLat, userLng, place.lat, place.lng);
        distLabel = d !== null ? `${d.toFixed(2)} km` : 'Unknown';
    }

    const imageUrl = place.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80';
    const hoursHtml = place.open_time && place.close_time
        ? `<p class="detail-row">🕐 <strong>Hours:</strong> ${place.open_time} – ${place.close_time}</p>` : '';

    const reviewsHtml = reviews && reviews.length > 0
        ? reviews.map(r => `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-stars">${renderStars(r.rating)}</span>
                    <span class="review-author">${r.user_email || 'Anonymous'}</span>
                </div>
                <p class="review-text">${r.comment || ''}</p>
            </div>`).join('')
        : '<p style="color:#94a3b8;">No reviews yet. Be the first!</p>';

    const reviewFormHtml = user ? `
        <div class="add-review-box">
            <h4>Leave a Review</h4>
            <div class="star-picker" id="star-picker-${id}">
                ${[1,2,3,4,5].map(i => `<span class="star interactive-star" data-val="${i}" onclick="setReviewStar('${id}',${i})" style="font-size:1.8rem; cursor:pointer;">☆</span>`).join('')}
            </div>
            <input type="hidden" id="review-rating-${id}" value="0">
            <textarea id="review-comment-${id}" placeholder="Write your review…" class="review-textarea"></textarea>
            <button class="btn-primary" onclick="submitReview('${id}')" style="margin-top:0.5rem;">Post Review</button>
        </div>` : `<p style="color:#94a3b8; margin-top:1rem;"><a href="auth.html" style="color:#88976c;">Login</a> to leave a review.</p>`;

    content.innerHTML = `
        <img src="${imageUrl}" alt="${place.name}" class="detail-img" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80'">
        <div class="detail-body">
            <h2 class="detail-title">${place.name}</h2>
            <p class="detail-row">📍 <strong>Location:</strong> ${place.location || 'N/A'}</p>
            ${place.food_type ? '<span class="food-type-badge">' + place.food_type + '</span>' : ''}
            ${place.description ? '<p class="place-description">' + place.description + '</p>' : ''}
            ${place.foods_available ? '<p class="place-foods">Foods: ' + place.foods_available + '</p>' : ''}
            <p class="detail-row">💰 <strong>Price:</strong> ₹${place.min_price} – ₹${place.max_price || 'N/A'}</p>
            ${hoursHtml}
            <p class="detail-row">📏 <strong>Distance from you:</strong> ${distLabel}</p>
            <p class="detail-row">🙋 <strong>Added by:</strong> ${place.added_by || 'Anonymous'}</p>

            <div class="detail-actions">
                <button class="btn-primary" 
                    onclick="openInMaps('${id}')">
                    Open in Maps
                </button>
                <button class="btn-secondary" onclick="shareSpot('${id}')">
                    Share
                </button>
                <button class="btn-report" 
                    onclick="openReportModal('${id}')">
                    Report
                </button>
            </div>

            <div class="reviews-section">
                <h3>Reviews & Ratings</h3>
                <div id="reviews-list-${id}">${reviewsHtml}</div>
                ${reviewFormHtml}
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSpotDetail() {
    document.getElementById('spot-detail-modal').style.display = 'none';
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.getElementById('spot-detail-modal')?.addEventListener('click', function (e) {
    if (e.target === this) closeSpotDetail();
});

// ─── Reviews ──────────────────────────────────
function setReviewStar(spotId, val) {
    document.getElementById(`review-rating-${spotId}`).value = val;
    const stars = document.querySelectorAll(`#star-picker-${spotId} .interactive-star`);
    stars.forEach((s, i) => s.textContent = i < val ? '★' : '☆');
}

async function submitReview(spotId) {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { alert('Please login to leave a review.'); return; }

    const rating = parseInt(document.getElementById(`review-rating-${spotId}`).value);
    const comment = document.getElementById(`review-comment-${spotId}`).value.trim();

    if (!rating || rating < 1) { alert('Please select a star rating.'); return; }

    const { error } = await db.from('reviews').insert([{
        spot_id: spotId,
        user_id: user.id,
        user_email: user.email,
        rating,
        comment
    }]);

    if (error) { alert(error.message); return; }

    // Update avg rating on food_spots
    const { data: allReviews } = await db.from('reviews').select('rating').eq('spot_id', spotId);
    if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
        await db.from('food_spots').update({
            avg_rating: parseFloat(avg.toFixed(2)),
            rating_count: allReviews.length
        }).eq('id', spotId);
    }

    alert('Review posted! ✅');
    await loadPlaces();
    openSpotDetail(spotId);
}

// ─── Edit / Delete ────────────────────────────
async function editSpot(id) {
    const place = allPlaces.find(p => String(p.id) === String(id));
    if (!place) return;

    editingSpotId = id;

    // Pre-fill the form
    document.getElementById('shop-name').value = place.name || '';
    document.getElementById('location').value = place.location || '';
    document.getElementById('food-type-input').value = place.food_type || '';
    document.getElementById('foods-available').value = place.foods_available || '';
    document.getElementById('min-price').value = place.min_price || '';
    document.getElementById('max-price').value = place.max_price || '';
    document.getElementById('description').value = place.description || '';
    if (place.lat) document.getElementById('spot-lat').value = place.lat;
    if (place.lng) document.getElementById('spot-lng').value = place.lng;
    const locSearch = document.getElementById('location-search');
    if (locSearch) locSearch.value = place.location || '';
    if (place.lat && place.lng) {
        document.getElementById('picked-location-display').textContent = 'Location pinned successfully';
    }
    if (place.open_time) document.getElementById('open-time').value = place.open_time;
    if (place.close_time) document.getElementById('close-time').value = place.close_time;

    // Update submit button
    const submitBtn = document.querySelector('#add-place-form button[type="submit"]');
    submitBtn.textContent = '✏️ Update Place';

    // Scroll to form
    document.getElementById('add-place').scrollIntoView({ behavior: 'smooth' });
}

async function deleteSpot(id) {
    if (!confirm('Are you sure you want to delete this spot? This cannot be undone.')) return;
    const { data: { user } } = await db.auth.getUser();
    if (!user) { alert('Please login.'); return; }

    const { error } = await db.from('food_spots').delete().eq('id', id).eq('user_id', user.id);
    if (error) { alert(error.message); return; }

    alert('Spot deleted! 🗑️');
    await loadPlaces();
}

// ─── Add / Update Place form ──────────────────
document.getElementById('add-place-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { data: { user } } = await db.auth.getUser();
    if (!user) { alert('Please login to add a place.'); window.location.href = 'auth.html'; return; }

    // Validate
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    let isValid = true;

    function showError(input, msg) {
        input.classList.add('input-error');
        const span = document.createElement('span');
        span.className = 'field-error';
        span.innerText = msg;
        input.parentNode.insertBefore(span, input.nextSibling);
        isValid = false;
    }

    const nameInput = document.getElementById('shop-name');
    const locationInput = document.getElementById('location');
    const foodsInput = document.getElementById('foods-available');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const descInput = document.getElementById('description');

    if (!nameInput.value.trim()) showError(nameInput, 'Name cannot be empty');
    if (!locationInput.value.trim()) showError(locationInput, 'Location cannot be empty');

    const minPrice = parseInt(minPriceInput.value);
    const maxPrice = parseInt(maxPriceInput.value);
    if (isNaN(minPrice) || minPrice <= 0) showError(minPriceInput, 'Min price must be > 0');
    if (isNaN(maxPrice) || maxPrice <= minPrice) showError(maxPriceInput, 'Max price must be > min price');

    const latVal = document.getElementById('spot-lat').value;
    const lngVal = document.getElementById('spot-lng').value;
    if (!latVal || !lngVal) {
        const locSearch = document.getElementById('location-search');
        showError(locSearch, 'Please search and select a location from suggestions');
        isValid = false;
    }

    if (!isValid) return;

    // Image upload
    let imageUrl = null;
    const imageFile = document.getElementById('spot-image-input').files[0];
    if (imageFile) {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = '⏳ Uploading image…';
        submitBtn.disabled = true;
        const fileExt = imageFile.name.split('.').pop();
        const fileName = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + fileExt;
        const { data: uploadData, error: uploadError } = await db
            .storage
            .from('spot-images')
            .upload(fileName, imageFile, { upsert: true });
        if (!uploadError) {
            const { data: urlData } = db.storage.from('spot-images').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        } else {
            showToast('Image upload failed, submitting without photo.');
        }
        submitBtn.disabled = false;
        submitBtn.textContent = editingSpotId ? '✏️ Update Place' : 'Submit';
    }

    const foodTypeSelect = document.getElementById('food-type-input');
    const foodType = foodTypeSelect.value === 'other'
        ? document.getElementById('food-type-other').value.trim()
        : foodTypeSelect.value;

    const spotData = {
        name: nameInput.value.trim(),
        location: locationInput.value.trim(),
        food_type: foodType || null,
        foods_available: foodsInput.value.trim() || null,
        min_price: minPrice,
        max_price: maxPrice,
        lat: parseFloat(document.getElementById('spot-lat').value) || null,
        lng: parseFloat(document.getElementById('spot-lng').value) || null,
        open_time: document.getElementById('open-time').value || null,
        close_time: document.getElementById('close-time').value || null,
        description: descInput.value.trim() || null,
        section: 'meals-100',
        user_id: user.id,
        added_by: user.email,
        image_url: imageUrl || null
    };

    let error;
    if (editingSpotId) {
        // Update
        ({ error } = await db.from('food_spots').update(spotData).eq('id', editingSpotId).eq('user_id', user.id));
    } else {
        // Insert
        ({ error } = await db.from('food_spots').insert([spotData]));
    }

    if (error) { alert(error.message); return; }

    showToast(editingSpotId ? 'Spot updated!' : 'Place added successfully!');
    e.target.reset();
    document.getElementById('location-search').value = '';
    document.getElementById('location-suggestions').innerHTML = '';
    document.getElementById('food-type-other').style.display = 'none';
    document.getElementById('food-type-other').required = false;
    document.getElementById('spot-image-input').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'flex';
    document.getElementById('remove-image-btn').style.display = 'none';
    document.getElementById('picked-location-display').textContent = '';
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Submit';
    
    if (editingSpotId) {
        const { data: updated } = await db.from('food_spots').select('*').eq('id', editingSpotId).single();
        if (updated) {
            const idx = allPlaces.findIndex(p => String(p.id) === String(editingSpotId));
            if (idx !== -1) allPlaces[idx] = updated;
        }
    } else {
        const { data: newest } = await db.from('food_spots').select('*').order('id', { ascending: false }).limit(1).single();
        if (newest) allPlaces.unshift(newest);
    }
    displayPlaces(allPlaces);
    
    editingSpotId = null;
});

// ─── Advanced filters ─────────────────────────
function applyAdvancedFilters() {
    const searchText = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const foodType = document.getElementById('food-type')?.value.toLowerCase().trim() || '';
    const priceRange = document.getElementById('price-range')?.value || '';
    const distanceLimit = document.getElementById('distance')?.value || '';

    const filtered = allPlaces.filter(place => {
        const name = (place.name || '').toLowerCase();
        const loc = (place.location || '').toLowerCase();
        const ft = (place.food_type || '').toLowerCase();
        const foods = (place.foods_available || '').toLowerCase();
        const desc = (place.description || '').toLowerCase();

        const minP = Number(place.min_price || 0);
        const maxP = Number(place.max_price || minP);

        let dist = null;
        if (userLat && userLng && place.lat && place.lng) {
            dist = getDistance(userLat, userLng, place.lat, place.lng);
        } else {
            dist = Number(place.distance || 999);
        }

        const matchesSearch = !searchText || [name, loc, ft, foods, desc].some(s => s.includes(searchText));
        const matchesFoodType = !foodType || ft.includes(foodType) || foods.includes(foodType);

        let matchesPrice = true;
        if (priceRange === '0-100') matchesPrice = minP <= 100;
        else if (priceRange === '100-250') matchesPrice = maxP >= 100 && minP <= 250;
        else if (priceRange === '250-500') matchesPrice = maxP >= 250 && minP <= 500;
        else if (priceRange === '500+') matchesPrice = maxP >= 500;

        const matchesDist = !distanceLimit || dist === null || dist <= Number(distanceLimit);

        return matchesSearch && matchesFoodType && matchesPrice && matchesDist;
    });

    const sortBy = document.getElementById('sort-by')?.value || 'price-asc';
    filtered.sort((a, b) => {
        if (sortBy === 'price-asc') return (a.min_price || 0) - (b.min_price || 0);
        if (sortBy === 'price-desc') return (b.min_price || 0) - (a.min_price || 0);
        if (sortBy === 'rating') return (b.avg_rating || 0) - (a.avg_rating || 0);
        if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
        if (sortBy === 'distance' && userLat && userLng) {
            const da = getDistance(userLat, userLng, a.lat, a.lng) || 999;
            const db2 = getDistance(userLat, userLng, b.lat, b.lng) || 999;
            return da - db2;
        }
        return 0;
    });

    displayPlaces(filtered, true);
}

document.getElementById('search-btn')?.addEventListener('click', applyAdvancedFilters);
document.getElementById('search-input')?.addEventListener('input', applyAdvancedFilters);
document.getElementById('food-type')?.addEventListener('change', applyAdvancedFilters);
document.getElementById('price-range')?.addEventListener('change', applyAdvancedFilters);
document.getElementById('distance')?.addEventListener('change', applyAdvancedFilters);
document.getElementById('sort-by')?.addEventListener('change', applyAdvancedFilters);

function shareSpot(id) {
    const place = allPlaces.find(p => String(p.id) === String(id));
    if (!place) return;
    const text = place.name + ' - ' + (place.location || '') + 
        ' | Min price: ₹' + place.min_price;
    const mapsUrl = place.lat && place.lng 
        ? ' https://maps.google.com/?q=' + place.lat + ',' + place.lng 
        : '';
    if (navigator.share) {
        navigator.share({ title: place.name, text: text + mapsUrl });
    } else {
        navigator.clipboard.writeText(text + mapsUrl)
            .then(() => showToast('Spot details copied!'))
            .catch(() => showToast('Could not copy. Try manually.'));
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const spotModal = document.getElementById('spot-detail-modal');
        const reportModal = document.getElementById('report-modal');
        if (spotModal?.style.display === 'flex') closeSpotDetail();
        if (reportModal?.style.display === 'flex') closeReportModal();
    }
});

// ─── Bookmarks (localStorage) ─────────────────
function getBookmarks() {
    try { return JSON.parse(localStorage.getItem('eatspot_bookmarks') || '[]'); } catch { return []; }
}

function toggleBookmark(id) {
    const bookmarks = getBookmarks();
    const idx = bookmarks.indexOf(String(id));
    if (idx === -1) {
        bookmarks.push(String(id));
        showToast('Bookmarked! 🔖');
    } else {
        bookmarks.splice(idx, 1);
        showToast('Bookmark removed');
    }
    localStorage.setItem('eatspot_bookmarks', JSON.stringify(bookmarks));
    displayPlaces(allPlaces);
    // Refresh bookmarks page if open
    if (document.getElementById('bookmarks-grid')) renderBookmarksPage();
}

// ─── Report ───────────────────────────────────
function openReportModal(id) {
    currentReportSpotId = id;
    closeSpotDetail();
    document.getElementById('report-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeReportModal() {
    document.getElementById('report-modal').style.display = 'none';
    document.body.style.overflow = '';
    currentReportSpotId = null;
}

document.getElementById('report-modal')?.addEventListener('click', function (e) {
    if (e.target === this) closeReportModal();
});

async function submitReport() {
    const reason = document.getElementById('report-reason').value;
    if (!reason) { alert('Please select a reason.'); return; }
    const details = document.getElementById('report-details').value.trim();
    const { data: { user } } = await db.auth.getUser();

    const { error } = await db.from('reports').insert([{
        spot_id: currentReportSpotId,
        reason,
        details,
        reporter_id: user?.id || null,
        reporter_email: user?.email || 'anonymous'
    }]);

    if (error) { alert(error.message); return; }
    alert('Report submitted. Thank you! ✅');
    closeReportModal();
}

// ─── Toast notification ───────────────────────
function showToast(msg) {
    let toast = document.getElementById('eatspot-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'eatspot-toast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('toast-visible');
    setTimeout(() => toast.classList.remove('toast-visible'), 2500);
}

document.getElementById('food-type-input')?.addEventListener('change', function() {
    const otherInput = document.getElementById('food-type-other');
    if (this.value === 'other') {
        otherInput.style.display = 'block';
        otherInput.required = true;
    } else {
        otherInput.style.display = 'none';
        otherInput.required = false;
        otherInput.value = '';
    }
});

document.getElementById('spot-image-input')?.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be under 5MB');
        this.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('image-preview');
        const placeholder = document.getElementById('upload-placeholder');
        const removeBtn = document.getElementById('remove-image-btn');
        preview.src = e.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        removeBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
});

document.getElementById('remove-image-btn')?.addEventListener('click', () => {
    document.getElementById('spot-image-input').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'flex';
    document.getElementById('remove-image-btn').style.display = 'none';
});

document.getElementById('description')?.addEventListener('input', function() {
    const counter = document.getElementById('desc-counter');
    if (counter) {
        counter.textContent = this.value.length + '/150';
        counter.style.color = this.value.length > 130 ? '#ef4444' : '#94a3b8';
    }
    if (this.value.length > 150) {
        this.value = this.value.slice(0, 150);
    }
});