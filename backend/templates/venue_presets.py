from typing import Dict, Any, List

def get_stadium_preset() -> Dict[str, Any]:
    return {
        "id": "stadium_grand_national",
        "name": "Grand National Stadium",
        "venue_type": "stadium",
        "description": "Premier multi-tier sports arena with dedicated entrance boulevard, turnstile concourse, and emergency egress network.",
        "width": 120.0,
        "length": 80.0,
        "scale": 1.0,
        "elements": [
            # Outer boundary walls
            {"id": "w_north", "type": "wall", "x": 60.0, "y": 79.0, "width": 120.0, "height": 2.0, "label": "North Perimeter Wall"},
            {"id": "w_south_l", "type": "wall", "x": 25.0, "y": 1.0, "width": 50.0, "height": 2.0, "label": "South Wall Left"},
            {"id": "w_south_r", "type": "wall", "x": 95.0, "y": 1.0, "width": 50.0, "height": 2.0, "label": "South Wall Right"},
            {"id": "w_west", "type": "wall", "x": 1.0, "y": 40.0, "width": 2.0, "height": 80.0, "label": "West Perimeter Wall"},
            {"id": "w_east", "type": "wall", "x": 119.0, "y": 40.0, "width": 2.0, "height": 80.0, "label": "East Perimeter Wall"},

            # Main Entrance & Gates
            {"id": "gate_main_a", "type": "entry_gate", "x": 55.0, "y": 1.0, "width": 8.0, "height": 2.0, "capacity_rate": 120.0, "label": "Main Gate A (Turnstiles)"},
            {"id": "gate_main_b", "type": "entry_gate", "x": 65.0, "y": 1.0, "width": 8.0, "height": 2.0, "capacity_rate": 120.0, "label": "Main Gate B (Turnstiles)"},
            {"id": "sec_check_1", "type": "security", "x": 60.0, "y": 10.0, "width": 18.0, "height": 3.0, "capacity_rate": 200.0, "label": "Security Screening Pavilion"},
            {"id": "ticket_booth_1", "type": "ticket_counter", "x": 40.0, "y": 8.0, "width": 6.0, "height": 3.0, "label": "Box Office / Tickets"},

            # Queue Barricades at Entrance
            {"id": "barr_q1", "type": "barricade", "x": 52.0, "y": 5.0, "width": 0.5, "height": 8.0, "label": "Queue Divider 1"},
            {"id": "barr_q2", "type": "barricade", "x": 60.0, "y": 5.0, "width": 0.5, "height": 8.0, "label": "Queue Divider 2"},
            {"id": "barr_q3", "type": "barricade", "x": 68.0, "y": 5.0, "width": 0.5, "height": 8.0, "label": "Queue Divider 3"},

            # Central Stadium Field
            {"id": "pitch_field", "type": "open_space", "x": 60.0, "y": 48.0, "width": 46.0, "height": 30.0, "label": "Stadium Field / Pitch"},

            # Seating Stands
            {"id": "stand_north", "type": "seating", "x": 60.0, "y": 68.0, "width": 56.0, "height": 10.0, "label": "North Grandstand (Tiers A-C)"},
            {"id": "stand_south", "type": "seating", "x": 60.0, "y": 28.0, "width": 56.0, "height": 10.0, "label": "South Grandstand (Tiers D-F)"},
            {"id": "stand_west", "type": "seating", "x": 28.0, "y": 48.0, "width": 10.0, "height": 30.0, "label": "West Terrace"},
            {"id": "stand_east", "type": "seating", "x": 92.0, "y": 48.0, "width": 10.0, "height": 30.0, "label": "East Terrace & VIP Club"},

            # Amenities & Stations
            {"id": "med_station_1", "type": "medical", "x": 12.0, "y": 18.0, "width": 8.0, "height": 5.0, "label": "Emergency Medical Center"},
            {"id": "police_post_1", "type": "police", "x": 108.0, "y": 18.0, "width": 8.0, "height": 5.0, "label": "Police & Safety Command"},
            {"id": "food_stall_1", "type": "food_stall", "x": 15.0, "y": 65.0, "width": 8.0, "height": 4.0, "label": "Concessions & Refreshments"},
            {"id": "restroom_1", "type": "restroom", "x": 105.0, "y": 65.0, "width": 8.0, "height": 4.0, "label": "Restroom Pavilion"},

            # Regular & Emergency Exits
            {"id": "exit_w1", "type": "exit_gate", "x": 1.0, "y": 25.0, "width": 2.0, "height": 8.0, "label": "Exit Gate West-1"},
            {"id": "exit_e1", "type": "exit_gate", "x": 119.0, "y": 25.0, "width": 2.0, "height": 8.0, "label": "Exit Gate East-1"},
            {"id": "exit_em_n", "type": "emergency_exit", "x": 60.0, "y": 79.0, "width": 10.0, "height": 2.0, "label": "Emergency Exit North (E1)"},
            {"id": "exit_em_w", "type": "emergency_exit", "x": 1.0, "y": 60.0, "width": 2.0, "height": 6.0, "label": "Emergency Exit West (E2)"}
        ]
    }

