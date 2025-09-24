"""
Roompot Accommodation Configuration
Defines accommodation types, parks, and crawling targets
"""

ACCOMMODATION_TYPES = {
    "beach_houses": {
        "park_id": "roompot-beach-resort", 
        "base_url": "https://www.roompot.de/parks/roompot-beach-resort/unterkuenfte/",
        "domain": "roompot.de",
        "language": "de",
        "accommodations": [
            {"name": "Beach House 4", "url_suffix": "beach-house-4", "capacity": 4},
            {"name": "Beach House 6A", "url_suffix": "beach-house-6a", "capacity": 6},
            {"name": "Beach House 6B", "url_suffix": "beach-house-6b", "capacity": 6}
        ]
    },
    # NEW: Lodge Water Village Support
    "lodges_water_village": {
        "park_id": "water-village",
        "base_url": "https://www.roompot.de/parks/water-village/unterkuenfte/",
        "domain": "roompot.de", 
        "language": "de",
        "accommodations": [
            {"name": "Lodge 4", "url_suffix": "lodge-4", "capacity": 4}
        ]
    }
}

def get_accommodation_url(category: str, accommodation: str) -> str:
    """Generates complete URL for an accommodation"""
    if category not in ACCOMMODATION_TYPES:
        raise ValueError(f"Unknown category: {category}")
        
    config = ACCOMMODATION_TYPES[category]
    accommodation_data = None
    
    for acc in config["accommodations"]:
        if acc["name"] == accommodation or acc["url_suffix"] == accommodation:
            accommodation_data = acc
            break
    
    if not accommodation_data:
        raise ValueError(f"Accommodation not found: {accommodation} in {category}")
        
    return config["base_url"] + accommodation_data["url_suffix"]

def get_all_accommodations():
    """Returns all available accommodations across all categories"""
    all_accommodations = []
    
    for category, config in ACCOMMODATION_TYPES.items():
        for accommodation in config["accommodations"]:
            all_accommodations.append({
                "category": category,
                "name": accommodation["name"],
                "url_suffix": accommodation["url_suffix"],
                "capacity": accommodation["capacity"],
                "park_id": config["park_id"],
                "full_url": config["base_url"] + accommodation["url_suffix"]
            })
    
    return all_accommodations