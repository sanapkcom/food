
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Store loaded places globally for filtering
let allPlaces = [];

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ⭐ Rating stars
function renderStars(rating) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
        stars += i < Math.round(rating) ? '★' : '☆';
    }
    return stars;
}

// 🧾 Place card
function createPlaceCard(place, index) {
    const deliveryTime = place.deliveryTime || (Math.floor(Math.random() * 20) + 15);
    place.deliveryTime = deliveryTime; // fix it once per place
    const imageUrl = place.image || 'https://via.placeholder.com/300x200?text=Food';
    const distance = typeof place.distance === 'number'
        ? place.distance.toFixed(1) + ' km'
        : place.distance || 'N/A';

    return `
        <div class="place-card" style="animation-delay: ${index * 0.1}s">
            <div class="card-image-container">
                <img src="${imageUrl}" alt="${place.name}" class="place-image">
                <div class="card-badge">
                    <span class="delivery-time">🕒 ${deliveryTime} min</span>
                </div>
            </div>
            <div class="place-info">
                <div class="card-header">
                    <h4 class="place-name">${place.name}</h4>
                    <div class="rating-container">
                        <span class="rating-stars">${renderStars(place.rating || 0)}</span>
                        <span class="rating-text">${place.rating || 'N/A'}</span>
                    </div>
                </div>
                <p class="place-price cheapest-badge">Cheapest: ₹${place.min_price ?? place.minPrice}</p>
                <p class="place-popular">Maximum rate ₹${place.max_price ?? place.maxPrice ?? 'N/A'}</p>
                <div class="card-footer">
                    <span class="place-distance">📍 ${distance}</span>
                    <button class="btn-secondary" onclick="viewLocation('${place.name}')">
                        View Location 📍
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 📦 Display sections
function displayPlaces(places) {
    const sortedPlaces = [...places].sort((a, b) =>
        (a.min_price ?? a.minPrice) - (b.min_price ?? b.minPrice)
    );

    const sections = {
        'meals-100': sortedPlaces.filter(p => p.section === 'meals-100'),
        'hidden-gems': sortedPlaces.filter(p => p.section === 'hidden-gems'),
        'student-offers': sortedPlaces.filter(p => p.section === 'student-offers')
    };

    Object.keys(sections).forEach(sectionId => {
        const grid = document.getElementById(`${sectionId}-grid`);
        if (grid) {
            if (sections[sectionId].length === 0) {
                grid.innerHTML = '<p style="color:#888; padding:1rem;">No places found.</p>';
            } else {
                grid.innerHTML = sections[sectionId]
                    .map((place, index) => createPlaceCard(place, index))
                    .join('');
            }
        }
    });
}

// 🔄 Load from Supabase
async function loadPlaces() {
    const { data, error } = await db.from('food_spots').select('*');
    if (error) {
        console.error('Error fetching places:', error);
        return;
    }
    allPlaces = data;
    displayPlaces(allPlaces);
}

// 📍 View location on Google Maps
function viewLocation(name) {
    const place = allPlaces.find(p => p.name === name);
    if (place && place.lat && place.lng) {
        const url = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    } else {
        alert("Location not found");
    }
}

// ➕ Add Place form
document.getElementById('add-place-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPlace = {
        name: document.getElementById('shop-name').value,
        location: document.getElementById('location').value,
        min_price: parseInt(document.getElementById('min-price').value),
        max_price: parseInt(document.getElementById('max-price').value),
        popular_item: document.getElementById('popular-item').value,
        description: document.getElementById('description').value,
        section: 'meals-100', // default section
    };

    const { error } = await db.from('food_spots').insert([newPlace]);

    if (error) {
        alert(error.message);
    } else {
        alert('Place added! ✅');
        e.target.reset();
        loadPlaces();
    }
});

// 🔍 Price filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        if (filter === 'all') {
            displayPlaces(allPlaces);
        } else {
            const limit = parseInt(filter);
            const filtered = allPlaces.filter(p =>
                (p.min_price ?? p.minPrice) <= limit
            );
            displayPlaces(filtered);
        }
    });
});

// 📍 Find food near user
function findFood() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function showPosition(position) {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    // Update navbar location text
    document.querySelector('.location-text').textContent = `${userLat.toFixed(3)}, ${userLng.toFixed(3)}`;

    const nearbyPlaces = allPlaces.map(place => {
        const distance = getDistance(userLat, userLng, place.lat, place.lng);
        return { ...place, distance };
    }).filter(place => place.distance <= 5)
        .sort((a, b) => a.distance - b.distance);

    if (nearbyPlaces.length === 0) {
        document.getElementById('results').innerHTML =
            '<p style="color:#888; margin-top:1rem;">No food spots found within 5km 😔</p>';
    } else {
        document.getElementById('results').innerHTML =
            `<p style="margin-top:1rem;">✅ Found <strong>${nearbyPlaces.length}</strong> spots near you!</p>`;
    }

    displayPlaces(nearbyPlaces.length > 0 ? nearbyPlaces : allPlaces);

    if (typeof google !== 'undefined' && google.maps && nearbyPlaces.length > 0) {
        initMapForNearby(userLat, userLng, nearbyPlaces);
    }
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("Location permission denied.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information unavailable.");
            break;
        case error.TIMEOUT:
            alert("Location request timed out.");
            break;
        default:
            alert("An unknown error occurred.");
    }
}

// 📐 Haversine distance
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// 🗺️ Map for nearby places
function initMapForNearby(userLat, userLng, places) {
    document.getElementById('map').style.display = 'block';
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: { lat: userLat, lng: userLng }
    });

    new google.maps.Marker({
        position: { lat: userLat, lng: userLng },
        map,
        title: 'Your Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    });

    places.forEach(place => {
        const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map,
            title: place.name
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div>
                    <h4>${place.name}</h4>
                    <p>${place.description}</p>
                    <p>Distance: ${place.distance.toFixed(1)} km</p>
                    <p>Cheapest: ₹${place.min_price ?? place.minPrice}</p>
                    <p>Max: ₹${place.max_price ?? place.maxPrice ?? 'N/A'}</p>
                </div>
            `
        });

        marker.addListener('click', () => infoWindow.open(map, marker));
    });
}

// 🚀 Init
loadPlaces();