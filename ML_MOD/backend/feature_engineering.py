from datetime import datetime

def estimate_road_condition(road_type: str) -> str:
    road_type = str(road_type).lower()
    if road_type in ["motorway", "primary"]:
        return "Good"
    elif road_type in ["secondary", "tertiary"]:
        return "Fair"
    elif road_type in ["residential", "service"]:
        return "Poor"
    else:
        return "Fair"

def get_time_features():
    now = datetime.now()
    hour = now.hour
    day_of_week = now.weekday()  # Monday is 0, Sunday is 6
    is_night = int(hour >= 20 or hour <= 5)
    is_weekend = int(day_of_week in [5, 6])
    return hour, day_of_week, is_night, is_weekend

def generate_derived_features(speed_limit: int, weather: str):
    speed_risk = int(speed_limit > 60)
    rain_indicator = int(weather.lower() == "rain")
    return speed_risk, rain_indicator

def create_feature_vector(weather, road_type, road_conditions, speed_limit, hour, day_of_week, is_night, is_weekend, speed_risk, rain_indicator):
    return {
        "Weather_Conditions": weather,
        "Road_Type": road_type,
        "Road_Conditions": road_conditions,
        "Speed_Limit": speed_limit,
        "Hour": hour,
        "Day_of_Week": day_of_week,
        "Is_Night": is_night,
        "Is_Weekend": is_weekend,
        "Speed_Risk": speed_risk,
        "Rain_Indicator": rain_indicator
    }
