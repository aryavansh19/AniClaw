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
import time


load_dotenv()

app = FastAPI()

WHATSAPP_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_ID")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

active_verifications = {}

# Fetch the frontend URL from your .env file, or default to localhost for testing
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
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


def get_todays_schedule():
    current_time = int(time.time())
    end_time = current_time + 86400

    query = '''
    query ($start: Int, $end: Int) {
        Page(page: 1, perPage: 15) {
            airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
                episode
                airingAt
                media {
                    title { romaji }
                }
            }
        }
    }'''

    try:
        res = requests.post('https://graphql.anilist.co',
                            json={'query': query, 'variables': {'start': current_time, 'end': end_time}})
        return res.json().get('data', {}).get('Page', {}).get('airingSchedules', [])
    except Exception:
        return []

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
    msg1 = f"🎉 *Account Linked Successfully!*\n\nWelcome aboard, {user_name}! 🚀"
    send_whatsapp_reply(to_phone, msg1)

    msg2 = (
        "👋 *Welcome to Ani-Claw!*\n\n"
        "Here you can track all your favorite anime. We will monitor the release schedules and remind you with a direct download link the exact moment a new episode drops! 🍿\n\n"
        "💡 *Tip:* Just type *\"Hi\"* or *\"Menu\"* at any time to pull up your options and start building your watchlist."
    )
    send_whatsapp_reply(to_phone, msg2)


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

    sel = fetch_single_anime(anilist_id)

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


def get_user_subscriptions(user_id):
    try:
        subs = supabase.table("subs").select("anilist_id").eq("user_id", user_id).execute()
        if not subs.data:
            return []

        anilist_ids = [sub['anilist_id'] for sub in subs.data]
        animes = supabase.table("anime").select("anilist_id, title, next_airing_at, status").in_("anilist_id",
                                                                                                 anilist_ids).execute()
        return animes.data
    except Exception as e:
        print(f"Fetch Subscriptions Error: {e}")
        return []


def handle_delete_tracking(sender_phone, user_id, anilist_id):
    try:
        supabase.table("subs").delete().eq("user_id", user_id).eq("anilist_id", anilist_id).execute()
        send_whatsapp_reply(sender_phone, "✅ Anime successfully removed from your tracking list.")
    except Exception as e:
        print(f"Delete Tracking Error: {e}")
        send_whatsapp_reply(sender_phone, "❌ Error removing anime from tracking list.")


def get_anime_details_text(anime):
    status = anime.get('status', 'Unknown')
    total_eps = anime.get('episodes') or '?'
    next_air = anime.get('nextAiringEpisode')

    if status == 'FINISHED':
        return f"📺 All {total_eps} episodes are released!\n🍿 Ready to binge."
    elif next_air:
        last_ep = next_air['episode'] - 1
        next_ep = next_air['episode']
        air_date = format_timestamp(next_air['airingAt'])
        return f"▶️ Last Ep: {last_ep}\n⏳ Next Ep ({next_ep}) Airs: {air_date}"
    elif status == 'NOT_YET_RELEASED':
        return "📅 Not Yet Released"
    return f"Total Episodes: {total_eps}\nStatus: {status}"


def send_main_menu(to):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": "Welcome to Ani-Claw! Please select an option to get started:"},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": {"id": "menu_search", "title": "Search & Add"}},
                    {"type": "reply", "reply": {"id": "menu_schedule", "title": "Today's Schedule"}},
                    {"type": "reply", "reply": {"id": "menu_services", "title": "Account Services"}}
                ]
            }
        }
    }
    requests.post(url, json=payload, headers=headers)

def send_account_services_menu(to):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "list",
            "header": {"type": "text", "text": "Account Services"},
            "body": {"text": "Select a service to manage your account:"},
            "footer": {"text": "Ani-Claw Scout"},
            "action": {
                "button": "Open Services",
                "sections": [
                    {
                        "title": "Manage Tracking",
                        "rows": [
                            {"id": "menu_view", "title": "View My List", "description": "See all anime you are tracking"},
                            {"id": "menu_delete", "title": "Delete Anime", "description": "Remove a show from your list"}
                        ]
                    },
                    {
                        "title": "Account Management",
                        "rows": [
                            {"id": "menu_delete_account", "title": "Delete Account", "description": "Permanently erase your account"}
                        ]
                    }
                ]
            }
        }
    }
    requests.post(url, json=payload, headers=headers)

def send_whatsapp_with_menu_button(to, text):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": text},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": {"id": "trigger_main_menu", "title": "Main Menu"}}
                ]
            }
        }
    }
    requests.post(url, json=payload, headers=headers)

