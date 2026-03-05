import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse
from anipy_api.provider import list_providers, get_provider, LanguageTypeEnum
from anipy_api.anime import Anime


def download_episode(official_title, episode_num):
    """
    Downloads an anime episode using FFmpeg with reinforced headers.
    Organizes files into subfolders by anime title.
    """
    print(f"\n🚀 Downloader initiated for: {official_title} Ep {episode_num}")

    # 1. Initialize Provider
    try:
        available = {p.NAME.lower(): p for p in list_providers()}

        # Priority: GogoAnime (more stable) -> AllAnime -> First available
        if 'gogoanime' in available:
            prov_key = 'gogoanime'
        elif 'allanime' in available:
            prov_key = 'allanime'
        else:
            prov_key = list(available.keys())[0]

        provider_entity = get_provider(prov_key)
        provider = provider_entity() if callable(provider_entity) else provider_entity

        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        provider.session.headers.update({"User-Agent": user_agent})
        print(f"📡 Using Provider: {provider.NAME}")
    except Exception as e:
        print(f"❌ Provider Init Error: {e}")
        return False

    # 2. Search using Official Title
    try:
        results = provider.get_search(official_title)
        if not results:
            print(f"❌ No results found for {official_title}")
            return False

        anime = Anime.from_search_result(provider, results[0])
    except Exception as e:
        print(f"❌ Search Error: {e}")
        return False

    # 3. Extract Stream and Headers
    try:
        print(f"🔗 Fetching Episode {episode_num} link...")
        stream = anime.get_video(episode_num, LanguageTypeEnum.SUB)

        if stream is None:
            print(f"⚠️ Episode {episode_num} found on site, but no video link available yet.")
            return False

        video_url = stream.url
        referer = getattr(stream, 'referrer', '')

        if not referer:
            referer = f"https://{urlparse(video_url).netloc}/"

        print(f"✅ Link Found: {video_url[:50]}...")
    except (TypeError, AttributeError):
        print(f"⏭️ Provider has no data for Ep {episode_num} yet (NoneType).")
        return False
    except Exception as e:
        print(f"❌ Link extraction failed: {e}")
        return False

    # 4. Prepare FFmpeg with Subfolder Logic
    # Remove characters that Windows doesn't like in folder names
    clean_title = "".join(x for x in official_title if x.isalnum() or x in "._- ")

    # Create path: downloads/Anime Name/
    save_dir = Path("downloads") / clean_title
    save_dir.mkdir(parents=True, exist_ok=True)

    output_file = save_dir / f"{clean_title}_Ep{episode_num}.mp4"

    # Generate Origin from Referer
    parsed_referer = urlparse(referer)
    origin = f"{parsed_referer.scheme}://{parsed_referer.netloc}"

    # Construct Stealth Headers
    headers = [
        f"Referer: {referer}",
        f"Origin: {origin}",
        f"User-Agent: {user_agent}",
        "Sec-Fetch-Mode: cors",
        "Sec-Fetch-Site: cross-site",
        "Accept: */*"
    ]
    headers_str = "\r\n".join(headers) + "\r\n"

    ffmpeg_cmd = [
        'ffmpeg', '-y',
        '-headers', headers_str,
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
        '-i', video_url,
        '-c', 'copy',
        '-bsf:a', 'aac_adtstoasc',
        str(output_file)
    ]

    try:
        print(f"📥 Downloading to: {output_file}")
        # Run FFmpeg (we use capture_output=True to keep the scout logs clean)
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
        print(f"✅ SUCCESS: File saved.")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ FFmpeg Error 403: Server rejected the request.")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False