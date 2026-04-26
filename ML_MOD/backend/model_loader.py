import joblib
import os
import pandas as pd
import warnings
import numpy as np

warnings.filterwarnings('ignore')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
LIVE_RISK_MODEL_PATH = os.path.join(MODELS_DIR, "live_risk_model.pkl")

class ModelLoader:
    def __init__(self):
        self.model_data = None
        self.live_model = None
        self.encoders = {}
        self._load_models()
        
    def _load_models(self):
        try:
            if os.path.exists(LIVE_RISK_MODEL_PATH):
                self.model_data = joblib.load(LIVE_RISK_MODEL_PATH)
                if isinstance(self.model_data, dict):
                    self.live_model = self.model_data.get('model')
                    self.encoders = self.model_data.get('encoders', {})
                else:
                    self.live_model = self.model_data
        except Exception as e:
            print(f"Error loading models: {e}")
            
    def predict_risk(self, features: dict):
        if not self.live_model:
            return self._fallback_prediction(features)
            
        try:
            # 1. Rule-Based Base Prediction
            rb_zone, rb_prob = self._fallback_prediction(features)
            
            # 2. ML Model Prediction
            encoded_features = features.copy()
            for col, encoder in self.encoders.items():
                if col in encoded_features and col != 'Risk_Zone':
                    val = str(encoded_features[col])
                    if val not in encoder.classes_:
                        encoded_features[col] = encoder.transform([encoder.classes_[0]])[0]
                    else:
                        encoded_features[col] = encoder.transform([val])[0]

            df = pd.DataFrame([encoded_features])
            if hasattr(self.live_model, "feature_names_in_"):
                df = df.reindex(columns=self.live_model.feature_names_in_, fill_value=0)

            ml_prediction = self.live_model.predict(df)[0]
            ml_zone = str(ml_prediction)
            if 'Risk_Zone' in self.encoders:
                try:
                    ml_zone = self.encoders['Risk_Zone'].inverse_transform([ml_prediction])[0]
                except:
                    pass
            
            try:
                probabilities = self.live_model.predict_proba(df)[0]
                ml_prob = float(max(probabilities))
            except:
                ml_prob = 0.85
            
            # 3. Hybrid Logic: Blending ML and Rule-Based
            # If both agree, high confidence
            if str(ml_zone).capitalize() == str(rb_zone).capitalize():
                return str(ml_zone).capitalize(), (ml_prob + rb_prob) / 2
            
            # If they disagree, we apply a safety weight
            # If rule-based says Green/Yellow but ML says Red, we check if there are severe risks
            if str(ml_zone).capitalize() == "Red" and str(rb_zone).capitalize() != "Red":
                # Only trust ML 'Red' if there is at least some rule-based risk
                if rb_prob < 0.7: # If rule-based is very confident it's safe
                    return "Yellow", 0.60 # Downtier to Yellow
                return "Red", 0.70
            
            # Default to the one with higher confidence
            if ml_prob >= rb_prob:
                return str(ml_zone).capitalize(), ml_prob
            else:
                return str(rb_zone).capitalize(), rb_prob
            
        except Exception as e:
            return self._fallback_prediction(features)

    def _fallback_prediction(self, features: dict):
        # Balanced rule-based logic
        risk_score = 0
        weather = str(features.get("Weather_Conditions", "")).lower()
        road_cond = str(features.get("Road_Conditions", "")).lower()
        speed_limit = int(features.get("Speed_Limit", 60))
        hour = int(features.get("Hour", 12))
        
        # Weather impact (max 2.0)
        if any(w in weather for w in ["rain", "storm", "snow"]): risk_score += 1.5
        elif "fog" in weather: risk_score += 2.0
        elif "clouds" in weather: risk_score += 0.5
        
        # Road impact (max 1.5)
        if road_cond == "poor": risk_score += 1.5
        elif road_cond == "fair": risk_score += 0.5
        
        # Speed impact (max 1.0)
        if speed_limit > 100: risk_score += 1.0
        elif speed_limit > 60: risk_score += 0.5
        
        # Time impact (max 1.0)
        if hour >= 22 or hour <= 4: risk_score += 1.0 # Late night
        elif hour >= 18 or hour <= 6: risk_score += 0.5 # Evening/Dawn
            
        if risk_score >= 3.0:
            return "Red", 0.75
        elif risk_score >= 1.5:
            return "Yellow", 0.60
        else:
            return "Green", 0.90
