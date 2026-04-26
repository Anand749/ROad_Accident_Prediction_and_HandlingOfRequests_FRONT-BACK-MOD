# Accident Risk Prediction System

This project is a real-time accident risk prediction system using Python, FastAPI, and Streamlit. It integrates machine learning models, geospatial APIs, and real-time environmental data to estimate accident risk zones (Green, Yellow, Red) based on a user's location.

## Architecture
- **Frontend:** Streamlit
- **Backend:** FastAPI
- **Data Sources:** OpenStreetMap (Road types, speed limits via osmnx), OpenWeatherMap API (Weather data)
- **ML Models:** Predicts accident severity and live risk.

## Installation

Create a virtual environment and install dependencies:

```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

## Running the Application

1. **Start the Backend:**
   ```bash
   uvicorn backend.main:app --reload
   ```

2. **Start the Frontend:**
   ```bash
   streamlit run frontend/app.py
   ```

## Configuration
You can set up an `OPENWEATHER_API_KEY` in a `.env` file in the root directory. If none is provided, it will use a fallback (Clear weather, 25°C).

```env
OPENWEATHER_API_KEY=your_api_key_here
```
