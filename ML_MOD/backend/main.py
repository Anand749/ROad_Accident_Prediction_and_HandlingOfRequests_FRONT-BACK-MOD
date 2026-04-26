from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .weather_service import get_weather
from .road_service import get_road_info
from .feature_engineering import estimate_road_condition, get_time_features, generate_derived_features, create_feature_vector
from .model_loader import ModelLoader
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Accident Risk AI")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_loader = ModelLoader()

class LocationInput(BaseModel):
    latitude: float
    longitude: float

@app.post("/predict")
def predict_risk(location: LocationInput):
    try:
        logger.info(f"Received prediction request for: {location.latitude}, {location.longitude}")
        
        # 1. Fetch Weather
        weather_info = get_weather(location.latitude, location.longitude)
        weather = weather_info["weather"]
        weather_desc = weather_info["description"]
        visibility = weather_info["visibility"]
        time_period = weather_info["time_period"]
        local_time = weather_info["local_time"]
        hour = weather_info["hour"]
        
        # 2. Fetch Road Info
        road_info = get_road_info(location.latitude, location.longitude)
        road_type = road_info["road_type"]
        speed_limit = road_info["speed_limit"]
        
        # 3. Estimate Road Condition
        road_conditions = estimate_road_condition(road_type)
        
        # 4. Get Time Features
        _, day_of_week, is_night, is_weekend = get_time_features()
        is_night = int(hour >= 20 or hour <= 5)
        
        # 5. Generate Derived Features
        speed_risk, rain_indicator = generate_derived_features(speed_limit, weather)
        
        # 6. Feature Vector
        features = create_feature_vector(
            weather, road_type, road_conditions, speed_limit, 
            hour, day_of_week, is_night, is_weekend, speed_risk, rain_indicator
        )
        
        logger.info(f"Feature vector: {features}")
        
        # 7. ML Prediction
        risk_zone, probability = model_loader.predict_risk(features)
        
        logger.info(f"Raw prediction: {risk_zone}, Prob: {probability}")
        
        # Standardizing Zone Labels
        risk_zone_str = str(risk_zone).capitalize()
        if risk_zone_str not in ["Green", "Yellow", "Red"]:
            # Handle numeric or lower-case variations
            rz_low = risk_zone_str.lower()
            if "0" in rz_low or "green" in rz_low or "low" in rz_low:
                risk_zone_str = "Green"
            elif "1" in rz_low or "yellow" in rz_low or "medium" in rz_low:
                risk_zone_str = "Yellow"
            elif "2" in rz_low or "red" in rz_low or "high" in rz_low:
                risk_zone_str = "Red"
            else:
                # Default fallback based on rule-based severity if model is weird
                risk_zone_str = "Red" if probability > 0.7 else "Yellow"

        return {
            "risk_zone": risk_zone_str,
            "probability": round(float(probability), 2),
            "road_type": road_type,
            "speed_limit": speed_limit,
            "weather": weather,
            "weather_description": weather_desc,
            "road_conditions": road_conditions,
            "visibility_km": round(visibility, 1),
            "time_period": time_period,
            "local_time_clock": local_time
        }
    except Exception as e:
        logger.error(f"Error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