def send_view_interactive_list(to, subscriptions):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}

    rows = []
    for anime in subscriptions[:10]:
        next_air = anime.get('next_airing_at')
        if next_air and next_air != 2147483647:
            desc = f"Next Ep: {format_timestamp(next_air)}"
        else:
            desc = f"Status: {anime.get('status', 'Unknown').upper()}"

        rows.append({
            "id": f"view_{anime['anilist_id']}",
            "title": anime['title'][:24],
            "description": desc[:72]
        })

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "list",
            "header": {"type": "text", "text": "Your Tracking List"},
            "body": {"text": "Select an anime to view full details:"},
            "footer": {"text": "Ani-Claw Scout"},
            "action": {
                "button": "View Shows",
                "sections": [{"title": "Subscribed Anime", "rows": rows}]
            }
        }
    }
    requests.post(url, json=payload, headers=headers)


def send_tracked_anime_details(to, anime):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}

    title = anime['title']['romaji']
    image_url = anime['coverImage']['large']
    anilist_id = str(anime['id'])

    details = get_anime_details_text(anime)
    body_text = f"*{title}*\n\n{details}"

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
                    {"type": "reply", "reply": {"id": f"delete_{anilist_id}", "title": "🗑️ Stop Tracking"}},
                    {"type": "reply", "reply": {"id": "menu_view", "title": "🔙 Back to List"}}
                ]
            }
        }
    }
    requests.post(url, json=payload, headers=headers)




def send_delete_interactive_list(to, subscriptions):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}

    rows = []
    for anime in subscriptions[:10]:
        rows.append({
            "id": f"delete_{anime['anilist_id']}",
            "title": anime['title'][:24],
            "description": "Tap to remove from tracking"
        })

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "list",
            "header": {"type": "text", "text": "Manage Your Anime"},
            "body": {"text": "Select an anime to stop tracking it:"},
            "footer": {"text": "Ani-Claw Scout"},
            "action": {
                "button": "View My List",
                "sections": [{"title": "Tracked Anime", "rows": rows}]
            }
        }
    }
    requests.post(url, json=payload, headers=headers)



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

                query_text = ""
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
                    if query_text.lower() in ["hi", "hello", "hey", "menu", "start"]:
                        send_main_menu(sender_phone)
                        continue

                    results = get_anilist_info(query_text)

                    if results:
                        send_interactive_list(sender_phone, results)
                    else:
                        send_whatsapp_reply(sender_phone, "❌ No anime found. Try another name!")

                elif msg_type == "interactive":
                    interactive_data = msg["interactive"]

                    if interactive_data["type"] == "list_reply":
                        list_id = interactive_data["list_reply"]["id"]

                        if list_id == "menu_view":
                            subs = get_user_subscriptions(user_id)
                            if subs:
                                send_view_interactive_list(sender_phone, subs)
                            else:
                                send_whatsapp_with_menu_button(sender_phone,
                                                               "You are not tracking any anime yet! Type a name to start searching.")

                        elif list_id == "menu_delete":
                            subs = get_user_subscriptions(user_id)
                            if subs:
                                send_delete_interactive_list(sender_phone, subs)
                            else:
                                send_whatsapp_with_menu_button(sender_phone, "You are not tracking any anime yet!")

                        elif list_id == "menu_delete_account":
                            # 1. Delete their data from your public tables
                            supabase.table("users").delete().eq("id", user_id).execute()
                            # 2. Delete their identity from Supabase Auth so they can register again
                            try:
                                supabase.auth.admin.delete_user(user_id)
                            except Exception as e:
                                print(f"Auth system deletion failed: {e}")
                            send_whatsapp_reply(sender_phone,
                                                "✅ Your account and all tracking data have been permanently deleted.\n\nYou can text me anytime to register again!")

                        elif list_id.startswith("select_"):
                            anilist_id = int(list_id.split("_")[1])
                            anime_data = fetch_single_anime(anilist_id)
                            if anime_data:
                                send_interactive_image_card(sender_phone, anime_data)
                            else:
                                send_whatsapp_with_menu_button(sender_phone, "❌ Error loading image details.")

                        elif list_id.startswith("view_"):
                            anilist_id = int(list_id.split("_")[1])
                            anime_data = fetch_single_anime(anilist_id)
                            if anime_data:
                                send_tracked_anime_details(sender_phone, anime_data)
                            else:
                                send_whatsapp_with_menu_button(sender_phone, "❌ Error loading image details.")

                        elif list_id.startswith("delete_"):
                            anilist_id = int(list_id.split("_")[1])
                            supabase.table("subs").delete().eq("user_id", user_id).eq("anilist_id",
                                                                                      anilist_id).execute()
                            send_whatsapp_with_menu_button(sender_phone,
                                                           "✅ Anime successfully removed from your tracking list.")

                    elif interactive_data["type"] == "button_reply":
                        btn_id = interactive_data["button_reply"]["id"]

                        if btn_id == "trigger_main_menu":
                            send_main_menu(sender_phone)

                        elif btn_id == "menu_services":
                            send_account_services_menu(sender_phone)

                        elif btn_id == "menu_search":
                            send_whatsapp_reply(sender_phone,
                                                "Type the name of any anime you want to track, and I will search for it!")

                        elif btn_id == "menu_schedule":
                            import time

                            subs = get_user_subscriptions(user_id)

                            if not subs:
                                send_whatsapp_with_menu_button(sender_phone,
                                                               "You aren't tracking any anime yet! Track some shows to see your schedule.")
                            else:
                                current_time = int(time.time())
                                end_time = current_time + 86400  # 24 hours from now

                                todays_anime = []
                                for anime in subs:
                                    next_air = anime.get('next_airing_at')
                                    # Check if the show has a valid timestamp and falls within the next 24 hours
                                    if next_air and next_air != 2147483647 and (current_time <= next_air <= end_time):
                                        todays_anime.append(anime)

                                if not todays_anime:
                                    send_whatsapp_with_menu_button(sender_phone,
                                                                   "📅 None of your tracked anime are releasing episodes in the next 24 hours.")
                                else:
                                    # Sort them so the one airing soonest is at the top
                                    todays_anime.sort(key=lambda x: x['next_airing_at'])

                                    msg_lines = ["📅 *Your Schedule (Next 24 Hours):*\n"]
                                    for anime in todays_anime:
                                        title = anime['title']
                                        air_time = format_timestamp(anime['next_airing_at'])
                                        msg_lines.append(f"⏰ {air_time}\n📺 *{title}*\n")

                                    final_msg = "\n".join(msg_lines)

                                    send_whatsapp_reply(sender_phone, final_msg)
                                    send_whatsapp_with_menu_button(sender_phone, "What would you like to do next?")

                        elif btn_id.startswith("track_"):
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

                                send_whatsapp_with_menu_button(sender_phone, reply_msg)
                            else:
                                send_whatsapp_with_menu_button(sender_phone, f"⚠️ {tracking_res['message']}")

                        elif btn_id.startswith("delete_"):
                            anilist_id = int(btn_id.split("_")[1])
                            supabase.table("subs").delete().eq("user_id", user_id).eq("anilist_id",
                                                                                      anilist_id).execute()
                            send_whatsapp_with_menu_button(sender_phone,
                                                           "✅ Anime successfully removed from your tracking list.")

                        elif btn_id == "cancel":
                            send_whatsapp_with_menu_button(sender_phone, "Search canceled.")

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

    details = get_anime_details_text(anime)
    if anime.get('status') == 'NOT_YET_RELEASED':
        details += "\nAdd to track when it premieres!"

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

