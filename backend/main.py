from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
import httpx, os, re, json, subprocess, tempfile, shutil

app = FastAPI(title="ResumeForge API")
GEMMA_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent"

class ValidateKeyRequest(BaseModel):
    api_key: str

class ScrapeRequest(BaseModel):
    url: str
    api_key: str

class TailorRequest(BaseModel):
    latex_content: str
    job_info: dict
    api_key: str

class CompileRequest(BaseModel):
    latex_content: str
    filename: str = "resume"

async def call_gemma(api_key: str, prompt: str, max_tokens: int = 8192) -> str:
    endpoint = f"{GEMMA_URL}?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": max_tokens}}
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(endpoint, json=payload, headers={"Content-Type": "application/json"})
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Gemma API error: {resp.text[:400]}")
    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=500, detail=f"Unexpected Gemma response: {str(data)[:300]}")

def strip_fences(text: str) -> str:
    return re.sub(r"```(?:json|latex|tex)?|```", "", text).strip()

@app.post("/api/validate-key")
async def validate_key(req: ValidateKeyRequest):
    try:
        await call_gemma(req.api_key, "Say OK.", max_tokens=10)
        return {"valid": True, "message": "API key validated successfully"}
    except HTTPException as e:
        if e.status_code in (400, 401, 403):
            return {"valid": False, "message": "Invalid or unauthorised API key"}
        return {"valid": False, "message": e.detail}
    except Exception as e:
        return {"valid": False, "message": str(e)}

@app.post("/api/scrape-job")
async def scrape_job(req: ScrapeRequest):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"}
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            r = await client.get(req.url, headers=headers)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not fetch URL: {e}")
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail=f"URL returned HTTP {r.status_code}")
    html = r.text
    clean = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r"<style[^>]*>.*?</style>", " ", clean, flags=re.DOTALL|re.IGNORECASE)
    clean = re.sub(r"<[^>]+>", " ", clean)
    text = re.sub(r"\s{2,}", " ", clean).strip()[:7000]

    prompt = f"""Analyze this job posting and return ONLY a valid JSON object (no markdown, no explanation).
Keys required:
{{"job_title":"","company":"","location":"","employment_type":"","salary_range":"","sponsorship":"Yes|No|Not mentioned","sponsorship_details":"","summary":"","basic_qualifications":[],"preferred_qualifications":[],"key_skills":[],"responsibilities":[]}}

Job posting:
{text}"""
    raw = await call_gemma(req.api_key, prompt, max_tokens=2048)
    cleaned = strip_fences(raw)
    try:
        job_info = json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if m:
            job_info = json.loads(m.group())
        else:
            raise HTTPException(status_code=500, detail=f"Could not parse job JSON: {cleaned[:300]}")
    return {"job_info": job_info}

@app.post("/api/tailor-resume")
async def tailor_resume(req: TailorRequest):
    j = req.job_info
    prompt = f"""You are an expert resume writer and LaTeX developer.
Tailor the LaTeX resume below for this job. RULES:
1. Keep all personal info (name, email, phone, links) exactly as-is
2. Keep all education exactly as-is — no fabrication
3. Add/rewrite a tailored Summary section at the top
4. Rephrase experience bullets to echo job keywords naturally
5. Reorder Skills to prioritise what this job values
6. Do NOT invent jobs, degrees, or certifications
7. Output must be valid compilable LaTeX
8. Return ONLY the LaTeX — no explanation, no fences

JOB: {j.get('job_title')} at {j.get('company')}
SKILLS NEEDED: {', '.join(j.get('key_skills', []))}
BASIC QUALS: {'; '.join(j.get('basic_qualifications', []))}
PREFERRED: {'; '.join(j.get('preferred_qualifications', []))}

BASE RESUME:
{req.latex_content}"""
    raw = await call_gemma(req.api_key, prompt, max_tokens=8192)
    return {"tailored_latex": strip_fences(raw)}

@app.post("/api/compile-latex")
async def compile_latex(req: CompileRequest):
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "resume.tex")
        pdf_path = os.path.join(tmpdir, "resume.pdf")
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(req.latex_content)

        compiled = False
        last_output = ""
        for tectonic in [shutil.which("tectonic"), "/root/.local/bin/tectonic", "/usr/local/bin/tectonic"]:
            if tectonic and os.path.isfile(tectonic):
                r = subprocess.run([tectonic, "--outdir", tmpdir, tex_path],
                                   capture_output=True, text=True, timeout=120)
                last_output = r.stdout + r.stderr
                if r.returncode == 0 and os.path.exists(pdf_path):
                    compiled = True
                    break

        if not compiled and shutil.which("pdflatex"):
            for _ in range(2):
                r = subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_path],
                    capture_output=True, text=True, timeout=120)
                last_output = r.stdout + r.stderr
            if os.path.exists(pdf_path):
                compiled = True

        if not compiled:
            raise HTTPException(status_code=422,
                detail=f"LaTeX compilation failed:\n{last_output[-1500:]}")

        pdf_bytes = open(pdf_path, "rb").read()

    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.filename)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{safe}.pdf"'})

STATIC = "/app/static"
if os.path.exists(STATIC):
    assets = os.path.join(STATIC, "assets")
    if os.path.exists(assets):
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(STATIC, "index.html"))
