"use client";

import { useEffect, useRef } from "react";

/**
 * 首屏画面：一段真实拍摄逻辑的连续推镜（同一颗器件、同一条光路），
 * 由滚动进度在时间轴上取帧 —— 正向滚动推进到引脚微距，反向滚动原路退回。
 *
 * 为什么用视频而不是三张静帧：三张独立图片交叉淡化时，画面里会同时存在两个轮廓，
 * 也就是"重影"；一段连续镜头里永远只有一个器件、一条光轴。
 *
 * 帧由 canvas 绘制而不是直接 <video>，因为需要：
 *   1) 正反向都能精确停在任意进度上（video.currentTime 由滚动驱动，不自动播放）；
 *   2) 桌面与手机用不同的取景（缩放 + 偏移），而不是把桌面构图直接裁一刀。
 */

type Props = {
  bright: { src: string; poster: string };
  dark: { src: string; poster: string };
  theme: "bright" | "dark";
  progress: React.MutableRefObject<number>;
  mobile: boolean;
  onReady?: () => void;
};

type Framing = { zoom: number; biasX: number; biasY: number };

/* 取景按"视口 × 主题"分别给：两版素材的画幅比例不同（1176×730 / 1176×656），
   用同一组数字会让暗版把器件顶到画面外。
   亮版：器件偏右、左侧留白给标题；暗版：器件居中、缩到整颗入画（暗底留边看不出来）。 */
const FRAMING: Record<"desktop" | "mobile", Record<"bright" | "dark", Framing>> = {
  desktop: {
    bright: { zoom: 1, biasX: 0.34, biasY: 0.5 },
    dark: { zoom: 0.82, biasX: 0.5, biasY: 0.44 },
  },
  mobile: {
    bright: { zoom: 1.12, biasX: 0.66, biasY: 0.34 },
    dark: { zoom: 1.0, biasX: 0.52, biasY: 0.62 },
  },
};

export function HeroFilm({ bright, dark, theme, progress, mobile, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const source = theme === "dark" ? dark : bright;

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const framing = mobile ? FRAMING.mobile[theme] : FRAMING.desktop[theme];
    let raf = 0;
    let ready = false;
    let lastDrawn = -1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      lastDrawn = -1;
    };

    const draw = () => {
      const duration = video.duration || 0;
      if (!duration || video.readyState < 2) return;

      /* 0 → 0.5 正放到微距，0.5 → 1 倒放回起点：同一段素材、同一条轨迹 */
      const p = Math.min(Math.max(progress.current, 0), 1);
      const target = p <= 0.5 ? p * 2 * duration : (2 - 2 * p) * duration;

      if (!reduced && Math.abs(video.currentTime - target) > 0.02) {
        try {
          video.currentTime = Math.min(target, duration - 0.02);
        } catch {
          /* 元数据未就绪时忽略，下一帧再试 */
        }
      }

      if (video.seeking) return;
      if (Math.abs(video.currentTime - lastDrawn) < 0.004) return;
      lastDrawn = video.currentTime;

      const cw = canvas.width;
      const ch = canvas.height;
      const vw = video.videoWidth || 16;
      const vh = video.videoHeight || 9;
      const scale = Math.max(cw / vw, ch / vh) * framing.zoom;
      const dw = vw * scale;
      const dh = vh * scale;

      ctx.fillStyle = theme === "dark" ? "#0a0b0c" : "#eceeef";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(video, (cw - dw) * framing.biasX, (ch - dh) * framing.biasY, dw, dh);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      draw();
    };

    const onMeta = () => {
      if (!ready) {
        ready = true;
        onReady?.();
      }
      resize();
      draw();
      if (reduced) {
        /* 降低动效：只画一帧稳定的中景，不跑循环 */
        video.currentTime = Math.min((video.duration || 8) * 0.34, (video.duration || 8) - 0.05);
      }
    };

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("seeked", draw);
    window.addEventListener("resize", resize);
    resize();
    if (video.readyState >= 1) onMeta();
    if (!reduced) loop();
    else draw();

    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", draw);
      window.removeEventListener("resize", resize);
    };
  }, [mobile, progress, theme, onReady]);

  return (
    <>
      <video
        key={source.src}
        ref={videoRef}
        src={source.src}
        poster={source.poster}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          width: 2,
          height: 2,
          opacity: 0,
          pointerEvents: "none",
          left: 0,
          top: 0,
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
    </>
  );
}
