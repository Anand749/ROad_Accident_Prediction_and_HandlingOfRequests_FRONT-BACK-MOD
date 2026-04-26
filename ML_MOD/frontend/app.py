import streamlit as st
import requests
import folium
from streamlit_folium import st_folium
from streamlit_js_eval import get_geolocation

# 1. Page Configuration (Always Wide)
st.set_page_config(
    page_title="Guardian AI | Accident Risk Radar", 
    page_icon="🛡️", 
    layout="wide",
    initial_sidebar_state="expanded"
)

# 2. Refined Professional CSS (Systematic, No Lag, Clean Fonts)
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    html, body, [class*="st-"] {
        font-family: 'Inter', sans-serif;
        font-size: 0.92rem; /* Systematic font size */
    }
    
    .stApp {
        background-color: #0f172a;
        color: #f8fafc;
    }

    /* Clean UI Overrides */
    header { visibility: hidden; }
    footer { visibility: hidden; }
    [data-testid="stHeader"] { background-color: rgba(0,0,0,0); }

    /* Visual Sidebar Toggle (Permanently available in blue) */
    [data-testid="collapsedControl"] {
        visibility: visible !important;
        display: flex !important;
        background-color: #2563eb !important;
        border-radius: 0 10px 10px 0 !important;
        color: white !important;
        top: 20px !important;
    }

    /* Glass Panels */
    .glass-panel {
        background: rgba(30, 41, 59, 0.6);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 18px;
        border: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 15px;
    }

    /* Risk Cards */
    .risk-card {
        padding: 25px 15px;
        border-radius: 12px;
        text-align: center;
        margin-bottom: 15px;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 8px 16px rgba(0,0,0,0.4);
    }
    .risk-red { background: linear-gradient(135deg, #ef4444, #7f1d1d); color: white; }
    .risk-yellow { background: linear-gradient(135deg, #f59e0b, #92400e); color: white; }
    .risk-green { background: linear-gradient(135deg, #10b981, #064e3b); color: white; }

    [data-testid="stMetricValue"] {
        color: #38bdf8 !important;
        font-weight: 700;
        font-size: 1.6rem !important; /* Systematic metric size */
    }
    
    .stButton>button {
        background: linear-gradient(90deg, #38bdf8, #2563eb);
        color: white;
        padding: 10px;
        font-weight: 600;
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    </style>
    """, unsafe_allow_html=True)

# 3. Persistent State Management
if 'lat' not in st.session_state: st.session_state.lat = 18.5204
if 'lon' not in st.session_state: st.session_state.lon = 73.8567
if 'prediction' not in st.session_state: st.session_state.prediction = None

# 4. Header
st.markdown("<h2 style='margin-bottom:0;'>🛡️ Guardian AI</h2>", unsafe_allow_html=True)
st.markdown("<p style='color: #38bdf8; font-weight:500; font-size:0.8rem; margin-top:0;'>HYBRID ACCIDENT RISK PREDICTION</p>", unsafe_allow_html=True)
st.markdown("---")

# 5. SIDEBAR
with st.sidebar:
    st.markdown("### 📍 Location Control")
    st.markdown("Fetch live GPS or enter coordinates manually.")
    
    # Real-Time Geolocation
    gps_data = get_geolocation()
    
    if st.button("🎯 SYNC LIVE GPS"):
        if gps_data:
            try:
                # Handle both dict formats from js_eval
                coords = gps_data.get("coords", gps_data)
                st.session_state.lat = float(coords.get("latitude"))
                st.session_state.lon = float(coords.get("longitude"))
                st.success(f"GPS Updated: {st.session_state.lat:.4f}")
                st.rerun()
            except Exception as e:
                st.error("GPS Sync failed. Coordinates not found.")
        else:
            st.warning("GPS not ready. Allow browser location access.")

    st.markdown("---")
    
    # Manual Input
    st.session_state.lat = st.number_input("Latitude", value=float(st.session_state.lat), format="%.6f", key="lat_input")
    st.session_state.lon = st.number_input("Longitude", value=float(st.session_state.lon), format="%.6f", key="lon_input")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    if st.button("🚀 ANALYZE ENVIRONMENT"):
        with st.spinner("Analyzing real-time data..."):
            try:
                # Increased timeout to 20s to prevent "Backend unreachable" on cold starts or slow OSM queries
                response = requests.post("http://127.0.0.1:8000/predict", 
                                       json={"latitude": st.session_state.lat, "longitude": st.session_state.lon}, 
                                       timeout=20)
                response.raise_for_status()
                st.session_state.prediction = response.json()
            except requests.exceptions.Timeout:
                st.error("Connection Timeout. Backend took too long to respond.")
            except Exception as e:
                st.error(f"Backend unreachable. Please ensure FastAPI is running.")

# 6. MAIN CONTENT
col_map, col_data = st.columns([1, 1.2])

with col_map:
    st.subheader("🌐 Geospatial Context")
    m = folium.Map(location=[st.session_state.lat, st.session_state.lon], zoom_start=15)
    folium.Marker([st.session_state.lat, st.session_state.lon], icon=folium.Icon(color='blue', icon='crosshairs', prefix='fa')).add_to(m)
    # returned_objects=[] prevents lag and disappearing results on hover
    st_folium(m, height=450, width=None, key="guardian_map", returned_objects=[])

with col_data:
    if st.session_state.prediction:
        d = st.session_state.prediction
        zone = d.get("risk_zone", "Green")
        prob = d.get("probability", 0.0)
        
        # Risk Dashboard
        st.markdown(f"""
            <div class="risk-card risk-{zone.lower()}">
                <p style='margin:0; text-transform:uppercase; font-size:0.8rem; font-weight:600; opacity:0.8;'>Safety Assessment</p>
                <h2 style='margin:0; font-size:2.8rem; font-weight:900;'>{zone.upper()} ZONE</h2>
                <h4 style='margin:0; opacity:0.9;'>{prob*100:.1f}% AI CONFIDENCE</h4>
            </div>
        """, unsafe_allow_html=True)
        
        # Metrics Display
        st.markdown("<div class='glass-panel'>", unsafe_allow_html=True)
        st.subheader("🔮 Intelligence Metrics")
        
        m_col1, m_col2, m_col3 = st.columns(3)
        with m_col1: st.metric("Local Clock", d.get("local_time_clock"), d.get("time_period"))
        with m_col2: st.metric("Weather", d.get("weather"), d.get("weather_description"))
        with m_col3: st.metric("Visibility", f"{d.get('visibility_km')} KM")
        
        st.markdown("<hr style='border:0.5px solid rgba(255,255,255,0.1); margin:15px 0;'>", unsafe_allow_html=True)
        
        m_col4, m_col5, m_col6 = st.columns(3)
        with m_col4: st.metric("Infra", str(d.get("road_type")).capitalize())
        with m_col5: st.metric("Limit", f"{d.get('speed_limit')} km/h")
        with m_col6: st.metric("Surface", d.get("road_conditions"))
        st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.markdown(f"""
            <div style='background: rgba(56, 189, 248, 0.04); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 100px 20px; text-align: center; margin-top: 20px;'>
                <h3 style='color: #38bdf8; margin:0;'>RADAR SYSTEM STANDBY</h3>
                <p style='color: #94a3b8; font-size:0.85rem;'>Adjust location in sidebar and click Analyze.</p>
            </div>
        """, unsafe_allow_html=True)

st.markdown("---")
st.caption("© 2026 Guardian AI | Hybrid Stability Engine v4.5 | OSM & OpenWeather")
