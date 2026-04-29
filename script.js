

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
    place.deliveryTime = deliveryTime;

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
                <h4 class="place-name">${place.name}</h4>

                <p class="place-location">📍 ${place.location || 'Location not added'}</p>

                <p class="place-popular">🍽️ Type: ${place.food_type || 'General'}</p>

                <p class="place-description">🥘 Foods: ${place.foods_available || place.popular_item || 'Not added'}</p>

                <p class="place-price price-range-badge">₹${place.min_price ?? place.minPrice} - ₹${place.max_price ?? place.maxPrice ?? 'N/A'}</p>

                <p class="place-description">${place.description || ''}</p>

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
function displayPlaces(places, isFiltering = false) {
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
                if (isFiltering || document.getElementById('search-input')?.value.trim() !== '') {
                    grid.innerHTML = '<div class="empty-state"><p>No spots found for your search 😔</p><p>Try a different name!</p></div>';
                } else {
                    grid.innerHTML = `
                        <div class="empty-state">
                            <p>🍽️ No spots here yet!</p>
                            <p>Be the first to add one.</p>
                        </div>
                    `;
                }
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
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
    const { data, error } = await db.from('food_spots').select('*');
    if (spinner) spinner.style.display = 'none';
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

    const { data: { user } } = await db.auth.getUser();
    if (!user) {
        alert('Please login to add a place.');
        window.location.href = 'auth.html';
        return;
    }

    const newPlace = {
        name: document.getElementById('shop-name').value,
        location: document.getElementById('location').value,
        food_type: document.getElementById('food-type-input').value,
        foods_available: document.getElementById('foods-available').value,
        min_price: parseInt(document.getElementById('min-price').value),
        max_price: parseInt(document.getElementById('max-price').value),
        distance: parseFloat(document.getElementById('distance-input').value),
        description: document.getElementById('description').value,
        section: 'meals-100',
        user_id: user.id
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

// 🔍 Advanced search and sorting filters
function applyAdvancedFilters() {
    const searchText = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const foodType = document.getElementById('food-type')?.value.toLowerCase().trim() || '';
    const priceRange = document.getElementById('price-range')?.value || '';
    const distanceLimit = document.getElementById('distance')?.value || '';

    const filteredPlaces = allPlaces.filter(place => {
        const name = (place.name || '').toLowerCase();
        const location = (place.location || '').toLowerCase();
        const foodTypeData = (place.food_type || '').toLowerCase();
        const foodsAvailable = (place.foods_available || place.food_available || '').toLowerCase();
        const popularItem = (place.popular_item || '').toLowerCase();
        const description = (place.description || '').toLowerCase();

        const minPrice = Number(place.min_price || 0);
        const maxPrice = Number(place.max_price || minPrice);
        const distance = Number(place.distance || 999);

        const matchesSearch =
            searchText === '' ||
            name.includes(searchText) ||
            location.includes(searchText) ||
            foodTypeData.includes(searchText) ||
            foodsAvailable.includes(searchText) ||
            popularItem.includes(searchText) ||
            description.includes(searchText);

        const matchesFoodType =
            foodType === '' ||
            foodType === 'all' ||
            foodTypeData.includes(foodType) ||
            foodsAvailable.includes(foodType);

        let matchesPrice = true;

        if (priceRange === '0-100') {
            matchesPrice = minPrice <= 100 || maxPrice <= 100;
        } 
        else if (priceRange === '100-250') {
            matchesPrice = maxPrice >= 100 && minPrice <= 250;
        } 
        else if (priceRange === '250-500') {
            matchesPrice = maxPrice >= 250 && minPrice <= 500;
        } 
        else if (priceRange === '500+') {
            matchesPrice = maxPrice >= 500;
        }

        const matchesDistance =
            distanceLimit === '' ||
            distanceLimit === 'all' ||
            distance <= Number(distanceLimit);

        return matchesSearch && matchesFoodType && matchesPrice && matchesDistance;
    });

    displayPlaces(filteredPlaces);
}
// Search button click
document.getElementById('search-btn')?.addEventListener('click', applyAdvancedFilters);

// Search while typing
document.getElementById('search-input')?.addEventListener('input', applyAdvancedFilters);

// Filter when dropdown changes
document.getElementById('food-type')?.addEventListener('change', applyAdvancedFilters);
document.getElementById('price-range')?.addEventListener('change', applyAdvancedFilters);
document.getElementById('distance')?.addEventListener('change', applyAdvancedFilters);
// 📍 Find food near user
function findFood() {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<p style="margin-top:1rem;">Searching for food spots near you...</p>';
    }
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        if (spinner) spinner.style.display = 'none';
        alert("Geolocation is not supported by your browser.");
        if (resultsDiv) {
            resultsDiv.innerHTML = '<p style="color:#888; margin-top:1rem;">Location access denied. Showing all spots instead.</p>';
        }
        displayPlaces(allPlaces);
    }
}

function showPosition(position) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';

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
            '<p style="color:#888; margin-top:1rem;">No spots found near you yet. Showing all spots instead.</p>';
        displayPlaces(allPlaces);
    } else {
        document.getElementById('results').innerHTML =
            `<p style="margin-top:1rem;">✅ Found <strong>${nearbyPlaces.length}</strong> spots within 5km of you!</p>`;
        displayPlaces(nearbyPlaces);
    }

    if (typeof google !== 'undefined' && google.maps && nearbyPlaces.length > 0) {
        initMapForNearby(userLat, userLng, nearbyPlaces);
    }
}

function showError(error) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';

    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<p style="color:#888; margin-top:1rem;">Location access denied. Showing all spots instead.</p>';
    }
    displayPlaces(allPlaces);
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

// Price Filter Buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const filterValue = e.target.getAttribute('data-filter');
        if (filterValue === 'all') {
            displayPlaces(allPlaces);
        } else {
            const maxPrice = parseInt(filterValue);
            const filtered = allPlaces.filter(place => {
                const minPrice = Number(place.min_price || place.minPrice || 0);
                return minPrice <= maxPrice;
            });
            displayPlaces(filtered, true);
        }
    });
});

// 🚀 Init
loadPlaces();