def get_railway_preset() -> Dict[str, Any]:
    return {
        "id": "railway_metro_junction",
        "name": "Central Railway Terminal",
        "venue_type": "railway",
        "description": "High-density transit terminal featuring multi-track platforms, overhead footbridge, security check-in, and passenger concourse.",
        "width": 130.0,
        "length": 75.0,
        "scale": 1.0,
        "elements": [
            # Main Building Concourse
            {"id": "rw_concourse", "type": "building", "x": 65.0, "y": 14.0, "width": 110.0, "height": 18.0, "label": "Main Concourse Hall"},
            {"id": "rw_ticket_line", "type": "ticket_counter", "x": 35.0, "y": 10.0, "width": 16.0, "height": 3.0, "label": "Ticket Booking Counters"},
            {"id": "rw_security_gate", "type": "security", "x": 65.0, "y": 10.0, "width": 16.0, "height": 3.0, "capacity_rate": 180.0, "label": "Baggage & Security Scanners"},
            {"id": "rw_turnstiles", "type": "entry_gate", "x": 65.0, "y": 20.0, "width": 20.0, "height": 2.0, "capacity_rate": 220.0, "label": "Automatic Fare Gates"},

            # Platforms & Foot Overbridge
            {"id": "plat_1", "type": "seating", "x": 65.0, "y": 38.0, "width": 110.0, "height": 8.0, "label": "Platform 1 & 2"},
            {"id": "plat_2", "type": "seating", "x": 65.0, "y": 58.0, "width": 110.0, "height": 8.0, "label": "Platform 3 & 4"},
            {"id": "fob_bridge", "type": "building", "x": 65.0, "y": 48.0, "width": 8.0, "height": 35.0, "label": "Foot Overbridge (FOB)"},

            # Exits & Emergency
            {"id": "rw_exit_s1", "type": "exit_gate", "x": 20.0, "y": 1.0, "width": 10.0, "height": 2.0, "label": "South Street Exit"},
            {"id": "rw_exit_s2", "type": "exit_gate", "x": 110.0, "y": 1.0, "width": 10.0, "height": 2.0, "label": "East Parking Exit"},
            {"id": "rw_em_n", "type": "emergency_exit", "x": 65.0, "y": 74.0, "width": 12.0, "height": 2.0, "label": "North Track Emergency Egress"}
        ]
    }

