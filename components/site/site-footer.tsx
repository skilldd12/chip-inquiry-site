import Link from "next/link";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";
import { navHref } from "@/lib/nav";
import type { Company } from "@/lib/site";
export function SiteFooter({locale,company,siteName,brandPrefix}:{locale:Locale;company:Company;siteName:string;brandPrefix:string}) {
 const dict=getDictionary(locale), l=(zh:string,en:string,ru:string)=>locale==="zh"?zh:locale==="en"?en:ru;
 const address=locale==="zh"?company.address_zh:locale==="ru"?company.address_ru:company.address_en;
 const links=[
  ["products",l("产品类别","Product categories","Категории")], ["brands",l("经营品牌","Manufacturers","Бренды")], ["capabilities",l("采购服务","Sourcing services","Закупочные услуги")], ["warehouse-quality",l("仓储与交付","Storage & fulfillment","Хранение и поставка")], ["quality",l("品质与追溯","Quality & traceability","Качество")], ["industries",l("行业应用","Industries","Отрасли")]
 ];
 return <footer className="site-footer"><div className="container"><div className="footer-grid">
  <div><Link href={navHref(locale,"")} className="wordmark" style={{marginBottom:20}}>{siteName}</Link><p className="body" style={{fontSize:14,maxWidth:"32ch"}}>{dict.footer.blurb}</p><p className="mono-sm" style={{marginTop:24}}>COMPONENTS · SOURCING · BOM</p></div>
  <div className="u-footer-links"><p className="mono-sm" style={{marginBottom:14}}>{l("业务方向","Explore","Направления")}</p>{links.map(([path,title])=><Link key={path} href={navHref(locale,path)}>{title}</Link>)}</div>
  <div className="u-footer-links"><p className="mono-sm" style={{marginBottom:14}}>{l("公司与帮助","Company & support","Компания и поддержка")}</p>{[["about",l("关于我们","About us","О компании")],["contact",l("联系我们","Contact","Контакты")],["resources",l("资源中心","Resources","Материалы")],["faq",dict.footer.faq],["privacy",dict.footer.privacy],["terms",dict.footer.terms]].map(([path,title])=><Link key={path} href={navHref(locale,path)}>{title}</Link>)}</div>
  <div className="u-footer-links"><p className="mono-sm" style={{marginBottom:14}}>{dict.footer.contact}</p>{company.email?<a href={`mailto:${company.email}`}>{company.email}</a>:null}{company.phone?<a href={`tel:${company.phone.replace(/\s/g,"")}`}>{company.phone}</a>:null}{address?<p className="small" style={{marginTop:10}}>{address}</p>:null}<p className="small" style={{marginTop:10}}>{locale==="zh"?company.hours_zh:locale==="ru"?company.hours_ru:company.hours_en}</p><Link className="link-underline" style={{marginTop:22}} href={navHref(locale,"inquiry")}>{dict.nav.inquiry}<ArrowUpRight size={15}/></Link></div>
 </div><div className="u-footer-bottom"><p>© {new Date().getFullYear()} {siteName}</p><span>{l("电子元器件与芯片采购协作","Electronic component procurement","Закупка электронных компонентов")}</span><a href="#main" aria-label={l("返回顶部","Back to top","Наверх")}><ArrowUp size={17}/></a></div></div></footer>;
}
