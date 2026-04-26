import osmnx as ox
import pandas as pd

def get_road_info(lat: float, lon: float, dist=150):
    try:
        # Fetch nearest edges within dist meters
        graph = ox.graph_from_point((lat, lon), dist=dist, network_type='drive')
        if not graph:
            return {"road_type": "primary", "speed_limit": 60}
        
        # Get edges
        edges = ox.graph_to_gdfs(graph, nodes=False, edges=True)
        if edges.empty:
            return {"road_type": "primary", "speed_limit": 60}
        
        # Get the first edge (closest usually)
        first_edge = edges.iloc[0]
        
        highway = first_edge.get("highway", "primary")
        if isinstance(highway, list):
            highway = highway[0]
            
        maxspeed = first_edge.get("maxspeed", "60")
        if isinstance(maxspeed, list):
            maxspeed = maxspeed[0]
            
        # Clean maxspeed
        try:
            if isinstance(maxspeed, str):
                maxspeed = int(maxspeed.replace(" km/h", "").replace(" mph", "").strip())
            else:
                maxspeed = int(maxspeed)
        except (ValueError, TypeError):
            maxspeed = 60
            
        return {"road_type": highway, "speed_limit": maxspeed}
        
    except Exception as e:
        print(f"OSM error: {e}")
        return {"road_type": "primary", "speed_limit": 60}
