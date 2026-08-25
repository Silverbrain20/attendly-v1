from typing import Optional, Dict

def check_fingerprint_match(stored_fp: Optional[Dict], current_fp: Dict) -> bool:
    """
    Compares stored advisory fingerprint with current fingerprint.
    Returns True if matches or if no stored fingerprint exists yet, False otherwise.
    """
    if not stored_fp:
        return True
        
    # Check key factors
    stored_ua = stored_fp.get("user_agent")
    stored_res = stored_fp.get("screen_resolution")
    stored_tz = stored_fp.get("timezone")

    current_ua = current_fp.get("user_agent")
    current_res = current_fp.get("screen_resolution")
    current_tz = current_fp.get("timezone")

    # If any core component changes, flag a mismatch
    if stored_ua != current_ua or stored_res != current_res or stored_tz != current_tz:
        return False

    return True
