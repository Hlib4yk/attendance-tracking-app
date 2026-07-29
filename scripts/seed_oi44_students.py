#!/usr/bin/env python3
"""
Bulk-registers students from the OI_44 dataset folder into the system.

For each student:
  - picks the FIRST photo as the enrollment/profile image
  - remaining photos can be used for manual recognition testing

Usage:
    python3 scripts/seed_oi44_students.py

Requirements:
    - Backend running on http://localhost:3001
    - Face-service running on http://localhost:8787
    - Admin credentials: admin@univ.edu / Password123!
    - Run `cd backend && npx prisma db seed` first to create the OI-44 group
"""

import os
import sys
import json
import requests

BACKEND = "http://localhost:3001"
DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "OI_44")
ADMIN_EMAIL = "admin@univ.edu"
ADMIN_PASSWORD = "Password123!"
STUDENT_PASSWORD = "Student1234!"
GROUP_NAME = "ОІ-44"


def login_admin() -> str:
    r = requests.post(f"{BACKEND}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if not r.ok:
        print(f"  Admin login failed: {r.status_code} {r.text}")
        sys.exit(1)
    token = r.json()["access_token"]
    print(f"  Logged in as {ADMIN_EMAIL}")
    return token


def find_group_id(token: str) -> str:
    r = requests.get(f"{BACKEND}/admin/groups", headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    groups = r.json()
    for g in groups:
        if g["name"] == GROUP_NAME:
            print(f"  Found group '{GROUP_NAME}': {g['id']}")
            return g["id"]

    # Create if not found
    r = requests.post(
        f"{BACKEND}/admin/groups",
        json={"name": GROUP_NAME},
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    gid = r.json()["id"]
    print(f"  Created group '{GROUP_NAME}': {gid}")
    return gid


def folder_to_name(folder: str) -> str:
    return folder.replace("_", " ")


def folder_to_email(folder: str) -> str:
    return folder.lower().replace("_", ".") + "@oi44.test"


def get_photos(student_dir: str) -> list[str]:
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    photos = sorted(
        [f for f in os.listdir(student_dir) if os.path.splitext(f.lower())[1] in exts]
    )
    return [os.path.join(student_dir, p) for p in photos]


def register_student(name: str, email: str, group_id: str, photo_path: str) -> dict:
    mime = "image/jpeg"
    if photo_path.lower().endswith(".png"):
        mime = "image/png"
    elif photo_path.lower().endswith(".webp"):
        mime = "image/webp"

    with open(photo_path, "rb") as f:
        r = requests.post(
            f"{BACKEND}/auth/register/student",
            data={"name": name, "email": email, "password": STUDENT_PASSWORD, "groupId": group_id},
            files={"image": (os.path.basename(photo_path), f, mime)},
        )
    return r


def main():
    print("=== OI-44 Dataset Seeder ===\n")

    # Check backend is up
    try:
        requests.get(f"{BACKEND}/health", timeout=3)
    except Exception:
        print(f"ERROR: Backend is not reachable at {BACKEND}")
        print("Start it with:  cd backend && npm run start:dev")
        sys.exit(1)

    token = login_admin()
    group_id = find_group_id(token)

    dataset_path = os.path.abspath(DATASET_DIR)
    if not os.path.isdir(dataset_path):
        print(f"ERROR: Dataset folder not found: {dataset_path}")
        sys.exit(1)

    student_folders = sorted([
        d for d in os.listdir(dataset_path)
        if os.path.isdir(os.path.join(dataset_path, d)) and not d.startswith(".")
    ])

    print(f"\nFound {len(student_folders)} students in dataset:\n")

    results = {"ok": [], "skip": [], "fail": []}

    for folder in student_folders:
        name = folder_to_name(folder)
        email = folder_to_email(folder)
        student_dir = os.path.join(dataset_path, folder)
        photos = get_photos(student_dir)

        if not photos:
            print(f"  [{folder}] SKIP — no photos found")
            results["skip"].append(folder)
            continue

        enrollment_photo = photos[0]
        extra_photos = photos[1:]

        print(f"  [{name}]")
        print(f"    email:    {email}")
        print(f"    enroll:   {os.path.basename(enrollment_photo)}")
        if extra_photos:
            print(f"    test photos ({len(extra_photos)}): {', '.join(os.path.basename(p) for p in extra_photos)}")

        r = register_student(name, email, group_id, enrollment_photo)

        if r.ok:
            print(f"    STATUS: OK (registered)")
            results["ok"].append({"name": name, "email": email, "password": STUDENT_PASSWORD})
        elif r.status_code == 409:
            print(f"    STATUS: already registered (skipped)")
            results["skip"].append(folder)
        else:
            try:
                err = r.json().get("message") or r.text
            except Exception:
                err = r.text
            print(f"    STATUS: FAILED ({r.status_code}) — {err}")
            results["fail"].append({"folder": folder, "error": err})
        print()

    print("=" * 40)
    print(f"Done: {len(results['ok'])} registered, {len(results['skip'])} skipped, {len(results['fail'])} failed\n")

    if results["ok"]:
        print("Registered students (login credentials):")
        for s in results["ok"]:
            print(f"  {s['email']}  /  {STUDENT_PASSWORD}")

    if results["fail"]:
        print("\nFailed:")
        for f in results["fail"]:
            print(f"  {f['folder']}: {f['error']}")

    # Save summary
    summary_path = os.path.join(os.path.dirname(__file__), "oi44_seed_result.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "group": GROUP_NAME,
                "group_id": group_id,
                "password": STUDENT_PASSWORD,
                "students": results["ok"],
                "skipped": results["skip"],
                "failed": results["fail"],
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"\nSummary saved to: {summary_path}")


if __name__ == "__main__":
    main()
