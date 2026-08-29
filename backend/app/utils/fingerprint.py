from typing import Optional, Dict

def check_fingerprint_match(stored_fp: Optional[Dict], current_fp: Dict) -> bool:
    """
    Compares stored fingerprint with current fingerprint.
    Uses device_id as primary stable identifier.
    Returns True if matches or if no stored fingerprint exists yet, False otherwise.
    """
    if not stored_fp:
        return True
        
    stored_device_id = stored_fp.get("device_id")
    current_device_id = current_fp.get("device_id")

    # If device_id is present in both, match by device_id (stable PWA UUID)
    if stored_device_id and current_device_id:
        return stored_device_id == current_device_id

    # Fallback to key factors (ignoring dynamic screen_resolution variations)
    stored_tz = stored_fp.get("timezone")
    current_tz = current_fp.get("timezone")

    if stored_tz and current_tz and stored_tz != current_tz:
        return False

    return True
