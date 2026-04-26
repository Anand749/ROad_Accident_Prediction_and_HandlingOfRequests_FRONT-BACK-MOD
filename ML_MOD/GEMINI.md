# Accident Hotspot Risk Analysis

This project is a Machine Learning initiative aimed at analyzing and predicting accident risk levels and identifying accident hotspots based on historical accident data.

## Project Overview

The core of this project revolves around a dataset of traffic accidents and pre-trained models designed to quantify risk. The project likely employs classification or regression techniques to predict accident severity or the likelihood of an accident occurring under specific conditions (weather, road type, time, etc.).

### Main Technologies (Inferred)
- **Python**: The standard language for this type of data analysis.
- **Pandas**: Used for data manipulation of `accident.csv`.
- **Scikit-learn**: Likely used for training the `.pkl` models (`accident_risk_model.pkl` and `live_risk_model.pkl`).
- **Pickle**: Used for model serialization.

## Project Structure

- `dataset/`: Contains the raw or processed accident data.
  - `accident.csv`: The primary dataset containing 13 features (State, Date, Time, Reason, Weather, etc.).
- `models/`: Contains serialized machine learning models.
  - `accident_risk_model.pkl`: A model likely trained for overall risk assessment.
  - `live_risk_model.pkl`: A model potentially designed for real-time or dynamic risk prediction.

## Building and Running

### Prerequisites
- Python 3.x
- Libraries: `pandas`, `scikit-learn`, `numpy`

### Training and Inference (TODO)
Currently, no source code (`.py` or `.ipynb`) is present in the repository. The following scripts should be implemented:
- `train_model.py`: To process the dataset and train/save the models.
- `predict_risk.py`: To load the models and perform risk assessment on new data.

## Development Conventions
- **Data Integrity**: Ensure that `accident.csv` follows the schema: `Accident_ID, State, Date, Time, Reason, Number_of_Deaths, Number_of_Injuries, Road_Type, Weather_Conditions, Alcohol_Involved, Driver_Fatigue, Road_Conditions, Speed_Limit`.
- **Model Versioning**: When updating models, maintain clear versioning or use tools like DVC.
- **Documentation**: All new scripts should include docstrings and basic usage instructions.
