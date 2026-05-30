#!/usr/bin/env python3
"""Deploy dist/ to Firebase Hosting via REST API (no Firebase CLI needed)."""

import json, os, sys, hashlib, gzip, time
import urllib.request, urllib.error

# --- Config ---
PROJECT_ID = "essere-3fe6f"
SITE_ID = PROJECT_ID
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
SA_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase-sa-key.json")

def load_sa_key():
    with open(SA_KEY_PATH) as f:
        return json.load(f)

def get_access_token(sa):
    import jwt as _jwt
    raise ImportError
    # Won't use PyJWT – use google.auth instead

def get_access_token_google():
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
        creds = service_account.Credentials.from_service_account_file(
            SA_KEY_PATH,
            scopes=["https://www.googleapis.com/auth/firebase", "https://www.googleapis.com/auth/cloud-platform"]
        )
        creds.refresh(Request())
        return creds.token
    except ImportError:
        pass
    # Fallback: manual JWT
    import jwt
    sa = load_sa_key()
    now = int(time.time())
    payload = {
        "iss": sa["client_email"],
        "scope": "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform",
        "aud": sa["token_uri"],
        "iat": now,
        "exp": now + 3600,
    }
    signed = jwt.encode(payload, sa["private_key"], algorithm="RS256")
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed
    }).encode()
    req = urllib.request.Request(sa["token_uri"], data=data)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["access_token"]

def get_access_token_any():
    # Try google-auth first
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
        creds = service_account.Credentials.from_service_account_file(
            SA_KEY_PATH,
            scopes=["https://www.googleapis.com/auth/firebase", "https://www.googleapis.com/auth/cloud-platform"]
        )
        creds.refresh(Request())
        return creds.token
    except Exception:
        pass
    # Try PyJWT
    try:
        import jwt as pyjwt
        import urllib.parse
        sa = load_sa_key()
        now = int(time.time())
        payload = {
            "iss": sa["client_email"],
            "scope": "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform",
            "aud": sa["token_uri"],
            "iat": now,
            "exp": now + 3600,
        }
        signed = pyjwt.encode(payload, sa["private_key"], algorithm="RS256")
        data = urllib.parse.urlencode({
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": signed
        }).encode()
        req = urllib.request.Request(sa["token_uri"], data=data)
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())["access_token"]
    except Exception as e:
        print(f"Auth failed: {e}", file=sys.stderr)
        sys.exit(1)

def api(method, url, token, body=None, content_type="application/json"):
    headers = {"Authorization": f"Bearer {token}"}
    if content_type:
        headers["Content-Type"] = content_type
    data = json.dumps(body).encode() if body and content_type == "application/json" else body
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read()) if resp.status != 204 else {}
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)

def collect_files(dist):
    files = {}
    for root, _, names in os.walk(dist):
        for name in names:
            full = os.path.join(root, name)
            rel = "/" + os.path.relpath(full, dist).replace("\\", "/")
            with open(full, "rb") as f:
                content = f.read()
            gz = gzip.compress(content)
            sha = hashlib.sha256(gz).hexdigest()
            files[rel] = {"gz": gz, "sha": sha, "size": len(content)}
    return files

def main():
    print("Authenticating...")
    token = get_access_token_any()
    print("Collecting files...")
    files = collect_files(DIST_DIR)
    print(f"  {len(files)} files to deploy")

    base = f"https://firebasehosting.googleapis.com/v1beta1/sites/{SITE_ID}"

    # 1. Create version
    print("Creating version...")
    ver = api("POST", f"{base}/versions", token)
    ver_name = ver["name"]
    print(f"  Version: {ver_name}")

    # 2. Populate files
    print("Populating files...")
    file_map = {path: info["sha"] for path, info in files.items()}
    pop = api("POST", f"https://firebasehosting.googleapis.com/v1beta1/{ver_name}:populateFiles", token, {"files": file_map})
    to_upload = pop.get("uploadRequiredHashes", [])
    upload_url = pop.get("uploadUrl", "")
    print(f"  {len(to_upload)} files need uploading")

    # 3. Upload
    sha_to_gz = {info["sha"]: info["gz"] for info in files.values()}
    for i, sha in enumerate(to_upload):
        gz_data = sha_to_gz[sha]
        url = f"{upload_url}/{sha}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream",
        }
        req = urllib.request.Request(url, data=gz_data, headers=headers, method="POST")
        urllib.request.urlopen(req)
        print(f"  Uploaded {i+1}/{len(to_upload)}")

    # 4. Finalize
    print("Finalizing version...")
    api("PATCH", f"https://firebasehosting.googleapis.com/v1beta1/{ver_name}?update_mask=status", token, {"status": "FINALIZED"})

    # 5. Release
    print("Releasing...")
    api("POST", f"{base}/releases?versionName={ver_name}", token)
    print(f"\nDeployed to https://{SITE_ID}.web.app")

if __name__ == "__main__":
    main()
