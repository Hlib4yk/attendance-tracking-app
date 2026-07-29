#!/usr/bin/env python3.10
"""
Знаходить студентів у БД без faceEmbedding але з profilePhotoUrl,
читає їх фото з диска, відправляє у face-service /v1/embed
і записує отриманий вектор назад у БД.

Запускати після додавання FACE_SERVICE_URL у backend/.env
і перезапуску бекенду.

Usage:
    python3 scripts/regenerate_embeddings.py
"""

import os
import sys
import json
import psycopg2
import requests
from pathlib import Path

FACE_SERVICE = "http://localhost:8787"
BACKEND_DIR  = Path(__file__).parent.parent / "backend"
UPLOADS_DIR  = BACKEND_DIR / "uploads"

DB_DSN = "postgresql://diploma:diploma_secret@localhost:5432/diploma"


def check_face_service():
    try:
        r = requests.get(f"{FACE_SERVICE}/health", timeout=3)
        if not r.ok:
            raise RuntimeError(f"HTTP {r.status_code}")
    except Exception as e:
        print(f"ERROR: face-service недоступний на {FACE_SERVICE}: {e}")
        print("Запустіть:  docker compose up face-service")
        sys.exit(1)
    print(f"  face-service OK ({FACE_SERVICE})")


def get_students_without_embedding(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT s.id, s."profilePhotoUrl", u.name, u.email
            FROM   "Student" s
            JOIN   "User"    u ON u.id = s."userId"
            WHERE  s."faceEmbedding" IS NULL
              AND  s."profilePhotoUrl" IS NOT NULL
            ORDER BY u.name
        """)
        return cur.fetchall()


def get_embed(photo_path: Path) -> list[float] | None:
    if not photo_path.exists():
        return None
    mime = "image/jpeg"
    if photo_path.suffix.lower() == ".png":
        mime = "image/png"
    elif photo_path.suffix.lower() == ".webp":
        mime = "image/webp"

    with open(photo_path, "rb") as f:
        r = requests.post(
            f"{FACE_SERVICE}/v1/embed",
            files={"image": (photo_path.name, f, mime)},
            timeout=30,
        )
    if r.status_code == 400:
        return None  # no face detected
    r.raise_for_status()
    data = r.json()
    return data.get("embedding")


def save_embedding(conn, student_id: str, embedding: list[float]):
    with conn.cursor() as cur:
        cur.execute(
            'UPDATE "Student" SET "faceEmbedding" = %s WHERE id = %s',
            (json.dumps(embedding), student_id),
        )
    conn.commit()


def main():
    print("=== Regenerate Face Embeddings ===\n")
    check_face_service()

    try:
        conn = psycopg2.connect(DB_DSN)
    except Exception as e:
        print(f"ERROR: Не вдалося підключитись до БД: {e}")
        sys.exit(1)

    students = get_students_without_embedding(conn)

    if not students:
        print("Всі студенти вже мають embedding — нічого робити.")
        conn.close()
        return

    print(f"Знайдено {len(students)} студентів без embedding:\n")

    ok = skip = fail = 0

    for student_id, photo_url, name, email in students:
        # photo_url is like "/uploads/students/reg-1234567890.jpeg"
        relative = photo_url.lstrip("/")
        photo_path = BACKEND_DIR / relative

        print(f"  [{name}] ({email})")
        print(f"    фото: {photo_path}")

        if not photo_path.exists():
            print(f"    SKIP — файл не знайдено")
            skip += 1
            print()
            continue

        try:
            embedding = get_embed(photo_path)
        except Exception as e:
            print(f"    FAIL — face-service помилка: {e}")
            fail += 1
            print()
            continue

        if not embedding:
            print(f"    SKIP — обличчя не виявлено у фото (спробуйте інше фото)")
            skip += 1
            print()
            continue

        save_embedding(conn, student_id, embedding)
        print(f"    OK — embedding збережено ({len(embedding)} dims)")
        ok += 1
        print()

    conn.close()

    print("=" * 40)
    print(f"Готово: {ok} оновлено, {skip} пропущено, {fail} помилок")

    if ok > 0:
        print("\nПерезавантажте сторінку та завантажте фото аудиторії знову.")
        print("Тепер система буде використовувати реальне розпізнавання (InsightFace).")

    if skip > 0:
        print(f"\nДля студентів без обличчя — перезареєструйте їх через UI з чітким фото.")


if __name__ == "__main__":
    main()
