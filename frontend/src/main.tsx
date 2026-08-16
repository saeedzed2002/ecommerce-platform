import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type IconName = "arrow" | "bag" | "heart" | "menu" | "search" | "star" | "truck" | "shield" | "support";

const categories = [
  { title: "دیجیتال", description: "گجت‌های روز", icon: "⌁", tone: "blue" },
  { title: "مد و پوشاک", description: "انتخاب تازه", icon: "◒", tone: "peach" },
  { title: "خانه و زندگی", description: "برای خانه‌ی شما", icon: "⌂", tone: "mint" },
  { title: "زیبایی و سلامت", description: "مراقبت روزانه", icon: "✦", tone: "lilac" },
];

const products = [
  { name: "هدفون بی‌سیم مدل Air", price: "۲٬۴۹۰٬۰۰۰", oldPrice: "۲٬۸۹۰٬۰۰۰", discount: "۱۴٪", rating: "۴.۸", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80", badge: "پیشنهاد ویژه" },
  { name: "ساعت هوشمند سری Nova", price: "۳٬۷۹۰٬۰۰۰", oldPrice: "", discount: "", rating: "۴.۶", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80", badge: "جدید" },
  { name: "دوربین فوری Mini 12", price: "۵٬۹۹۰٬۰۰۰", oldPrice: "۶٬۴۹۰٬۰۰۰", discount: "۸٪", rating: "۴.۹", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80", badge: "پرفروش" },
  { name: "کیف دوشی چرمی Urban", price: "۱٬۸۹۰٬۰۰۰", oldPrice: "", discount: "", rating: "۴.۷", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80", badge: "منتخب کاربران" },
];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    bag: <><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></>,
    shield: <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />,
    support: <><path d="M4 13a8 8 0 0 1 16 0" /><path d="M4 13v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" /><path d="M17 19c0 2-2 2-5 2" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function App() {
  return <div className="app-shell">
    <div className="announcement">ارسال رایگان برای سفارش‌های بالای ۲ میلیون تومان <span>✦</span> تا ۷ روز ضمانت بازگشت کالا</div>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="خانه نوکسا"><span className="brand-mark">n</span><span>نوکسا</span></a>
      <nav className="desktop-nav" aria-label="ناوبری اصلی"><a href="#products">فروشگاه</a><a href="#categories">دسته‌بندی‌ها</a><a href="#offers">پیشنهادها</a><a href="#about">درباره‌ی ما</a></nav>
      <div className="header-actions"><button className="icon-button" aria-label="جست‌وجو"><Icon name="search" /></button><button className="icon-button" aria-label="علاقه‌مندی‌ها"><Icon name="heart" /></button><button className="cart-button" aria-label="سبد خرید"><Icon name="bag" /><span>۰</span></button><button className="menu-button" aria-label="منو"><Icon name="menu" /></button></div>
    </header>
    <main id="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow">انتخاب‌های تازه، هر روز</p><h1 id="hero-title">هر آنچه دوست داری،<br /><em>همین‌جا پیدا کن.</em></h1><p className="hero-description">از برندهای محبوب تا کشف‌های تازه؛ خریدی مطمئن و ساده، برای لحظه‌های مهم زندگی.</p><div className="hero-actions"><a className="button button-primary" href="#products">مشاهده‌ی محصولات <Icon name="arrow" size={18} /></a><a className="text-link" href="#categories">مشاهده‌ی دسته‌بندی‌ها</a></div><div className="hero-proof"><div className="avatar-stack"><span>م</span><span>س</span><span>ن</span></div><p>انتخاب بیش از <strong>۵۰٬۰۰۰</strong> مشتری</p></div></div>
        <div className="hero-visual"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-image-wrap"><img src="https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1100&q=85" alt="مجموعه‌ای از محصولات منتخب" /></div><div className="floating-card product-float"><span className="float-icon">✦</span><div><small>محبوب این هفته</small><strong>استایل شخصی تو</strong></div></div><div className="floating-card rating-float"><span className="rating-star">★</span><div><strong>۴.۹ از ۵</strong><small>رضایت کاربران</small></div></div></div>
      </section>
      <section className="benefits" aria-label="مزیت‌های خرید"><div><span className="benefit-icon"><Icon name="truck" /></span><p><strong>ارسال سریع</strong><small>تحویل در کوتاه‌ترین زمان</small></p></div><div><span className="benefit-icon"><Icon name="shield" /></span><p><strong>خرید مطمئن</strong><small>ضمانت اصالت و بازگشت</small></p></div><div><span className="benefit-icon"><Icon name="support" /></span><p><strong>پشتیبانی همراه شما</strong><small>پاسخ‌گویی ۲۴ ساعته</small></p></div></section>
      <section className="section categories-section" id="categories" aria-labelledby="categories-title"><div className="section-heading"><div><p className="eyebrow">یک انتخاب برای هر سلیقه</p><h2 id="categories-title">دسته‌بندی‌های محبوب</h2></div><a className="text-link" href="#products">مشاهده همه <Icon name="arrow" size={17} /></a></div><div className="category-grid">{categories.map((category) => <a href="#products" className={`category-card ${category.tone}`} key={category.title}><span>{category.icon}</span><div><h3>{category.title}</h3><p>{category.description}</p></div><Icon name="arrow" size={17} /></a>)}</div></section>
      <section className="section product-section" id="products" aria-labelledby="products-title"><div className="section-heading"><div><p className="eyebrow">انتخاب‌شده برای شما</p><h2 id="products-title">محبوب‌ترین‌ها</h2></div><a className="text-link" href="#products">مشاهده همه <Icon name="arrow" size={17} /></a></div><div className="product-grid">{products.map((product) => <article className="product-card" key={product.name}><div className="product-image"><img src={product.image} alt={product.name} /><span className="product-badge">{product.badge}</span><button className="wish-button" aria-label={`افزودن ${product.name} به علاقه‌مندی‌ها`}><Icon name="heart" size={18} /></button></div><div className="product-content"><div className="product-meta"><span><Icon name="star" size={14} /> {product.rating}</span><span>موجود</span></div><h3>{product.name}</h3><div className="price-row"><div>{product.oldPrice && <del>{product.oldPrice}</del>}<strong>{product.price} <small>تومان</small></strong></div>{product.discount && <b>{product.discount}</b>}</div></div></article>)}</div></section>
      <section className="member-banner" id="offers"><div><p className="eyebrow">پیشنهاد ویژه‌ی اعضا</p><h2>به جمع نوکسا کلاب بپیوند.</h2><p>از تخفیف‌های شخصی‌سازی‌شده و خبرهای تازه زودتر باخبر شو.</p><a className="button button-dark" href="#join">عضویت در باشگاه <Icon name="arrow" size={18} /></a></div><div className="banner-shape">N<span>+</span></div></section>
    </main>
    <footer id="about"><a className="brand" href="#home"><span className="brand-mark">n</span><span>نوکسا</span></a><p>یک تجربه‌ی ساده‌تر برای انتخاب و خرید بهتر.</p><small>© ۱۴۰۵ نوکسا. تمامی حقوق محفوظ است.</small></footer>
  </div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
