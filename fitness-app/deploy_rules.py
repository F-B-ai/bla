#!/usr/bin/env python3
"""Deploy Firestore and Storage security rules via REST API."""

import json
import time
import google.auth.transport.requests
from google.oauth2 import service_account

PROJECT_ID = "essere-3fe6f"
BUCKET = "essere-3fe6f.firebasestorage.app"
SA_KEY_FILE = "firebase-sa-key.json"
SCOPES = [
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
]

def get_access_token():
    creds = service_account.Credentials.from_service_account_file(SA_KEY_FILE, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token

def deploy_rules(access_token, rules_content, release_name):
    import urllib.request

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # Create ruleset
    ruleset_url = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/rulesets"

    # Determine file name based on release type
    if "firestore" in release_name:
        file_name = "firestore.rules"
    else:
        file_name = "storage.rules"

    ruleset_body = json.dumps({
        "source": {
            "files": [{
                "content": rules_content,
                "name": file_name,
            }]
        }
    }).encode()

    req = urllib.request.Request(ruleset_url, data=ruleset_body, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        ruleset_name = result["name"]
        print(f"  Ruleset creato: {ruleset_name}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  Errore creazione ruleset: {e.code} - {error_body}")
        return False

    # Release ruleset
    release_url = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases/{release_name}"

    # Try PATCH first (update existing release)
    release_body = json.dumps({
        "release": {
            "name": f"projects/{PROJECT_ID}/releases/{release_name}",
            "rulesetName": ruleset_name,
        }
    }).encode()

    req = urllib.request.Request(release_url, data=release_body, headers=headers, method="PATCH")
    try:
        urllib.request.urlopen(req)
        print(f"  Release aggiornata: {release_name}")
        return True
    except urllib.error.HTTPError:
        pass

    # If PATCH fails, try POST (create new release)
    releases_url = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases"
    release_body = json.dumps({
        "name": f"projects/{PROJECT_ID}/releases/{release_name}",
        "rulesetName": ruleset_name,
    }).encode()

    req = urllib.request.Request(releases_url, data=release_body, headers=headers, method="POST")
    try:
        urllib.request.urlopen(req)
        print(f"  Release creata: {release_name}")
        return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  Errore release: {e.code} - {error_body}")
        return False


def main():
    print("Autenticazione...")
    token = get_access_token()

    # Deploy Firestore rules
    print("\nDeploy regole Firestore...")
    with open("firestore.rules", "r") as f:
        firestore_rules = f.read()
    ok1 = deploy_rules(token, firestore_rules, "cloud.firestore")

    # Deploy Storage rules
    print("\nDeploy regole Storage...")
    with open("storage.rules", "r") as f:
        storage_rules = f.read()
    ok2 = deploy_rules(token, storage_rules, f"firebase.storage/{BUCKET}")

    if ok1 and ok2:
        print("\n✅ Tutte le regole deployate con successo!")
    elif ok1:
        print("\n⚠️  Solo Firestore deployato. Storage ha avuto errori.")
    elif ok2:
        print("\n⚠️  Solo Storage deployato. Firestore ha avuto errori.")
    else:
        print("\n❌ Errore nel deploy delle regole.")


if __name__ == "__main__":
    main()
