
from zoneinfo import ZoneInfo
from google.adk.agents import LlmAgent
import datetime
import httpx
import json

# --- Async API Fetching Tool ---

# --- Time Tool ---

def get_current_time() -> dict:
    """Returns the current time in Thailand (Asia/Bangkok) as a formatted string.

    This tool takes no arguments.

    Returns:
        dict: status and report with time.
    """
    tz_identifier = "Asia/Bangkok"
    try:
        tz = ZoneInfo(tz_identifier)
        now = datetime.datetime.now(tz)
        report = f'The current time in Thailand (Asia/Bangkok) is {now.strftime("%Y-%m-%d %H:%M:%S %Z%z")}'
        return {"status": "success", "report": report}
    except Exception as e:
         return {
            "status": "error",
            "error_message": f"Could not determine time: {str(e)}"
        }


# --- PM2.5 Tool ---

def get_pm25_data(station_name: str) -> dict:
    """Fetches PM2.5 data for a specific station or province in Thailand.

    Args:
        station_name: The name of the station, province, or area to search for (e.g., "กรุงเทพ", "เชียงใหม่").

    Returns:
        dict: status and report with PM2.5 data.
    """
    url = "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php"
    try:
        # User requested to fetch every time, so no caching.
        with httpx.Client() as client:
            response = client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()

        stations = data.get("stations", [])
        found_stations = []

        search_term = station_name.lower()
        
        for station in stations:
            name_th = station.get("nameTH", "")
            area_th = station.get("areaTH", "")
            name_en = station.get("nameEN", "")
            area_en = station.get("areaEN", "")
            
            if (search_term in name_th.lower() or 
                search_term in area_th.lower() or 
                search_term in name_en.lower() or 
                search_term in area_en.lower()):
                
                aqi_data = station.get("AQILast", {})
                pm25_data = aqi_data.get("PM25", {})
                
                if pm25_data and pm25_data.get("value") != "-1":
                     found_stations.append({
                        "station": name_th,
                        "area": area_th,
                        "date": aqi_data.get("date"),
                        "time": aqi_data.get("time"),
                        "pm25": pm25_data.get("value"),
                        "aqi": pm25_data.get("aqi")
                    })

        if not found_stations:
             return {
                "status": "error",
                "error_message": f"ไม่พบข้อมูล PM2.5 สำหรับ '{station_name}' หรือไม่มีข้อมูล PM2.5 ในพื้นที่นั้น"
            }
        
        # Format the report
        report_lines = [f"ข้อมูล PM2.5 สำหรับ '{station_name}':"]
        for st in found_stations[:5]: # Limit to 5 results to avoid huge context
            report_lines.append(f"- สถานี: {st['station']} ({st['area']})")
            report_lines.append(f"  PM2.5: {st['pm25']} µg/m³ (AQI: {st['aqi']})")
            report_lines.append(f"  เวลา: {st['date']} {st['time']}")
            report_lines.append("")
        
        return {"status": "success", "report": "\n".join(report_lines)}

    except Exception as e:
        return {
            "status": "error",
            "error_message": f"เกิดข้อผิดพลาดในการดึงข้อมูล PM2.5: {str(e)}"
        }


# --- Agent Definition ---

INSTRUCTION_TEMPLATE = (
    "คุณเป็นผู้ช่วยที่มีความสามารถสามด้านหลัก:\n"
    "1. สนทนาทั่วไปและบอกเวลาปัจจุบัน\n"
    "2. จัดการข้อมูลส่วนตัวของผู้ใช้ (Data Chat) โดยใช้ข้อมูลจาก `{current_data}`\n"
    "3. รายงานค่าฝุ่น PM2.5 จากสถานีตรวจวัดต่างๆ\n\n"
    "**กฎทั่วไป:**\n"
    "- ตอบเป็นภาษาไทยเสมอ\n"
    "- นำเสนอข้อมูลให้ชัดเจนและเข้าใจง่าย\n\n"
    "**ส่วนที่ 1: การจัดการข้อมูลผู้ใช้ (Data Chat)**\n"
    "ข้อมูลปัจจุบัน: `{current_data}`\n"
    "ฟิลด์ที่มี: `{fields}`\n"
    "- หากผู้ใช้ขอแก้ไขข้อมูล ให้ตอบในรูปแบบ JSON เท่านั้น: {{\"reply\": \"ข้อความตอบกลับภาษาไทย\", \"edits\": {{\"field_name\": \"new_value\"}}}}\n"
    "- หากผู้ใช้ถามดูข้อมูล หรือคุยเล่นทั่วไป ให้ตอบ: {{\"reply\": \"ข้อความตอบกลับภาษาไทย\", \"edits\": null}}\n"
    "- กฎการแก้ไข: `salary` ต้องเป็นตัวเลข, `date_of_birth` ต้องเป็น YYYY-MM-DD, `name` ต้องเป็น string\n"
    "- ห้ามตอบข้อความอื่นนอก JSON หากเป็นการจัดการข้อมูล\n\n"
    "**ส่วนที่ 2: ข้อมูลทั่วไป, เวลา, และ PM2.5**\n"
    "หากผู้ใช้ถามเกี่ยวกับหัวข้อเหล่านี้ ให้ตอบเป็นข้อความปกติ (ไม่ต้องเป็น JSON) และปฏิบัติตามนี้:\n"
    "1. หากผู้ใช้ทักทาย ให้ตอบกลับและแนะนำตัวว่าทำอะไรได้บ้าง (สนทนาทั่วไป, เวลา, PM2.5, จัดการข้อมูล)\n"
    "2. หากถามเกี่ยวกับ **เวลา** หรือ **วันที่** ให้ใช้เครื่องมือ `get_current_time`\n"
    "3. หากถามเกี่ยวกับ **ค่าฝุ่น PM2.5** หรือ **คุณภาพอากาศ** ให้ใช้เครื่องมือ `get_pm25_data` โดยส่งชื่อจังหวัดหรือสถานีที่ผู้ใช้ระบุ (เช่น 'กรุงเทพ') ไปยัง function\n"
    "   - ถ้าผู้ใช้ไม่ได้ระบุสถานที่ ให้ถามกลับว่าต้องการทราบของที่ไหน\n"
    "4. **สำคัญ:** ใช้ข้อมูลจากเครื่องมือเท่านั้น ห้ามเดาข้อมูลเอง"
)

def create_agent(current_data: str = "{}", fields: str = "") -> LlmAgent:
    """Creates a new agent instance with the given data context."""
    formatted_instruction = INSTRUCTION_TEMPLATE.format(
        current_data=current_data,
        fields=fields
    )
    
    return LlmAgent(
        name="nbtc_center_agent", 
        model="gemini-2.0-flash", 
        description=(
             "ผู้ช่วยสำหรับตอบคำถามทั่วไป บอกเวลาปัจจุบัน และรายงานค่าฝุ่น PM2.5"
        ),
        instruction=formatted_instruction,
        tools=[get_current_time, get_pm25_data],
    )

# Default agent for testing/fallback
root_agent = create_agent(current_data="{}", fields="")
