import os
import requests
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from supabase import create_client
from datetime import datetime
import uvicorn

load_dotenv()

app = FastAPI()

WHATSAPP_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_ID")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

active_verifications = {}

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def format_timestamp(ts):
    if not ts or ts == 2147483647:
        return None
    dt = datetime.fromtimestamp(ts)
    return dt.strftime("%B %d at %I:%M %p")


def get_anilist_info(name: str):
    query = '''query ($s: String) { 
        Page(perPage: 5) { 
            media(search: $s, type: ANIME) { 
                id 
                title { romaji } 
                episodes 
                status 
                coverImage { large } 
                nextAiringEpisode { episode airingAt } 
            } 
        } 
    }'''
    try:
        res = requests.post('https://graphql.anilist.co', json={'query': query, 'variables': {'s': name}})
        return res.json().get('data', {}).get('Page', {}).get('media', [])
    except Exception as e:
        print(f"AniList Search Error: {e}")
        return []


def get_user_by_phone(phone: str):
    try:
        res = supabase.table("users").select("id").eq("whatsapp_number", phone).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]['id']
        return None
    except Exception as e:
        print(f"User Lookup Error: {e}")
        return None


def send_whatsapp_reply(to, text):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text}
    }
    requests.post(url, json=payload, headers=headers)


def trigger_welcome_message(to_phone, user_name):
    msg = (
        f"🎉 *Account Linked successfully!*\n\n"
        f"Welcome aboard, {user_name}.\n\n"
        f"We will automatically notify you here with private Google Drive links the moment your tracked episodes drop.\n\n"
        f"Happy watching!"
    )
    send_whatsapp_reply(to_phone, msg)


def fetch_single_anime(anilist_id: int):
    query = '''query ($id: Int) { Media(id: $id, type: ANIME) { 
        id title { romaji } episodes status coverImage { large }
        nextAiringEpisode { episode airingAt }
    } }'''
    try:
        res = requests.post('https://graphql.anilist.co', json={'query': query, 'variables': {'id': anilist_id}})
        return res.json().get('data', {}).get('Media')
    except Exception as e:
        print(f"Fetch Error: {e}")
        return None


def process_anime_tracking(anilist_id: int, user_id: str):
    if not user_id:
        return {"success": False, "message": "User not found. Register your number on the site."}

    existing = supabase.table("subs").select("*").eq("user_id", user_id).eq("anilist_id", anilist_id).execute()
    if existing.data:
        return {"success": False, "message": "You are already tracking this anime! 📅"}

    query = '''query ($id: Int) { Media(id: $id, type: ANIME) { 
        id title { romaji } episodes status coverImage { large }
        nextAiringEpisode { episode airingAt } 
    } }'''
    res = requests.post('https://graphql.anilist.co', json={'query': query, 'variables': {'id': anilist_id}})
    sel = res.json().get('data', {}).get('Media')

    if not sel:
        return {"success": False, "message": "Anime details not found"}

    title = sel['title']['romaji']
    img = sel['coverImage']['large']
    ani_status = sel.get('status')

    if ani_status == 'FINISHED':
        return {
            "success": False,
            "message": f"*{title}* has already finished airing! 🍿\nAni-Claw is designed to remind you about *upcoming* episodes, so you don't need to track this one. Enjoy the binge!"
        }

    next_data = sel.get('nextAiringEpisode')

    if next_data:
        current_ep = next_data['episode'] - 1
        airing_timestamp = next_data['airingAt']
        engine_status = "waiting"
    else:
        current_ep = sel.get('episodes') or 0
        airing_timestamp = 2147483647
        engine_status = "tba"

    supabase.table("anime").upsert({
        "anilist_id": anilist_id,
        "title": title,
        "image_url": img,
        "last_ep": current_ep,
        "next_airing_at": airing_timestamp,
        "status": engine_status
    }).execute()

    supabase.table("subs").insert({
        "user_id": user_id,
        "anilist_id": anilist_id
    }).execute()

    return {"success": True, "title": title, "current_ep": current_ep, "next_airing_at": airing_timestamp}


@app.get("/api/verify/stream/{session_code}")
async def stream_verification(request: Request, session_code: str):
    queue = asyncio.Queue()
    active_verifications[session_code] = queue

    async def event_publisher():
        try:
            while True:
                if await request.is_disconnected():
                    break
                data = await queue.get()
                yield f"data: {data}\n\n"
                if data == "SUCCESS":
                    break
        finally:
            active_verifications.pop(session_code, None)

    return StreamingResponse(event_publisher(), media_type="text/event-stream")


@app.get("/webhook")
async def verify_webhook(mode: str = Query(None, alias="hub.mode"), token: str = Query(None, alias="hub.verify_token"),
                         challenge: str = Query(None, alias="hub.challenge")):
    if mode == "subscribe" and token == VERIFY_TOKEN:
        return Response(content=challenge, status_code=200)
    return Response(content="Verification failed", status_code=403)