def send_whatsapp_image(to, image_url, caption):
    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "image",
        "image": {
            "link": image_url,
            "caption": caption
        }
    }
    requests.post(url, json=payload, headers=headers)

@app.post("/api/track/web")
async def track_from_web(request: Request):
    data = await request.json()
    user_id = data.get('user_id')
    anilist_id = data.get('anilist_id')

    tracking_res = process_anime_tracking(anilist_id, user_id)

    if tracking_res.get("success"):
        user_record = supabase.table("users").select("whatsapp_number").eq("id", user_id).execute()

        if user_record.data:
            phone = user_record.data[0].get("whatsapp_number")

            if phone:
                title = tracking_res['title']
                next_air = tracking_res.get('next_airing_at')

                anime_record = supabase.table("anime").select("image_url").eq("anilist_id", anilist_id).execute()
                image_url = anime_record.data[0].get("image_url") if anime_record.data else ""

                if next_air and next_air != 2147483647:
                    air_date = format_timestamp(next_air)
                    caption = f"🎉 *{title}* added via Web!\n\n⏰ *Next Episode:* {air_date}\n\nI will notify you as soon as the episode drops."
                else:
                    caption = f"🎉 *{title}* added to your dashboard!\n\n🍿 This show is fully released. No reminders needed—enjoy your binge-watching!"

                if image_url:
                    send_whatsapp_image(phone, image_url, caption)
                else:
                    send_whatsapp_reply(phone, caption)

    return tracking_res


@app.post("/api/user/welcome")
async def welcome_new_user(request: Request):
    data = await request.json()
    phone = data.get("phone")
    name = data.get("name", "Otaku")
    if phone:
        trigger_welcome_message(phone, name)
        return {"success": True}
    return {"success": False, "message": "Phone number required"}


@app.post("/api/user/delete")
async def delete_user_account(request: Request):
    data = await request.json()
    user_id = data.get("user_id")

    if not user_id:
        return {"success": False, "message": "User ID required"}

    try:
        # 1. Delete their data from public tables
        supabase.table("users").delete().eq("id", user_id).execute()
        # 2. Delete their identity from Supabase Auth
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception as e:
            print(f"Auth system deletion failed: {e}")
            
        return {"success": True}
    except Exception as e:
        print(f"Failed to delete user account: {e}")
        return {"success": False, "message": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)