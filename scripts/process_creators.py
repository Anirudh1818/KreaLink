import os
import sys
import shutil
import subprocess
import imageio_ffmpeg

SOURCE_DIR = r"C:\Users\Lenovo\Downloads\info\info"
WORKSPACE_DIR = r"C:\Users\Lenovo\OneDrive\Desktop\New folder\FanStreak"
PUBLIC_DIR = os.path.join(WORKSPACE_DIR, "public")
CREATORS_PUBLIC_DIR = os.path.join(PUBLIC_DIR, "creators")

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

CREATOR_MAPPINGS = [
    {
        "folder": "Paultrillo",
        "username": "paultrillo",
        "name": "Paul Trillo",
        "pfp_sub": "photos",
        "reels_sub": "reels",
    },
    {
        "folder": "Nicolas Neubert",
        "username": "nicolasneubert",
        "name": "Nicolas Neubert",
        "pfp_sub": "PHOTOS",
        "reels_sub": "REELS",
    },
    {
        "folder": "Julie Wieland",
        "username": "juliewieland",
        "name": "Julie Wieland",
        "pfp_sub": "photos",
        "reels_sub": "reels",
    },
    {
        "folder": "Kavan Cardoza",
        "username": "kavancardoza",
        "name": "Kavan Cardoza",
        "pfp_sub": "photos",
        "reels_sub": "reels",
    },
    {
        "folder": "Kyle Kesterson",
        "username": "kylekesterson",
        "name": "Kyle Kesterson",
        "pfp_sub": "photos",
        "reels_sub": "reels",
    },
    {
        "folder": "Digital da Vincis",
        "username": "digitaldavincis",
        "name": "Digital da Vincis",
        "pfp_sub": "PHOTOS",
        "reels_sub": "REELS",
    },
]

def compress_single_video(src_path, dst_path, poster_path):
    orig_mb = os.path.getsize(src_path) / (1024 * 1024)
    print(f"  Compressing: {os.path.basename(src_path)[:30]} ({orig_mb:.1f} MB)...", flush=True)

    # For web showcase reels: cap preview at 60s max to prevent 20-min multi-gigabyte video stall
    # Scale to 720p even dimensions, crf 26, fast preset, faststart
    cmd_video = [
        FFMPEG_EXE, "-y",
        "-ss", "00:00:00",
        "-t", "60",
        "-i", src_path,
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "26",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-c:a", "aac",
        "-b:a", "128k",
        dst_path
    ]
    subprocess.run(cmd_video, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Generate poster thumbnail at 1s mark
    cmd_poster = [
        FFMPEG_EXE, "-y",
        "-ss", "00:00:01",
        "-i", src_path,
        "-vframes", "1",
        "-q:v", "2",
        poster_path
    ]
    subprocess.run(cmd_poster, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    comp_mb = os.path.getsize(dst_path) / (1024 * 1024)
    print(f"    -> Done: {comp_mb:.2f} MB (Saved {((orig_mb - comp_mb)/orig_mb)*100:.1f}%)", flush=True)

def main():
    os.makedirs(CREATORS_PUBLIC_DIR, exist_ok=True)
    total_orig = 0
    total_comp = 0

    for c in CREATOR_MAPPINGS:
        creator_src = os.path.join(SOURCE_DIR, c["folder"])
        creator_dst = os.path.join(CREATORS_PUBLIC_DIR, c["username"])
        reels_dst = os.path.join(creator_dst, "reels")
        photos_dst = os.path.join(creator_dst, "photos")
        os.makedirs(reels_dst, exist_ok=True)
        os.makedirs(photos_dst, exist_ok=True)

        print(f"\n==========================================", flush=True)
        print(f"Processing Creator: {c['name']} (@{c['username']})", flush=True)
        print(f"==========================================", flush=True)

        # 1. Process Photos & PFP
        pfp_src_dir = os.path.join(creator_src, c["pfp_sub"])
        pfp_files = [f for f in os.listdir(pfp_src_dir) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
        
        primary_pfp_src = None
        if pfp_files:
            if "1.jpeg" in pfp_files:
                primary_pfp_src = os.path.join(pfp_src_dir, "1.jpeg")
            elif "1.jpg" in pfp_files:
                primary_pfp_src = os.path.join(pfp_src_dir, "1.jpg")
            else:
                primary_pfp_src = os.path.join(pfp_src_dir, pfp_files[0])

            for pf in pfp_files:
                shutil.copy2(os.path.join(pfp_src_dir, pf), os.path.join(photos_dst, pf))
            
            pfp_dst = os.path.join(creator_dst, "pfp.jpg")
            shutil.copy2(primary_pfp_src, pfp_dst)
            print(f"  PFP saved: /creators/{c['username']}/pfp.jpg", flush=True)

        # 2. Process Reels
        reels_src_dir = os.path.join(creator_src, c["reels_sub"])
        reel_files = [f for f in os.listdir(reels_src_dir) if f.lower().endswith(".mp4")]
        
        for idx, rf in enumerate(reel_files, 1):
            src_video = os.path.join(reels_src_dir, rf)
            dst_video = os.path.join(reels_dst, f"reel-{idx}.mp4")
            dst_poster = os.path.join(reels_dst, f"reel-{idx}.jpg")
            
            total_orig += os.path.getsize(src_video)
            compress_single_video(src_video, dst_video, dst_poster)
            total_comp += os.path.getsize(dst_video)

    print("\n==========================================", flush=True)
    print(f"ALL 6 CREATORS COMPRESSED & ORGANIZED!", flush=True)
    print(f"Total Original: {total_orig / (1024*1024):.1f} MB", flush=True)
    print(f"Total Compressed: {total_comp / (1024*1024):.1f} MB", flush=True)
    print(f"Bandwidth Saved: {(total_orig - total_comp) / (1024*1024):.1f} MB ({((total_orig - total_comp)/total_orig)*100:.1f}%)", flush=True)
    print("==========================================", flush=True)

if __name__ == "__main__":
    main()
