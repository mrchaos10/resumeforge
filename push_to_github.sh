#!/bin/bash
# Usage: bash push_to_github.sh <GITHUB_TOKEN> <GITHUB_USERNAME>
TOKEN=$1
USERNAME=$2
REPO="resumeforge"

if [ -z "$TOKEN" ] || [ -z "$USERNAME" ]; then
  echo "Usage: bash push_to_github.sh <TOKEN> <USERNAME>"
  exit 1
fi

echo "==> Creating GitHub repo: $USERNAME/$REPO"
curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO\",\"description\":\"AI-powered LaTeX resume tailor — Overleaf-style editor with Gemma 4\",\"private\":false,\"auto_init\":false}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Repo URL:', d.get('html_url','Error:'+str(d)))"

echo "==> Initialising git and pushing..."
cd "$(dirname "$0")"
git init -q
git config user.email "resumeforge@deploy.local"
git config user.name "ResumeForge Deploy"
git add -A
git commit -qm "feat: initial ResumeForge app — LaTeX editor + Gemma 4 job tailor"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "https://$TOKEN@github.com/$USERNAME/$REPO.git"
git push -u origin main --force

echo ""
echo "========================================"
echo " ✓ Pushed to github.com/$USERNAME/$REPO"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Go to https://huggingface.co/new-space"
echo "  2. Name it: resumeforge"
echo "  3. SDK: Docker"
echo "  4. Link GitHub repo: $USERNAME/$REPO"
echo "  5. Your app will be live at:"
echo "     https://huggingface.co/spaces/<YOUR_HF_USERNAME>/resumeforge"
