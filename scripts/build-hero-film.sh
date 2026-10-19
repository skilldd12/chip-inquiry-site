#!/usr/bin/env bash
# 首屏两版素材的调色与封装（可重跑，输入为 assets-generated 里的原始生成视频）
#
# 关键点：
#  1) 先裁掉/AI 水印再调色，避免 delogo 在金属反光上留下糊斑（亮版直接裁掉底部 54px）
#  2) 统一去色到近中性（hue=s=0.08~0.1）：源素材是灰绿混凝土底，直接给客户看就是"暖灰脏底"
#  3) 亮版用曲线把背景提到近白，让黑胶体与银色引脚形成黑白银三层；暗版压黑但保住引脚边缘高光
#  4) 只做一次编码（CRF 21 + faststart），不做二压
set -euo pipefail
cd "$(dirname "$0")/.."

BRIGHT_SRC="assets-generated/One_continuous_slow_dolly_in___2026-10-19T08-45-46.mp4"
DARK_SRC="assets-generated/One_continuous_slow_dolly_in___2026-10-19T08-49-06.mp4"
OUT="public/video"

echo "== bright"
ffmpeg -y -v error -i "$BRIGHT_SRC" \
  -vf "crop=1176:730:0:0,delogo=x=2:y=2:w=104:h=54,hue=s=0.08,curves=all='0/0.01 0.35/0.46 0.6/0.78 0.85/0.96 1/1',eq=contrast=1.05,unsharp=5:5:0.7:5:5:0.0,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -movflags +faststart -an "$OUT/hero-bright.mp4"

echo "== dark"
ffmpeg -y -v error -i "$DARK_SRC" \
  -vf "crop=1176:656:0:0,delogo=x=2:y=2:w=104:h=54,hue=s=0.10,curves=all='0/0.0 0.3/0.30 0.6/0.62 1/1',eq=contrast=1.06:brightness=-0.012,unsharp=5:5:0.6:5:5:0.0,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -movflags +faststart -an "$OUT/hero-dark.mp4"

echo "== posters"
ffmpeg -y -v error -ss 0.05 -i "$OUT/hero-bright.mp4" -frames:v 1 -q:v 4 "$OUT/hero-bright-poster.jpg"
ffmpeg -y -v error -ss 0.05 -i "$OUT/hero-dark.mp4" -frames:v 1 -q:v 4 "$OUT/hero-dark-poster.jpg"

ls -la "$OUT"
