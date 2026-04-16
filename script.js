// Smooth scrolling for navigation links
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

const foodPlaces = [
    {
        name: "sweet home",
        minPrice: 10,
        maxPrice: 18,
        distance: ".1 km",
        rating: 4,
        image: "image/sweet.png",
        description: "Authentic local street food with fresh ingredients.",
        section: "meals-100",
        lat: 11.19627,
        lng: 75.85717
    },
    {
        name: "teapetti",
        minPrice: 20,
        maxPrice: 110,
        distance: "3.3 km",
        rating: 4.3,
        image: "image/tea.png",
        description: "Great tea selection,live performances",
        section: "student-offers",
        lat: 11.18431,
        lng: 75.84874
    },
    {
        name: "Spicy Amma Mess",
        minPrice: 10,
        maxPrice: 100,
        distance: "4.2km",
        rating: 4.7,
        image: "image/mess.png",
        description: "meals",
        section: "hidden-gems",
        lat: 11.27808,
        lng: 75.84546
    },
];

// ⭐ Rating stars
function renderStars(rating) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
        stars += i < rating ? '★' : '☆';
    }
    return stars;
}

// 🧾 KEEP YOUR ORIGINAL UI
function createPlaceCard(place, index) {
    const deliveryTime = Math.floor(Math.random() * 20) + 15;
    const imageUrl = place.image || (place.img && place.img.src) || 'https://via.placeholder.com/300x200?text=Food';

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
                        <span class="rating-stars">${renderStars(place.rating)}</span>
                        <span class="rating-text">${place.rating}</span>
                    </div>
                </div>
                <p class="place-price cheapest-badge">Cheapest: ₹${place.minPrice}</p>
                <p class="place-popular">Maximum rate ₹${place.maxPrice ?? 'N/A'}</p>
                <div class="card-footer">
                    <span class="place-distance">📍 ${place.distance}</span>
                    <button class="btn-secondary" onclick="viewLocation('${place.name}')">
                        View Location 📍
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 📦 Display sections
function displayPlaces(places = foodPlaces) {
    const sortedPlaces = [...places].sort((a, b) => a.minPrice - b.minPrice);

    const sections = {
        'meals-100': sortedPlaces.filter(p => p.minPrice <= 100),
        'hidden-gems': sortedPlaces.filter(p => p.section === 'hidden-gems'),
        'student-offers': sortedPlaces.filter(p => p.section === 'student-offers')
    };

    Object.keys(sections).forEach(sectionId => {
        const grid = document.getElementById(`${sectionId}-grid`);
        if (grid) {
            grid.innerHTML = sections[sectionId]
                .map((place, index) => createPlaceCard(place, index))
                .join('');
        }
    });
}

// ✅ FINAL LOCATION FUNCTION (DON’T CHANGE AGAIN)
function viewLocation(name) {
    const place = foodPlaces.find(p => p.name === name);

    if (place && place.lat && place.lng) {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
        window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    } else {
        alert("Location not found");
    }
}

// 🚀 Load
displayPlaces();

// Function to initialize Google Map for a specific place
function initMapForPlace(place) {
    document.getElementById('map').style.display = 'block';
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 18,
        center: { lat: place.lat, lng: place.lng }
    });

    const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: map,
        title: place.name
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div>
                <h4>${place.name}</h4>
                <p>${place.description}</p>
                <p>Cheapest: ₹${place.minPrice}</p>
                <p>Maximum rate: ₹${place.maxPrice ?? 'N/A'}</p>
            </div>
        `
    });

    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });

    // Show results with place info
    const resultsHTML = `
        <h3>Location: ${place.name}</h3>
        <p>${place.description}</p>
        <p>Exact coordinates: ${place.lat}, ${place.lng}</p>
    `;
    document.getElementById("results").innerHTML = resultsHTML;
}

// Function to find food near user
function findFood() {
    console.log("findFood called");
    // For testing, use mock location (Delhi coordinates)
    const mockPosition = {
        coords: {
            latitude: 28.6139,
            longitude: 77.2090
        }
    };
    showPosition(mockPosition);
}

function showPosition(position) {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    // Calculate distances and find nearby places (within 5km)
    const nearbyPlaces = foodPlaces.map(place => {
        const distance = getDistance(userLat, userLng, place.lat, place.lng);
        return { ...place, distance };
    }).filter(place => place.distance <= 5).sort((a, b) => a.distance - b.distance);

    displayPlaces(nearbyPlaces, `Found ${nearbyPlaces.length} places within 5km of your location:`);

    // Show map with nearby places
    if (typeof google !== 'undefined' && google.maps && nearbyPlaces.length > 0) {
        initMapForNearby(userLat, userLng, nearbyPlaces);
    }
}

function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

// Haversine formula to calculate distance between two points
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

function initMapForNearby(userLat, userLng, places) {
    document.getElementById('map').style.display = 'block';
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: { lat: userLat, lng: userLng }
    });

    // Add marker for user location
    new google.maps.Marker({
        position: { lat: userLat, lng: userLng },
        map: map,
        title: 'Your Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    });

    // Add markers for places
    places.forEach(place => {
        const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map: map,
            title: place.name
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div>
                    <h4>${place.name}</h4>
                    <p>${place.description}</p>
                    <p>Distance: ${place.distance.toFixed(1)} km</p>
                    <p>Cheapest: ₹${place.minPrice}</p>
                    <p>Maximum rate: ₹${place.maxPrice ?? 'N/A'}</p>
                </div>
            `
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
    });
}
