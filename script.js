// ---------------- API KEY ----------------
const apiKey = "5656fdc23b4678ebaf29e81bad4917e2";

// ---------------- THEME TOGGLE ----------------
document.getElementById("themeToggle").addEventListener("change", function () {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
});

// ---------------- SPINNER ----------------
function showSpinner() {
  document.getElementById("loadingSpinner").classList.remove("d-none");
}
function hideSpinner() {
  document.getElementById("loadingSpinner").classList.add("d-none");
}

// ---------------- ON LOAD: GEO LOCATION ----------------
window.onload = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherByCoords(lat, lon);
        fetchForecastByCoords(lat, lon);
      },
      () => {
        console.warn("Location access denied. Use manual search.");
      }
    );
  }
};

// ---------------- FETCH WEATHER ----------------
function fetchWeatherByCoords(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  showSpinner();
  fetch(url)
    .then(res => res.ok ? res.json() : Promise.reject("Location weather error"))
    .then(showCurrentWeather)
    .catch(showError)
    .finally(hideSpinner);
}

function fetchForecastByCoords(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  showSpinner();
  fetch(url)
    .then(res => res.ok ? res.json() : Promise.reject("Forecast location error"))
    .then(showForecast)
    .catch(showForecastError)
    .finally(hideSpinner);
}

// ---------------- AUTOCOMPLETE USING NOMINATIM ----------------
const cityInput = document.getElementById("cityInput");
const suggestionsBox = document.getElementById("suggestions");
let suggestions = [];
let activeIndex = -1;

cityInput.addEventListener("input", async () => {
  const q = cityInput.value.trim();
  suggestionsBox.innerHTML = "";
  activeIndex = -1;
  if (q.length < 2) return;

  const results = await searchLocation(q);
  const unique = [];
  const seen = new Set();

  // Remove duplicates
  results.forEach(loc => {
    if (loc.place_id && !seen.has(loc.place_id)) {
      seen.add(loc.place_id);
      unique.push(loc);
    }
  });

  // Keep places we care about
  suggestions = unique.filter(loc =>
    ['city','town','village','hamlet','locality'].includes(loc.type) ||
    loc.address?.postcode === q
  );

  suggestions.forEach((loc, i) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action suggestion-item";
    li.textContent = loc.display_name;
    li.dataset.index = i;
    li.addEventListener("click", () => selectSuggestion(i));
    suggestionsBox.appendChild(li);
  });
});

async function searchLocation(query) {
  const nameURL = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}&addressdetails=1`;
  const postalURL = `https://nominatim.openstreetmap.org/search?format=json&limit=5&postalcode=${encodeURIComponent(query)}&addressdetails=1`;
  const [nameRes, postalRes] = await Promise.all([fetch(nameURL), fetch(postalURL)]);
  const [nameData, postalData] = await Promise.all([nameRes.json(), postalRes.json()]);
  return [...nameData, ...postalData];
}


// Keyboard navigation
cityInput.addEventListener("keydown", (e) => {
  const items = suggestionsBox.getElementsByTagName("li");
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (activeIndex < items.length - 1) activeIndex++;
    updateHighlight(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (activeIndex > 0) activeIndex--;
    updateHighlight(items);
  } else if (e.key === "Enter") {
    if (activeIndex > -1) {
      e.preventDefault();
      selectSuggestion(activeIndex);
    }
  }
});

function updateHighlight(items) {
  for (let i = 0; i < items.length; i++) {
    items[i].classList.toggle("active", i === activeIndex);
  }
}

function selectSuggestion(index) {
  const selected = suggestions[index];
  const lat = selected.lat;
  const lon = selected.lon;
  cityInput.value = selected.display_name;
  suggestionsBox.innerHTML = "";
  fetchWeatherByCoords(lat, lon);
  fetchForecastByCoords(lat, lon);
}

cityInput.addEventListener("blur", () => {
  setTimeout(() => suggestionsBox.innerHTML = "", 200);
});

// ---------------- MANUAL SEARCH (fallback) ----------------
function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return alert("Please enter a city name.");
  fetchWeatherByCity(city);
  fetchForecastByCity(city);
}

function fetchWeatherByCity(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  showSpinner();
  fetch(url)
    .then(res => res.ok ? res.json() : Promise.reject("City not found"))
    .then(showCurrentWeather)
    .catch(showError)
    .finally(hideSpinner);
}

function fetchForecastByCity(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  showSpinner();
  fetch(url)
    .then(res => res.ok ? res.json() : Promise.reject("Forecast unavailable"))
    .then(showForecast)
    .catch(showForecastError)
    .finally(hideSpinner);
}

// ---------------- DISPLAY FUNCTIONS ----------------
function showCurrentWeather(data) {
  const iconCode = data.weather[0].icon;
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  const weatherType = data.weather[0].main.toLowerCase();
  updateWeatherVideo(weatherType);

  const html = `
    <div class="card shadow-sm">
      <div class="card-body d-flex flex-column flex-md-row align-items-center">
        <img src="${iconUrl}" alt="weather icon" class="me-md-4" />
        <div>
          <h3>${data.name}, ${data.sys.country}</h3>
          <p>🌡 Temperature: ${data.main.temp}°C</p>
          <p>💧 Humidity: ${data.main.humidity}%</p>
          <p>🌬 Wind Speed: ${data.wind.speed} km/h</p>
          <p>🌤 Weather: ${data.weather[0].description}</p>
        </div>
      </div>
    </div>
  `;
  document.getElementById("weatherResult").innerHTML = html;
}

function updateWeatherVideo(weatherType) {
  const video = document.getElementById("weatherVideo");
  let videoSrc = "";

  switch (weatherType) {
    case "clear":
      videoSrc = "clear.mp4";
      break;
    case "clouds":
    case "overcast clouds":
      videoSrc = "clouds.mp4";
      break;
    case "rain":
    case "drizzle":
      videoSrc = "rain.mp4";
      break;
    case "snow":
      videoSrc = "snow.mp4";
      break;
    case "mist":
    case "fog":
    case "haze":
    case "thunderstorm":
      videoSrc = "mist.mp4";
      break;
    default:
      videoSrc = "clear.mp4";
  }

  if (video.getAttribute("src") !== videoSrc) {
    video.pause();
    video.setAttribute("src", videoSrc);
    video.load();
    video.play();
  }
}

function showForecast(data) {
  const forecastDiv = document.getElementById("forecastResult");
  forecastDiv.innerHTML = "<h4 class='mb-3'>📅 3-Day Forecast</h4>";
  const filtered = data.list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 3);

  filtered.forEach(day => {
    const date = new Date(day.dt * 1000);
    const weekday = date.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
    const icon = day.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

    const card = `
      <div class="col-md-4 mb-3">
        <div class="card shadow-sm text-center">
          <div class="card-body">
            <h5>${weekday}</h5>
            <img src="${iconUrl}" alt="icon" />
            <p>${day.weather[0].description}</p>
            <p>🌡 ${day.main.temp}°C</p>
          </div>
        </div>
      </div>
    `;
    forecastDiv.innerHTML += card;
  });
}

// ---------------- ERROR HANDLERS ----------------
function showError(msg) {
  document.getElementById("weatherResult").innerHTML =
    `<div class="alert alert-danger">❌ ${msg}</div>`;
}

function showForecastError(msg) {
  document.getElementById("forecastResult").innerHTML =
    `<div class="alert alert-warning mt-3">⚠️ ${msg}</div>`;
}

// ---------------- PWA SERVICE WORKER ----------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log("✅ Service Worker registered"))
      .catch(err => console.error("Service Worker registration failed:", err));
  });
}
