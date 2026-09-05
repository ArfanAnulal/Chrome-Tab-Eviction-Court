import io
import json
import uuid
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

# ReportLab PDF Generator Imports
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

app = FastAPI(title="Tab Courtroom Judge Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- WEBHOOK -----------------
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1545823430459400245/Tlo4zwGJaWMJmRqQLua7U5ZOcZNjJtCGcJ_VrtSR51-B06RfMS3aYFUE035-Q0V9JXMg"
# -----------------------------------------------------------

# In-memory case cache so the client can download its PDF order
CASE_ARCHIVE = {}

class CasePayload(BaseModel):
    tab_url: str
    tab_title: str
    plea_text: str

SYSTEM_PROMPT = """You are a ruthless, witty retro courtroom judge deciding if a user is guilty of procrastination or justified in closing their tab.

Respond ONLY with valid JSON matching this schema:
{
  "verdict": "GUILTY" or "INNOCENT",
  "sentence": "1-2 comedic, harsh, or forgiving sentences of judgment",
  "confidence": 0.95
}
"""

def send_discord_log(case_id: str, title: str, url: str, plea: str, verdict: str, sentence: str):
    if not DISCORD_WEBHOOK_URL or "YOUR_DISCORD" in DISCORD_WEBHOOK_URL:
        return

    is_guilty = "GUILTY" in verdict.upper()
    color = 0xFF0033 if is_guilty else 0x00FF66  # Red for GUILTY, Green for INNOCENT

    embed = {
        "title": f"⚖️ Court Docket Case #{case_id[:8]}",
        "description": f"**Verdict:** `{verdict}`\n\n> *\"{sentence}\"*",
        "color": color,
        "fields": [
            {"name": "Evicted Tab", "value": f"[{title}]({url})", "inline": False},
            {"name": "Defendant's Plea", "value": f"*{plea}*", "inline": False},
        ],
        "footer": {"text": "Local Ollama Llama-3.2:3b Courtroom Bailiff"}
    }

    try:
        requests.post(DISCORD_WEBHOOK_URL, json={"embeds": [embed]}, timeout=5)
    except Exception as e:
        print(f"[Discord Webhook Error]: {e}")

def create_court_order_pdf(case_id: str, case_data: dict) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Retro Document Border
    c.setLineWidth(3)
    c.setStrokeColor(colors.black)
    c.rect(36, 36, width - 72, height - 72)
    c.setLineWidth(1)
    c.rect(42, 42, width - 84, height - 84)

    # Header
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2.0, height - 90, "HIGH COURT OF PRODUCTIVITY EVICTION")
    c.setFont("Helvetica-Oblique", 11)
    c.drawCentredString(width / 2.0, height - 110, "OFFICIAL WARRANT & SUMMONS OF CONTEMPT")

    # Metadata Line
    c.setLineWidth(0.5)
    c.line(60, height - 125, width - 60, height - 125)
    c.setFont("Courier", 10)
    c.drawString(60, height - 145, f"CASE NUMBER : EVICT-{case_id[:8].upper()}")
    c.drawString(60, height - 160, f"DEFENDANT   : ACTIVE BROWSER USER")
    c.drawString(60, height - 175, f"EVICTED TAB : {case_data['tab_title'][:55]}")
    c.drawString(60, height - 190, f"TARGET URL  : {case_data['tab_url'][:55]}")

    # Charge & Plea
    c.line(60, height - 205, width - 60, height - 205)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(60, height - 230, "DEFENDANT PLEA / TESTIMONY:")
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(70, height - 250, f"\"{case_data['plea_text'][:75]}\"")

    # Verdict Box
    c.setFont("Helvetica-Bold", 12)
    c.drawString(60, height - 290, "FINAL JUDICIAL RULING:")
    
    verdict = case_data['verdict'].upper()
    if "GUILTY" in verdict:
        c.setFillColor(colors.HexColor("#cc0000"))
    else:
        c.setFillColor(colors.HexColor("#008800"))
    c.setFont("Helvetica-Bold", 26)
    c.drawString(60, height - 325, f">> {verdict} <<")

    # Sentence
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 11)
    c.drawString(60, height - 360, "OFFICIAL REASONING & PENALTY:")
    c.setFont("Courier", 10)
    c.drawString(70, height - 380, case_data['sentence'][:75])

    # Sarcastic Stamp
    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, 80, "BY ORDER OF: Ollama Llama-3.2:3b Chief Justice")
    c.drawString(60, 65, "STATUS     : BINDING IN ALL JURISDICTIONS")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()

@app.post("/judge")
def judge_case(case: CasePayload):
    prompt = (
        f"Tab Title: {case.tab_title}\n"
        f"Tab URL: {case.tab_url}\n"
        f"User Plea: {case.plea_text}\n"
    )

    try:
        res = requests.post(
            "http://127.0.0.1:11434/api/generate",
            json={
                "model": "llama3.2:3b",
                "system": SYSTEM_PROMPT,
                "prompt": prompt,
                "format": "json",
                "stream": False,
            },
            timeout=30,
        )
        res.raise_for_status()
        raw_response = res.json().get("response", "{}")
        verdict_data = json.loads(raw_response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama inference error: {str(e)}")

    case_id = str(uuid.uuid4())
    record = {
        "case_id": case_id,
        "tab_title": case.tab_title,
        "tab_url": case.tab_url,
        "plea_text": case.plea_text,
        "verdict": verdict_data.get("verdict", "UNKNOWN"),
        "sentence": verdict_data.get("sentence", "No statement."),
        "confidence": verdict_data.get("confidence", 0.95),
    }
    CASE_ARCHIVE[case_id] = record

    # Fire Discord log
    send_discord_log(
        case_id=case_id,
        title=record["tab_title"],
        url=record["tab_url"],
        plea=record["plea_text"],
        verdict=record["verdict"],
        sentence=record["sentence"]
    )

    return {
        "verdict": record["verdict"],
        "sentence": record["sentence"],
        "confidence": record["confidence"],
        "case_id": case_id,
        "pdf_download_url": f"http://127.0.0.1:8000/order/{case_id}.pdf"
    }

@app.get("/order/{case_id}.pdf")
def download_pdf(case_id: str):
    record = CASE_ARCHIVE.get(case_id)
    if not record:
        raise HTTPException(status_code=404, detail="Case record not found")
    
    pdf_bytes = create_court_order_pdf(case_id, record)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=court_order_{case_id[:8]}.pdf"}
    )