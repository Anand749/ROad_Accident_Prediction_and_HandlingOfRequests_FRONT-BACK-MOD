import os
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Load .env from project root (parent of backend/)
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(_env_path)
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

def get_weather(lat: float, lon: float):
    # Fetch real-time weather using the provided API key and coordinates
    # We use 'onecall' or 'weather' API. Standard 'weather' provides visibility and timezone.
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        weather_main = data["weather"][0]["main"]
        weather_desc = data["weather"][0]["description"]
        temp = data["main"]["temp"]
        humidity = data["main"]["humidity"]
        visibility = data.get("visibility", 10000) # Meters
        
        # Calculate local time based on timezone offset from API
        tz_offset = data.get("timezone", 0) # seconds from UTC
        local_dt = datetime.now(timezone.utc) + timedelta(seconds=tz_offset)
        hour = local_dt.hour
        
        # Determine Time Period
        if 5 <= hour < 12:
            time_period = "Morning"
        elif 12 <= hour < 17:
            time_period = "Afternoon"
        elif 17 <= hour < 21:
            time_period = "Evening"
        else:
            time_period = "Night"
            
        return {
            "weather": weather_main,
            "description": weather_desc.capitalize(),
            "temperature": temp,
            "humidity": humidity,
            "visibility": visibility / 1000, # Convert to KM
            "local_time": local_dt.strftime("%H:%M"),
            "time_period": time_period,
            "hour": hour,
            "success": True
        }
    except Exception as e:
        print(f"Weather API error for ({lat}, {lon}): {e}")
        return {
            "weather": "Clear",
            "description": "Clear sky",
            "temperature": 25.0,
            "humidity": 50,
            "visibility": 10.0,
            "local_time": datetime.now().strftime("%H:%M"),
            "time_period": "Unknown",
            "hour": datetime.now().hour,
            "success": False
        }