@app.post("/webhook")
async def handle_whatsapp_message(request: Request):
    data = await request.json()

    if data.get("object") == "whatsapp_business_account":
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                messages = value.get("messages", [])

                if not messages: continue

                msg = messages[0]
                sender_phone = msg.get("from")
                msg_type = msg.get("type")

                if msg_type == "text":
                    query_text = msg["text"]["body"].strip()

                    if query_text.lower().startswith("verify-"):
                        session_code = query_text.split("-")[1]

                        if session_code in active_verifications:
                            await active_verifications[session_code].put("SUCCESS")
                            send_whatsapp_reply(sender_phone,
                                                "✅ Number verified! Please return to the website to complete signup.")
                        else:
                            send_whatsapp_reply(sender_phone,
                                                "❌ Verification session expired or invalid. Please try again from the website.")

                        continue

                user_id = get_user_by_phone(sender_phone)

                if not user_id:
                    unregistered_msg = (
                        "👋 *Welcome to Ani-Claw!*\n\n"
                        "It looks like this number isn't registered yet.\n\n"
                        "To start tracking your favorite anime and receiving instant downloads, please create an account here:\n"
                        "🔗 https://your-website.com/signup"
                    )
                    send_whatsapp_reply(sender_phone, unregistered_msg)
                    continue

                if msg_type == "text":
                    results = get_anilist_info(query_text)

                    if results:
                        send_interactive_list(sender_phone, results)
                    else:
                        send_whatsapp_reply(sender_phone, "❌ No anime found. Try another name!")

                elif msg_type == "interactive":
                    interactive_data = msg["interactive"]

                    if interactive_data["type"] == "list_reply":
                        list_id = interactive_data["list_reply"]["id"]

                        if list_id.startswith("select_"):
                            anilist_id = int(list_id.split("_")[1])
                            anime_data = fetch_single_anime(anilist_id)
                            if anime_data:
                                send_interactive_image_card(sender_phone, anime_data)
                            else:
                                send_whatsapp_reply(sender_phone, "❌ Error loading image details.")

                    elif interactive_data["type"] == "button_reply":
                        btn_id = interactive_data["button_reply"]["id"]

                        if btn_id.startswith("track_"):
                            anilist_id = int(btn_id.split("_")[1])
                            tracking_res = process_anime_tracking(anilist_id, user_id)

                            if tracking_res["success"]:
                                title = tracking_res['title']
                                next_air = tracking_res.get('next_airing_at')

                                if next_air and next_air != 2147483647:
                                    air_date = format_timestamp(next_air)
                                    reply_msg = f"🎉 *{title}* added!\n\n⏰ Reminder set: I will notify you as soon as the next episode drops on *{air_date}*."
                                else:
                                    reply_msg = f"🎉 *{title}* added to your dashboard!\n\n🍿 This show is fully released. No reminders needed—enjoy your binge-watching!"

                                send_whatsapp_reply(sender_phone, reply_msg)
                            else:
                                send_whatsapp_reply(sender_phone, f"⚠️ {tracking_res['message']}")

                        elif btn_id == "cancel":
                            send_whatsapp_reply(sender_phone,
                                                "Search canceled. Text me another name whenever you're ready!")

    return Response(content="EVENT_RECEIVED", status_code=200)


def send_interactive_list(to, results):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}

    rows = []
    for anime in results[:5]:
        rows.append({
            "id": f"select_{anime['id']}",
            "title": anime['title']['romaji'][:24],
            "description": f"Status: {anime.get('status', 'Unknown')}"
        })

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "list",
            "header": {"type": "text", "text": "Scout Found Matches"},
            "body": {"text": "Select an anime to view its details:"},
            "footer": {"text": "Ani-Claw Scout"},
            "action": {
                "button": "View Options",
                "sections": [{"title": "Search Results", "rows": rows}]
            }
        }
    }
    requests.post(url, json=payload, headers=headers)


def send_interactive_image_card(to, anime):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}

    title = anime['title']['romaji']
    image_url = anime['coverImage']['large']
    anilist_id = str(anime['id'])
    status = anime.get('status', 'Unknown')
    total_eps = anime.get('episodes') or '?'
    next_air = anime.get('nextAiringEpisode')

    if status == 'FINISHED':
        details = f"📺 All {total_eps} episodes are released!\n🍿 Ready to binge."
    elif next_air:
        last_ep = next_air['episode'] - 1
        next_ep = next_air['episode']
        air_date = format_timestamp(next_air['airingAt'])
        details = f"▶️ Last Ep: {last_ep}\n⏳ Next Ep ({next_ep}) Airs: {air_date}"
    elif status == 'NOT_YET_RELEASED':
        details = "📅 Not Yet Released\nAdd to track when it premieres!"
    else:
        details = f"Total Episodes: {total_eps}\nStatus: {status}"

    body_text = f"*{title}*\n\n{details}\n\nDo you want to track this?"

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "header": {"type": "image", "image": {"link": image_url}},
            "body": {"text": body_text},
            "footer": {"text": "Ani-Claw Scout"},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": {"id": f"track_{anilist_id}", "title": "✅ Confirm & Track"}},
                    {"type": "reply", "reply": {"id": "cancel", "title": "❌ Cancel"}}
                ]
            }
        }
    }
    requests.post(url, json=payload, headers=headers)


@app.post("/api/track/web")
async def track_from_web(request: Request):
    data = await request.json()
    return process_anime_tracking(data['anilist_id'], data['user_id'])


@app.post("/api/user/welcome")
async def welcome_new_user(request: Request):
    data = await request.json()
    phone = data.get("phone")
    name = data.get("name", "Otaku")
    if phone:
        trigger_welcome_message(phone, name)
        return {"success": True}
    return {"success": False, "message": "Phone number required"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)