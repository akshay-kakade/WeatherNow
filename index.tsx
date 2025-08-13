import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const searchForm = document.getElementById('search-form') as HTMLFormElement;
const cityInput = document.getElementById('city-input') as HTMLInputElement;
const locationBtn = document.getElementById('location-btn') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const weatherContent = document.getElementById('weather-content') as HTMLDivElement;

// Current weather elements
const cityNameEl = document.getElementById('city-name') as HTMLHeadingElement;
const currentDateEl = document.getElementById('current-date') as HTMLParagraphElement;
const currentTempEl = document.getElementById('current-temp') as HTMLSpanElement;
const currentWeatherIconEl = document.getElementById('current-weather-icon') as HTMLSpanElement;
const currentWeatherDescEl = document.getElementById('current-weather-description') as HTMLParagraphElement;
const feelsLikeEl = document.getElementById('feels-like') as HTMLParagraphElement;
const humidityEl = document.getElementById('humidity') as HTMLParagraphElement;
const windSpeedEl = document.getElementById('wind-speed') as HTMLParagraphElement;

// Forecast element
const forecastCardsContainer = document.getElementById('forecast-cards') as HTMLDivElement;

const iconMap: { [key: string]: { emoji: string, class: string } } = {
    'sunny': { emoji: '☀️', class: 'sunny-bg' },
    'cloudy': { emoji: '☁️', class: 'cloudy-bg' },
    'rain': { emoji: '🌧️', class: 'rainy-bg' },
    'snow': { emoji: '❄️', class: 'snowy-bg' },
    'thunderstorm': { emoji: '⛈️', class: 'thunderstorm-bg' },
    'mist': { emoji: '🌫️', class: 'mist-bg' },
    'clear-night': { emoji: '🌙', class: 'clear-night-bg' },
    'default': { emoji: '🌡️', class: 'cloudy-bg' }
};

const showLoading = (isLoading: boolean) => {
    loader.style.display = isLoading ? 'block' : 'none';
    if (isLoading) {
        weatherContent.style.display = 'none';
        errorMessage.style.display = 'none';
    }
};

const showError = (message: string) => {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    weatherContent.style.display = 'none';
};

const buildPrompt = (location: string): string => {
    return `Return ONLY a JSON object (no markdown, no other text). The weather data should be for ${location}. The JSON object must have this exact structure: { "city": "string", "country": "string", "currentWeather": { "temperature": "number (Celsius)", "description": "string", "icon": "string (one of 'sunny', 'cloudy', 'rain', 'snow', 'thunderstorm', 'mist', 'clear-night')", "feelsLike": "number (Celsius)", "humidity": "number (percentage)", "windSpeed": "number (km/h)" }, "forecast": [ { "day": "string (e.g., 'Monday')", "maxTemp": "number (Celsius)", "minTemp": "number (Celsius)", "icon": "string (one of 'sunny', 'cloudy', 'rain', 'snow', 'thunderstorm', 'mist', 'clear-night')" } ] }. This is for a 5-day forecast.`;
};

const fetchWeatherData = async (location: string) => {
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
        showError("Could not retrieve weather data. The city might not be found or there was a network error. Please try again.");
    } finally {
        showLoading(false);
    }
};

const displayWeatherData = (data: any) => {
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

    // Update background
    document.body.className = currentIcon.class;
    
    const isDarkBg = ['thunderstorm-bg', 'clear-night-bg'].includes(currentIcon.class);
    document.body.classList.toggle('dark-mode', isDarkBg);


    // Update forecast
    forecastCardsContainer.innerHTML = '';
    data.forecast.forEach((day: any) => {
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
};

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

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherData(`latitude ${latitude}, longitude ${longitude}`);
            },
            () => {
                showLoading(false);
                showError("Unable to retrieve your location. Please grant permission or use the search bar.");
            }
        );
    } else {
        showError("Geolocation is not supported by your browser.");
    }
});


// Initial load
window.addEventListener('load', () => {
    fetchWeatherData("New York");
});
