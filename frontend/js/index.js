let restaurants,
  neighborhoods,
  cuisines,
  observer;
var map;
var markers = [];
/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  fetchNeighborhoods();
  fetchCuisines();

  const map = document.getElementById("map");
  const skip = document.getElementById("skip");
  let visible = 0;
  map.addEventListener('focus',function(){
    skip.style.setProperty("left", "0px");
    skip.focus();
    visible = 1;
  });

  skip.addEventListener("keydown", function(e) {
    if( (e.which == 9) && (visible == 1) ){
      //skip.blur();
      skip.style.display = 'none';
      visible = 0;
    }
  });

});
  
/**
 * Register service worker
 */
registerServiceWorker = () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then((reg) => {
                console.log('Service worker registration successful with scope: ', reg.scope);
                if (reg.installing) {
                    console.log('Service worker installing');
                } else if (reg.waiting) {
                    console.log('Service worker installed');
                } else if (reg.active) {
                    console.log('Service worker active');
                }

            }).catch((error) => {
            // registration failed
            console.log('Registration failed with ' + error);
        });
    }
}
/**
 * Create Intersection Observer
 */
observer = new IntersectionObserver(changes => {
  for (const change of changes) {
    if (!change.isIntersecting) return;
      let target = change.target;
      target.setAttribute('src',target.getAttribute('data-src'));
      observer.unobserve(target);
    }
});
/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}


/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
      const ul = document.getElementById('restaurants-list');
      const li = document.createElement('li');
      li.innerHTML = '<p role="alert">You are offline, go online to see restaurants</p>'
      ul.append(li);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}
/**
 * Initialize Google map, called from HTML.
 */
 window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  let setTitle = () => {
    const iFrameGoogleMaps = document.querySelector('#map iframe');
    iFrameGoogleMaps.setAttribute('title', 'Google Maps with restaurants markers');
  }
  map.addListener('tilesloaded', setTitle);
  updateRestaurants();
}


/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Count the restaurant number and write
 * it at the place of map in mobile device
 */
restaurantCounter = (resultCounter) => {
  const mySpan = document.getElementById('results');
  mySpan.innerHTML = resultCounter;
}
/**
 * Create all restaurants HTML and add them to the webpage.
 */
let resultCounter = 0;
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    resultCounter++;
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
  restaurantCounter(resultCounter);
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img js-lazy-image';
  const theImg = DBHelper.imageUrlForRestaurant(restaurant);
  const parts = theImg.match(/[^\.]+/);
  const imgNum = parts[0];
  const imgSmall = `${imgNum}_s.jpg`;
  image.dataset.src = imgSmall;
  image.alt = `${restaurant.name} restaurant image`;
  li.append(image);
  observer.observe(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.tabIndex = 0;
  more.setAttribute('aria-label', `View more about ${restaurant.name}`); 
  more.setAttribute('role', 'button');
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}
