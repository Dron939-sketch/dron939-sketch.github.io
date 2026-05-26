"""
Video Analyzer — инструмент анализа импринт-видеорядов.

Извлекает из видео кадры и звуковую разметку, чтобы их можно было
проанализировать в чате с психологом / специалистом по методике
«25 кадра Мейстера» (импринт-видеоряд).

Что делает:
1. Скачивает видео по URL (YouTube, VK, RuTube, прямые ссылки) — через yt-dlp.
   Если на входе локальный файл — пропускает скачивание.
2. Извлекает метаданные (длительность, fps, разрешение).
3. Извлекает кадры с заданным интервалом (по умолчанию 0.5 сек).
4. Извлекает аудио и анализирует амплитуду по времени.
5. Детектирует «звуковые акценты» (пики амплитуды выше порога).
6. Создаёт текстовый отчёт report.md с временными метками кадров
   и звуковых якорей.
7. Сохраняет всё в output/<имя>/

Использование:
    python video_analyzer.py <URL_или_путь> [--interval 0.5] [--peak-threshold 0.7]

Зависимости:
    pip install yt-dlp imageio-ffmpeg numpy

ffmpeg должен быть в PATH или установлен через imageio-ffmpeg.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import numpy as np
except ImportError:
    print("Установите: pip install numpy")
    sys.exit(1)


def get_ffmpeg() -> str:
    """Найти бинарник ffmpeg — системный или через imageio-ffmpeg."""
    sys_ffmpeg = shutil.which("ffmpeg")
    if sys_ffmpeg:
        return sys_ffmpeg
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        print("Установите ffmpeg в систему или: pip install imageio-ffmpeg")
        sys.exit(1)


def get_ffprobe(ffmpeg_path: str) -> str:
    """Найти ffprobe рядом с ffmpeg."""
    sys_ffprobe = shutil.which("ffprobe")
    if sys_ffprobe:
        return sys_ffprobe
    candidate = Path(ffmpeg_path).with_name("ffprobe")
    if candidate.exists():
        return str(candidate)
    return ffmpeg_path  # будем парсить из stderr ffmpeg


def is_url(s: str) -> bool:
    return s.startswith(("http://", "https://"))


def safe_name(s: str) -> str:
    """Сделать безопасное имя папки из URL или пути."""
    s = re.sub(r"https?://", "", s)
    s = re.sub(r"[^a-zA-Z0-9_\-]+", "_", s)
    return s[:80]


def download_video(url: str, out_dir: Path) -> Path:
    """Скачать видео через yt-dlp в out_dir/source.mp4."""
    try:
        import yt_dlp
    except ImportError:
        print("Установите: pip install yt-dlp")
        sys.exit(1)

    out_template = str(out_dir / "source.%(ext)s")
    ydl_opts = {
        "outtmpl": out_template,
        "format": "best[height<=720]/best",
        "quiet": False,
        "no_warnings": False,
        "merge_output_format": "mp4",
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    candidates = list(out_dir.glob("source.*"))
    if not candidates:
        raise RuntimeError("Скачивание не дало файла")
    return candidates[0]


def probe_metadata(ffmpeg_path: str, video_path: Path) -> dict:
    """Извлечь длительность, fps, разрешение из видео."""
    cmd = [ffmpeg_path, "-i", str(video_path), "-hide_banner"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    stderr = result.stderr

    duration_match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", stderr)
    duration = 0.0
    if duration_match:
        h, m, s = duration_match.groups()
        duration = int(h) * 3600 + int(m) * 60 + float(s)

    fps_match = re.search(r"(\d+(?:\.\d+)?)\s*fps", stderr)
    fps = float(fps_match.group(1)) if fps_match else 0.0

    res_match = re.search(r"(\d{3,4})x(\d{3,4})", stderr)
    width, height = (int(res_match.group(1)), int(res_match.group(2))) if res_match else (0, 0)

    return {
        "duration_sec": duration,
        "fps": fps,
        "width": width,
        "height": height,
    }


def extract_frames(ffmpeg_path: str, video_path: Path, out_dir: Path, interval: float) -> list[Path]:
    """Извлечь кадры через ffmpeg с заданным интервалом (сек)."""
    frames_dir = out_dir / "frames"
    frames_dir.mkdir(exist_ok=True)

    fps_filter = 1.0 / interval
    cmd = [
        ffmpeg_path, "-y",
        "-i", str(video_path),
        "-vf", f"fps={fps_filter},scale=640:-1",
        "-q:v", "3",
        str(frames_dir / "frame_%04d.jpg"),
    ]
    subprocess.run(cmd, capture_output=True, check=True)

    frames = sorted(frames_dir.glob("frame_*.jpg"))
    return frames


def extract_audio_amplitude(ffmpeg_path: str, video_path: Path, out_dir: Path, sample_rate: int = 1000):
    """Извлечь аудиоамплитуду как массив (нормализованный 0..1) с заданной частотой выборки."""
    raw_audio = out_dir / "audio_raw.pcm"
    cmd = [
        ffmpeg_path, "-y",
        "-i", str(video_path),
        "-ac", "1",
        "-ar", str(sample_rate),
        "-f", "s16le",
        str(raw_audio),
    ]
    subprocess.run(cmd, capture_output=True, check=True)

    if not raw_audio.exists():
        return None, None

    data = np.fromfile(str(raw_audio), dtype=np.int16)
    amplitude = np.abs(data.astype(np.float32))
    if amplitude.max() > 0:
        amplitude = amplitude / amplitude.max()

    raw_audio.unlink(missing_ok=True)

    window = max(1, sample_rate // 10)
    smoothed = np.convolve(amplitude, np.ones(window) / window, mode="same")

    return smoothed, sample_rate


def detect_audio_peaks(amplitude: np.ndarray, sample_rate: int, threshold: float = 0.7, min_distance_sec: float = 0.5):
    """Найти пики амплитуды выше threshold с минимальной дистанцией min_distance_sec."""
    if amplitude is None:
        return []

    min_distance_samples = int(min_distance_sec * sample_rate)
    above = amplitude > threshold

    peaks = []
    i = 0
    while i < len(amplitude):
        if above[i]:
            window_end = min(i + min_distance_samples, len(amplitude))
            local_peak = i + int(np.argmax(amplitude[i:window_end]))
            peaks.append({
                "time_sec": round(local_peak / sample_rate, 3),
                "amplitude": round(float(amplitude[local_peak]), 3),
            })
            i = local_peak + min_distance_samples
        else:
            i += 1

    return peaks


def build_report(out_dir: Path, source: str, metadata: dict, frames: list[Path], audio_peaks: list, interval: float):
    """Сформировать report.md и report.json."""
    report = {
        "source": source,
        "metadata": metadata,
        "frame_interval_sec": interval,
        "frames_count": len(frames),
        "audio_peaks_count": len(audio_peaks),
        "audio_peaks": audio_peaks,
    }

    (out_dir / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    md_lines = []
    md_lines.append(f"# Анализ видео: {source}")
    md_lines.append("")
    md_lines.append("## Метаданные")
    md_lines.append(f"- Длительность: {metadata['duration_sec']:.2f} сек")
    md_lines.append(f"- FPS: {metadata['fps']}")
    md_lines.append(f"- Разрешение: {metadata['width']}×{metadata['height']}")
    md_lines.append("")
    md_lines.append(f"## Кадры (интервал {interval} сек)")
    md_lines.append(f"Всего: {len(frames)}")
    md_lines.append("")
    md_lines.append("| № | Время (сек) | Файл |")
    md_lines.append("|---|---|---|")
    for i, f in enumerate(frames, 1):
        t = (i - 1) * interval
        md_lines.append(f"| {i} | {t:.2f} | frames/{f.name} |")
    md_lines.append("")
    md_lines.append("## Звуковые акценты (пики амплитуды)")
    if audio_peaks:
        md_lines.append(f"Найдено: {len(audio_peaks)}")
        md_lines.append("")
        md_lines.append("| № | Время (сек) | Амплитуда (0-1) | Ближайший кадр |")
        md_lines.append("|---|---|---|---|")
        for i, p in enumerate(audio_peaks, 1):
            nearest_frame = int(p["time_sec"] / interval) + 1
            md_lines.append(f"| {i} | {p['time_sec']:.2f} | {p['amplitude']} | frame_{nearest_frame:04d}.jpg |")
    else:
        md_lines.append("Не найдено (или аудио отсутствует).")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")
    md_lines.append("Что делать дальше:")
    md_lines.append("1. Откройте папку `frames/` — там все ключевые кадры.")
    md_lines.append("2. Передайте этот report.md + 3–5 ключевых кадров (или все, если их немного) в чат с психологом / методистом.")
    md_lines.append("3. Ключевые кадры обычно: первый, последний и те, что рядом со звуковыми пиками.")

    (out_dir / "report.md").write_text("\n".join(md_lines))


def main():
    parser = argparse.ArgumentParser(description="Video Analyzer для импринт-видеорядов.")
    parser.add_argument("source", help="URL видео (YouTube/VK/RuTube/...) или путь к локальному файлу")
    parser.add_argument("--interval", type=float, default=0.5, help="Интервал извлечения кадров в секундах (по умолчанию 0.5)")
    parser.add_argument("--peak-threshold", type=float, default=0.7, help="Порог детекции звуковых пиков 0..1 (по умолчанию 0.7)")
    parser.add_argument("--output-dir", default="output", help="Папка для результатов (по умолчанию ./output)")
    args = parser.parse_args()

    ffmpeg_path = get_ffmpeg()
    print(f"ffmpeg: {ffmpeg_path}")

    base_output = Path(args.output_dir)
    base_output.mkdir(exist_ok=True)
    out_dir = base_output / safe_name(args.source)
    out_dir.mkdir(exist_ok=True)
    print(f"Папка результатов: {out_dir}")

    if is_url(args.source):
        print(f"Скачивание: {args.source}")
        video_path = download_video(args.source, out_dir)
    else:
        video_path = Path(args.source)
        if not video_path.exists():
            print(f"Файл не найден: {args.source}")
            sys.exit(1)
        target = out_dir / f"source{video_path.suffix}"
        shutil.copy(video_path, target)
        video_path = target

    print(f"Видео: {video_path}")

    print("Извлечение метаданных...")
    metadata = probe_metadata(ffmpeg_path, video_path)
    print(f"  Длительность: {metadata['duration_sec']:.2f} сек")
    print(f"  FPS: {metadata['fps']}")
    print(f"  Разрешение: {metadata['width']}×{metadata['height']}")

    print(f"Извлечение кадров (интервал {args.interval} сек)...")
    frames = extract_frames(ffmpeg_path, video_path, out_dir, args.interval)
    print(f"  Извлечено кадров: {len(frames)}")

    print("Анализ звука...")
    amplitude, sample_rate = extract_audio_amplitude(ffmpeg_path, video_path, out_dir)
    if amplitude is not None:
        peaks = detect_audio_peaks(amplitude, sample_rate, threshold=args.peak_threshold)
        print(f"  Найдено звуковых пиков: {len(peaks)}")
    else:
        peaks = []
        print("  Аудио недоступно.")

    print("Создание отчёта...")
    build_report(out_dir, args.source, metadata, frames, peaks, args.interval)

    print()
    print("=" * 60)
    print(f"Готово. Результаты: {out_dir}/")
    print(f"  - report.md (главный отчёт)")
    print(f"  - report.json (машиночитаемый)")
    print(f"  - frames/ (все кадры)")
    print("=" * 60)
    print()
    print("Что передать в чат:")
    print("  1. Файл report.md")
    print("  2. 3–5 ключевых кадров из frames/ (первый, последний, рядом со звуковыми пиками)")
    print()


if __name__ == "__main__":
    main()