def get_temple_preset() -> Dict[str, Any]:
    return {
        "id": "temple_grand_complex",
        "name": "Grand Temple Pilgrimage Complex",
        "venue_type": "temple",
        "description": "High-volume spiritual sanctum with serpentine queue barricades, footwear deposit, darshan corridor, and crowd release avenues.",
        "width": 110.0,
        "length": 85.0,
        "scale": 1.0,
        "elements": [
            # Outer Gopuram & Entry
            {"id": "t_gopuram", "type": "building", "x": 55.0, "y": 6.0, "width": 24.0, "height": 8.0, "label": "Outer Rajagopuram Entrance"},
            {"id": "t_sec_entry", "type": "security", "x": 55.0, "y": 14.0, "width": 14.0, "height": 3.0, "capacity_rate": 150.0, "label": "Pilgrim Security Verification"},

            # Serpentine Queue Corridors
            {"id": "q_barr_1", "type": "barricade", "x": 40.0, "y": 26.0, "width": 45.0, "height": 0.8, "label": "Queue Line 1"},
            {"id": "q_barr_2", "type": "barricade", "x": 70.0, "y": 34.0, "width": 45.0, "height": 0.8, "label": "Queue Line 2"},
            {"id": "q_barr_3", "type": "barricade", "x": 40.0, "y": 42.0, "width": 45.0, "height": 0.8, "label": "Queue Line 3"},

            # Inner Sanctum & Darshan Hall
            {"id": "sanctum_hall", "type": "building", "x": 55.0, "y": 62.0, "width": 38.0, "height": 24.0, "label": "Main Sanctum & Darshan Mandapam"},
            {"id": "prasad_counter", "type": "food_stall", "x": 92.0, "y": 45.0, "width": 12.0, "height": 6.0, "label": "Prasadam Distribution"},
            {"id": "t_medical", "type": "medical", "x": 18.0, "y": 30.0, "width": 10.0, "height": 6.0, "label": "Pilgrim First-Aid Center"},

            # Exits
            {"id": "t_exit_e", "type": "exit_gate", "x": 108.0, "y": 62.0, "width": 2.0, "height": 10.0, "label": "East Pilgrims Exit"},
            {"id": "t_em_w", "type": "emergency_exit", "x": 2.0, "y": 55.0, "width": 2.0, "height": 8.0, "label": "West Emergency Egress Gate"}
        ]
    }

def get_rally_preset() -> Dict[str, Any]:
    return {
        "id": "rally_public_ground",
        "name": "Civic Rally & Mega Event Ground",
        "venue_type": "rally",
        "description": "Sprawling public rally arena featuring raised main podium stage, VIP barricade buffer, media risers, and rapid dispersal flanks.",
        "width": 140.0,
        "length": 90.0,
        "scale": 1.0,
        "elements": [
            # Main Stage
            {"id": "rally_stage", "type": "stage", "x": 70.0, "y": 78.0, "width": 35.0, "height": 14.0, "label": "Main Presidential Stage & Dais"},
            {"id": "vip_enclosure", "type": "vip_area", "x": 70.0, "y": 62.0, "width": 55.0, "height": 12.0, "label": "VIP & Dignitary Enclosure"},
            {"id": "media_riser", "type": "restricted", "x": 70.0, "y": 46.0, "width": 18.0, "height": 6.0, "label": "Media Broadcast Platform"},

            # Barricades separating pens
            {"id": "pen_barr_l", "type": "barricade", "x": 42.0, "y": 36.0, "width": 0.8, "height": 38.0, "label": "Sector Divider West"},
            {"id": "pen_barr_r", "type": "barricade", "x": 98.0, "y": 36.0, "width": 0.8, "height": 38.0, "label": "Sector Divider East"},

            # Entry & Safety
            {"id": "rally_gate_s1", "type": "entry_gate", "x": 45.0, "y": 2.0, "width": 14.0, "height": 2.0, "capacity_rate": 250.0, "label": "South Entrance Gate A"},
            {"id": "rally_gate_s2", "type": "entry_gate", "x": 95.0, "y": 2.0, "width": 14.0, "height": 2.0, "capacity_rate": 250.0, "label": "South Entrance Gate B"},
            {"id": "rally_em_w", "type": "emergency_exit", "x": 2.0, "y": 45.0, "width": 2.0, "height": 15.0, "label": "West Emergency Corridor"},
            {"id": "rally_em_e", "type": "emergency_exit", "x": 138.0, "y": 45.0, "width": 2.0, "height": 15.0, "label": "East Emergency Corridor"}
        ]
    }

