import { GoogleGenAI } from "@google/genai";

// The API key is read from a global variable `self.API_KEY` which is set in index.html.
const API_KEY = self.API_KEY;

if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY") {
  const container = document.getElementById('app-container');
  if (container) {
    container.innerHTML = `
      <div style="font-family: sans-serif; padding: 2rem; text-align: center; background: #fdf2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 12px; margin: 2rem auto; max-width: 600px;">
        <h1>Configuration Error</h1>
        <p>Google Gemini API key is not configured.</p>
        <p>Please open the <code>index.html</code> file and replace <strong>"YOUR_GEMINI_API_KEY"</strong> with your actual key.</p>
      </div>
    `;
  }
  // Stop the script execution if no key is found.
  throw new Error("API_KEY not configured. Please set it in index.html.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const weatherContent = document.getElementById('weather-content');

// Current weather elements
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const currentTempEl = document.getElementById('current-temp');
const currentWeatherIconEl = document.getElementById('current-weather-icon');
const currentWeatherDescEl = document.getElementById('current-weather-description');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const pressureEl = document.getElementById('pressure');


// Forecast element
const forecastCardsContainer = document.getElementById('forecast-cards');

const iconMap = {
    'sunny': { emoji: '☀️', class: 'sunny-bg' },
    'cloudy': { emoji: '☁️', class: 'cloudy-bg' },
    'rain': { emoji: '🌧️', class: 'rainy-bg' },
    'snow': { emoji: '❄️', class: 'snowy-bg' },
    'thunderstorm': { emoji: '⛈️', class: 'thunderstorm-bg' },
    'mist': { emoji: '🌫️', class: 'mist-bg' },
    'clear-night': { emoji: '🌙', class: 'clear-night-bg' },
    'default': { emoji: '🌡️', class: 'cloudy-bg' }
};

const showLoading = (isLoading) => {
    if (loader) loader.style.display = isLoading ? 'block' : 'none';
    if (isLoading) {
        if (weatherContent) weatherContent.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
    }
};

const showError = (message) => {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    if (weatherContent) weatherContent.style.display = 'none';
    showLoading(false);
};

const buildPrompt = (location) => {
    return `Return ONLY a JSON object (no markdown, no other text). The weather data should be for ${location}. The JSON object must have this exact structure: { "city": "string", "country": "string", "currentWeather": { "temperature": "number (Celsius)", "description": "string", "icon": "string (one of 'sunny', 'cloudy', 'rain', 'snow', 'thunderstorm', 'mist', 'clear-night')", "feelsLike": "number (Celsius)", "humidity": "number (percentage)", "windSpeed": "number (km/h)", "sunrise": "string (e.g., '6:30 AM')", "sunset": "string (e.g., '7:45 PM')", "pressure": "number (hPa)" }, "forecast": [ { "day": "string (e.g., 'Monday')", "maxTemp": "number (Celsius)", "minTemp": "number (Celsius)", "icon": "string (one of 'sunny', 'cloudy', 'rain', 'snow', 'thunderstorm', 'mist', 'clear-night')" } ] }. This is for a 5-day forecast.`;
};

const fetchWeatherData = async (location) => {
    showLoading(true);
    try {
        const prompt = buildPrompt(location);
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        let text = response.text.trim();
        // Handle potential markdown code block
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            text = jsonMatch[1];
        }

        const data = JSON.parse(text);
        displayWeatherData(data);

    } catch (error) {
        console.error("Error fetching or parsing weather data:", error);
        showError("Oops! Could not fetch weather. Please check the city name or try again later. 🌎");
    } finally {
        showLoading(false);
    }
};

const displayWeatherData = (data) => {
     if (!cityNameEl || !currentDateEl || !currentTempEl || !currentWeatherIconEl || !currentWeatherDescEl || !feelsLikeEl || !humidityEl || !windSpeedEl || !forecastCardsContainer || !weatherContent || !sunriseEl || !sunsetEl || !pressureEl) {
        console.error("One or more weather display elements are missing from the DOM.");
        showError("There was a problem displaying the weather. Some UI elements are missing.");
        return;
    }

    // Update current weather
    cityNameEl.textContent = `${data.city}, ${data.country}`;
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const currentIconKey = data.currentWeather.icon.toLowerCase().split(' ').join('-');
    const currentIcon = iconMap[currentIconKey] || iconMap.default;
    
    currentTempEl.textContent = `${Math.round(data.currentWeather.temperature)}°C`;
    currentWeatherIconEl.textContent = currentIcon.emoji;
    currentWeatherDescEl.textContent = data.currentWeather.description;
    feelsLikeEl.textContent = `${Math.round(data.currentWeather.feelsLike)}°C`;
    humidityEl.textContent = `${data.currentWeather.humidity}%`;
    windSpeedEl.textContent = `${data.currentWeather.windSpeed} km/h`;
    sunriseEl.textContent = data.currentWeather.sunrise;
    sunsetEl.textContent = data.currentWeather.sunset;
    pressureEl.textContent = `${data.currentWeather.pressure} hPa`;

    // Update background
    document.body.className = ''; // Clear previous classes
    document.body.classList.add(currentIcon.class);
    
    const isDarkBg = ['thunderstorm-bg', 'clear-night-bg'].includes(currentIcon.class);
    document.body.classList.toggle('dark-mode', isDarkBg);

    // Update forecast
    forecastCardsContainer.innerHTML = '';
    data.forecast.forEach((day) => {
        const forecastIconKey = day.icon.toLowerCase().split(' ').join('-');
        const forecastIcon = iconMap[forecastIconKey] || iconMap.default;
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <p class="day">${day.day}</p>
            <p class="icon">${forecastIcon.emoji}</p>
            <p class="temp">
                <strong>${Math.round(day.maxTemp)}°</strong> / ${Math.round(day.minTemp)}°
            </p>
        `;
        forecastCardsContainer.appendChild(card);
    });

    weatherContent.style.display = 'block';
    if(errorMessage) errorMessage.style.display = 'none';
};

if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            fetchWeatherData(city);
            cityInput.value = '';
        } else {
            showError("Please enter a city name.");
        }
    });
}

if (locationBtn) {
    locationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            showLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchWeatherData(`latitude ${latitude}, longitude ${longitude}`);
                },
                () => {
                    showError("Unable to retrieve your location. Please grant permission or use the search bar.");
                }
            );
        } else {
            showError("Geolocation is not supported by your browser.");
        }
    });
}

// Initial load
if (API_KEY && API_KEY !== "YOUR_GEMINI_API_KEY") {
    window.addEventListener('load', () => {
        fetchWeatherData("New York");
    });
}