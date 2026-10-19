"use client";
import { useState } from "react";
import Image from "next/image";
import s from "./editorial.module.css";
export type QualityStep = { title: string; body: string; media: { src: string; alt: string; caption: string; position: string } };
export function QualityProcess({ steps }: { steps: QualityStep[] }) {
  const [active,setActive]=useState(0);
  const current=steps[active];
  return <div className={s.splitEqual}><div className={s.sticky}><figure className={s.figure}><div className={s.visual}><Image src={current.media.src} alt={current.media.alt} width={1200} height={1000} sizes="(max-width:680px) 100vw,50vw" style={{objectPosition:current.media.position}}/></div><figcaption>{current.media.caption}</figcaption></figure></div><div>{steps.map((step,i)=><div className={s.qualityStep} key={step.title}><h3><button className={s.qualityButton} onClick={()=>setActive(i)} aria-expanded={active===i} aria-controls={`quality-step-${i}`}><span className={s.number}>{String(i+1).padStart(2,"0")}</span><span>{step.title}</span><span aria-hidden="true">{active===i?"−":"+"}</span></button></h3><div id={`quality-step-${i}`} hidden={active!==i}><p className={s.qualityBody}>{step.body}</p></div></div>)}</div></div>;
}
