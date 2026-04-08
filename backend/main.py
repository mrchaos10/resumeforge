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
    raw_text: str = ""  # fallback: user can paste job text directly

class TailorRequest(BaseModel):
    latex_content: str
    job_info: dict
    api_key: str

class CompileRequest(BaseModel):
    latex_content: str
    filename: str = "resume"

async def call_gemma(api_key: str, prompt: str, max_tokens: int = 8192) -> str:
    endpoint = f"{GEMMA_URL}?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": max_tokens}
    }
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

def html_to_text(html: str) -> str:
    """Strip HTML tags and clean whitespace."""
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()

def extract_json(text: str) -> dict:
    """Try multiple strategies to extract JSON from Gemma response."""
    cleaned = strip_fences(text)
    # Strategy 1: direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Strategy 2: find first { ... } block
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    # Strategy 3: extract key-value pairs manually as fallback
    raise ValueError(f"Could not extract JSON. Raw response: {cleaned[:500]}")

LINKEDIN_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

def convert_linkedin_url(url: str) -> list[str]:
    """Convert LinkedIn job URL to multiple formats to try."""
    urls_to_try = [url]
    # Extract job ID
    m = re.search(r"/jobs/view/(\d+)", url)
    if m:
        job_id = m.group(1)
        # Public-facing formats that don't require login
        urls_to_try += [
            f"https://www.linkedin.com/jobs/view/{job_id}/",
            f"https://linkedin.com/jobs/view/{job_id}/",
        ]
    return urls_to_try

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
    text = ""

    # If user pasted raw text directly, use that
    if req.raw_text and len(req.raw_text.strip()) > 100:
        text = req.raw_text.strip()[:8000]
    else:
        # Try scraping the URL
        url = req.url.strip()
        is_linkedin = "linkedin.com" in url

        urls_to_try = convert_linkedin_url(url) if is_linkedin else [url]
        last_error = ""
        raw_html = ""

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for try_url in urls_to_try:
                try:
                    r = await client.get(try_url, headers=LINKEDIN_HEADERS)
                    if r.status_code == 200:
                        raw_html = r.text
                        break
                    else:
                        last_error = f"HTTP {r.status_code}"
                except Exception as e:
                    last_error = str(e)

        if not raw_html:
            raise HTTPException(
                status_code=400,
                detail=f"Could not fetch the job URL ({last_error}). "
                       f"{'LinkedIn requires login for this posting. Please paste the job description text directly into the text box instead.' if is_linkedin else 'Please check the URL or paste the job description text directly.'}"
            )

        text = html_to_text(raw_html)

        # Check if we got blocked (LinkedIn login wall)
        if is_linkedin and any(phrase in text.lower() for phrase in [
            "join now", "sign in", "authwall", "join linkedin", "be the first to see"
        ]):
            raise HTTPException(
                status_code=403,
                detail="LinkedIn is blocking automated access to this job posting. "
                       "Please copy the full job description text from LinkedIn and paste it directly into the text box instead of the URL."
            )

        if len(text) < 200:
            raise HTTPException(
                status_code=400,
                detail="Could not extract enough text from this URL. Please paste the job description text directly."
            )

        text = text[:8000]

    # Now parse with Gemma
    prompt = f"""You are a job posting analyzer. Extract structured information and return ONLY a valid JSON object.
No markdown fences, no explanation — raw JSON only.

Return exactly this structure:
{{
  "job_title": "string",
  "company": "string",
  "location": "string",
  "employment_type": "Full-time | Part-time | Contract | Internship | Other",
  "salary_range": "string or Not mentioned",
  "sponsorship": "Yes | No | Not mentioned",
  "sponsorship_details": "brief explanation of sponsorship status",
  "summary": "2-3 sentence description of the role",
  "basic_qualifications": ["list of must-have requirements"],
  "preferred_qualifications": ["list of nice-to-have requirements"],
  "key_skills": ["list of technical and soft skills"],
  "responsibilities": ["list of key job duties"]
}}

Job posting text:
{text}

Return ONLY the JSON object:"""

    raw = await call_gemma(req.api_key, prompt, max_tokens=2048)

    try:
        job_info = extract_json(raw)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

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
