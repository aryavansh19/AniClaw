import os
import time
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
from downloader import download_episode
from drive_manager import upload_to_drive, grant_drive_permission

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

BUFFER_SECONDS = 3600
CHECK_INTERVAL = 900

WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_ID")

def send_whatsapp_reminder(to_phone, message):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}", "Content-Type": "application/json"}
    payload = {"messaging_product": "whatsapp", "to": to_phone, "type": "text", "text": {"body": message}}

    res = requests.post(url, json=payload, headers=headers)
    print(f"WhatsApp API Response for {to_phone}: {res.status_code} - {res.text}")

def get_anilist_update(aid):
    query = 'query ($id: Int) { Media (id: $id) { status nextAiringEpisode { airingAt episode } } }'
    try:
        res = requests.post('https://graphql.anilist.co', json={'query': query, 'variables': {'id': aid}})
        return res.json().get('data', {}).get('Media', {})
    except Exception as e:
        print(f"Error fetching AniList update: {e}")
        return {}

def run_rotation():
    now = int(time.time())
    print(f"\nScout Heartbeat: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    ready_to_fetch = supabase.table("anime").select("*").eq("status", "waiting").lte("next_airing_at",
                                                                                     now - BUFFER_SECONDS).execute()

    for anime in ready_to_fetch.data:
        print(f"Timer finished for {anime['title']}! Locking for fetch.")
        supabase.table("anime").update({"status": "fetching"}).eq("anilist_id", anime['anilist_id']).execute()

    queue = supabase.table("anime").select("*").eq("status", "fetching").execute()

    for anime in queue.data:
        title = anime['title']
        aid = anime['anilist_id']
        target_ep = anime['last_ep'] + 1

        print(f"Processing: {title} (Target: Ep {target_ep})")

        download_success = download_episode(title, target_ep)

        if download_success:
            print(f"SUCCESS: {title} Ep {target_ep} downloaded. Uploading to Drive...")

            clean_title = "".join(x for x in title if x.isalnum() or x in "._- ")
            file_path = f"downloads/{clean_title}/{clean_title}_Ep{target_ep}.mp4"
            folder_id = "1cUPUXZRHlfPrJxA1e2NjjWhH60GW6gC5"

            try:
                drive_file_id = upload_to_drive(file_path, folder_id)
                print(f"Upload complete! File ID: {drive_file_id}")

                os.remove(file_path)
                print(f"Cleaned up local file: {file_path}")

            except Exception as e:
                print(f"Drive upload failed: {e}")
                continue

            subs = supabase.table("subs").select("user_id").eq("anilist_id", aid).execute()
            print(f"Found {len(subs.data)} subscribers for {title}.")

            for sub in subs.data:
                user_record = supabase.table("users").select("whatsapp_number, email").eq("id", sub['user_id']).execute()

                if user_record.data:
                    phone = user_record.data[0].get('whatsapp_number')
                    email = user_record.data[0].get('email')

                    if email:
                        grant_drive_permission(drive_file_id, email)
                        print(f"Granted Drive access to {email}")
                    else:
                        print(f"WARNING: No email found for User ID {sub['user_id']}. Cannot grant Drive access.")

                    if phone:
                        print(f"Attempting to send message to: {phone}")
                        msg = f"✅ *Download Complete!*\n\n*{title}* Episode {target_ep} has been successfully downloaded.\n\nPrivate access has been granted to your email. Watch it here:\nhttps://drive.google.com/file/d/{drive_file_id}/view"
                        send_whatsapp_reminder(phone, msg)
                else:
                    print(f"WARNING: User ID {sub['user_id']} not found in the users table.")

            ani_data = get_anilist_update(aid)
            next_air = ani_data.get('nextAiringEpisode')

            if next_air:
                print(f"Resetting clock for {title} Episode {next_air['episode']}...")
                supabase.table("anime").update({
                    "status": "waiting",
                    "last_ep": target_ep,
                    "next_airing_at": next_air['airingAt']
                }).eq("anilist_id", aid).execute()
            else:
                print(f"{title} has finished airing! Archiving.")
                supabase.table("anime").update({
                    "status": "completed",
                    "last_ep": target_ep,
                    "next_airing_at": 2147483647
                }).eq("anilist_id", aid).execute()

        else:
            print(f"{title} Ep {target_ep} not ready yet. Retrying next heartbeat...")

    tba_queue = supabase.table("anime").select("*").eq("status", "tba").execute()
    for anime in tba_queue.data:
        ani_data = get_anilist_update(anime['anilist_id'])
        next_air = ani_data.get('nextAiringEpisode')

        if next_air:
            print(f"Release date announced for {anime['title']}! Moving to waiting schedule.")
            supabase.table("anime").update({
                "status": "waiting",
                "next_airing_at": next_air['airingAt']
            }).eq("anilist_id", anime['anilist_id']).execute()

if __name__ == "__main__":
    print("Ani-Claw Scout Engine Online...")
    while True:
        try:
            run_rotation()
        except Exception as e:
            print(f"Critical Rotation Error: {e}")

        print(f"Sleeping for {CHECK_INTERVAL // 60} minutes...")
        time.sleep(CHECK_INTERVAL)