def get_mall_preset() -> Dict[str, Any]:
    return {
        "id": "mall_grand_atrium",
        "name": "Grand Metropolis Shopping Center",
        "venue_type": "mall",
        "description": "Multi-anchor commercial shopping center with central atrium void, dual-wing corridors, escalators, and fire exits.",
        "width": 100.0,
        "length": 70.0,
        "scale": 1.0,
        "elements": [
            {"id": "mall_anchor_w", "type": "building", "x": 15.0, "y": 35.0, "width": 26.0, "height": 50.0, "label": "West Anchor Department Store"},
            {"id": "mall_anchor_e", "type": "building", "x": 85.0, "y": 35.0, "width": 26.0, "height": 50.0, "label": "East Anchor Department Store"},
            {"id": "mall_atrium", "type": "open_space", "x": 50.0, "y": 35.0, "width": 30.0, "height": 30.0, "label": "Central Skylight Atrium"},
            {"id": "mall_gate_s", "type": "entry_gate", "x": 50.0, "y": 2.0, "width": 12.0, "height": 2.0, "capacity_rate": 180.0, "label": "Main South Plaza Entry"},
            {"id": "mall_gate_n", "type": "exit_gate", "x": 50.0, "y": 68.0, "width": 12.0, "height": 2.0, "label": "North Promenade Exit"},
            {"id": "mall_fire_w", "type": "emergency_exit", "x": 2.0, "y": 35.0, "width": 2.0, "height": 6.0, "label": "Fire Staircase West"},
            {"id": "mall_fire_e", "type": "emergency_exit", "x": 98.0, "y": 35.0, "width": 2.0, "height": 6.0, "label": "Fire Staircase East"}
        ]
    }

def get_festival_preset() -> Dict[str, Any]:
    return {
        "id": "festival_carnival_park",
        "name": "Grand Cultural Festival & Fairground",
        "venue_type": "festival",
        "description": "Open-air festival arena with music stage, artisan pavilions, food village, and radial emergency escape routes.",
        "width": 120.0,
        "length": 85.0,
        "scale": 1.0,
        "elements": [
            {"id": "fest_stage", "type": "stage", "x": 60.0, "y": 72.0, "width": 28.0, "height": 12.0, "label": "Festival Live Stage"},
            {"id": "fest_food_court", "type": "food_stall", "x": 25.0, "y": 42.0, "width": 20.0, "height": 18.0, "label": "Food Truck Village"},
            {"id": "fest_craft_market", "type": "building", "x": 95.0, "y": 42.0, "width": 20.0, "height": 18.0, "label": "Artisan Craft Stalls"},
            {"id": "fest_entry_arch", "type": "entry_gate", "x": 60.0, "y": 2.0, "width": 16.0, "height": 2.0, "capacity_rate": 200.0, "label": "Grand Carnival Gateway"},
            {"id": "fest_em_1", "type": "emergency_exit", "x": 2.0, "y": 42.0, "width": 2.0, "height": 10.0, "label": "Emergency Gate 1"},
            {"id": "fest_em_2", "type": "emergency_exit", "x": 118.0, "y": 42.0, "width": 2.0, "height": 10.0, "label": "Emergency Gate 2"}
        ]
    }

ALL_PRESETS = {
    "stadium": get_stadium_preset,
    "railway": get_railway_preset,
    "temple": get_temple_preset,
    "rally": get_rally_preset,
    "mall": get_mall_preset,
    "festival": get_festival_preset
}
