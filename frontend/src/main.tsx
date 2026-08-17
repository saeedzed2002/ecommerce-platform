import {
  StrictMode,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type IconName =
  | "arrow"
  | "bag"
  | "close"
  | "heart"
  | "lock"
  | "menu"
  | "search"
  | "shield"
  | "support"
  | "truck"
  | "user";

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  price: string;
  compare_at_price: string | null;
  discount_percent: number;
  in_stock: boolean;
  category: Category;
  primary_image: string | null;
};

type ProductListResponse = {
  count: number;
  results: Product[];
};

type AuthUser = {
  id: number;
  phone: string;
  role: "customer" | "admin";
};

type AuthResponse = {
  access: string;
  refresh: string;
  user: AuthUser;
};

type AuthPanel = "customer-phone" | "customer-code" | "admin";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const categoryIcons = ["⌁", "◒", "⌂", "✦"];
const categoryTones = ["blue", "peach", "mint", "lilac"];

function formatPrice(value: string) {
  return new Intl.NumberFormat("fa-IR").format(Number(value));
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    bag: <><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></>,
    shield: <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />,
    support: <><path d="M4 13a8 8 0 0 1 16 0" /><path d="M4 13v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" /><path d="M17 19c0 2-2 2-5 2" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function getApiError(response: Response) {
  return response
    .json()
    .then((body: { detail?: string }) => body.detail ?? "عملیات انجام نشد.")
    .catch(() => "ارتباط با سرور برقرار نشد.");
}

function AuthDialog({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: (response: AuthResponse) => void;
}) {
  const [panel, setPanel] = useState<AuthPanel>("customer-phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submitCustomerPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/otp/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      setPanel("customer-code");
      setMessage("کد تأیید برای شمارهٔ شما ارسال شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ارسال کد ناموفق بود.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCustomerCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/otp/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      onAuthenticated((await response.json()) as AuthResponse);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تأیید کد ناموفق بود.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/admin/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      onAuthenticated((await response.json()) as AuthResponse);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ورود مدیر ناموفق بود.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const customerFlow = panel !== "admin";
  return <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="auth-close" type="button" onClick={onClose} aria-label="بستن پنجره ورود"><Icon name="close" size={19} /></button>
      <div className="auth-brand"><span className="brand-mark">n</span><span>نوکسا</span></div>
      <div className="auth-heading"><p className="eyebrow">{customerFlow ? "خوش آمدی" : "دسترسی مدیریت"}</p><h2 id="auth-title">{panel === "customer-code" ? "کد تأیید را وارد کن" : customerFlow ? "ورود یا ثبت‌نام" : "ورود مدیر"}</h2><p>{panel === "customer-code" ? "کد شش‌رقمی ارسال‌شده به شمارهٔ موبایلت را وارد کن." : customerFlow ? "با شمارهٔ موبایل وارد شو؛ اگر حساب نداشته باشی، همان لحظه ساخته می‌شود." : "ورود مدیر فقط با شمارهٔ ثبت‌شده و رمز عبور انجام می‌شود."}</p></div>

      {panel === "customer-phone" && <form className="auth-form" onSubmit={submitCustomerPhone}><label htmlFor="customer-phone">شمارهٔ موبایل</label><input id="customer-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷" required /><button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "در حال ارسال…" : "دریافت کد تأیید"}<Icon name="arrow" size={18} /></button></form>}
      {panel === "customer-code" && <form className="auth-form" onSubmit={submitCustomerCode}><label htmlFor="customer-code">کد تأیید</label><input className="otp-input" id="customer-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="— — — — — —" required /><button className="auth-submit" type="submit" disabled={isSubmitting || code.length !== 6}>{isSubmitting ? "در حال بررسی…" : "تأیید و ورود"}<Icon name="arrow" size={18} /></button><button className="auth-back" type="button" onClick={() => { setPanel("customer-phone"); setCode(""); setMessage(""); }}>اصلاح شمارهٔ موبایل</button></form>}
      {panel === "admin" && <form className="auth-form" onSubmit={submitAdminLogin}><label htmlFor="admin-phone">شمارهٔ موبایل مدیر</label><input id="admin-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="username" placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷" required /><label htmlFor="admin-password">رمز عبور</label><input id="admin-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="رمز عبور مدیر" required /><button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "در حال ورود…" : "ورود به حساب مدیر"}<Icon name="lock" size={17} /></button></form>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <div className="auth-switch"><span>{customerFlow ? "مدیر هستی؟" : "مشتری هستی؟"}</span><button type="button" onClick={() => { setPanel(customerFlow ? "admin" : "customer-phone"); setMessage(""); }}>{customerFlow ? "ورود مدیر" : "ورود یا ثبت‌نام با موبایل"}</button></div>
    </section>
  </div>;
}

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem("nexora-auth");
      return stored ? (JSON.parse(stored) as AuthResponse).user : null;
    } catch {
      return null;
    }
  });

  function handleAuthenticated(response: AuthResponse) {
    sessionStorage.setItem("nexora-auth", JSON.stringify(response));
    setAuthUser(response.user);
    setIsAuthOpen(false);
  }

  function signOut() {
    sessionStorage.removeItem("nexora-auth");
    setAuthUser(null);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const [categoriesResponse, productsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/catalog/categories/`, { signal: controller.signal }),
          fetch(`${apiBaseUrl}/api/v1/catalog/products/?ordering=newest`, { signal: controller.signal }),
        ]);
        if (!categoriesResponse.ok || !productsResponse.ok) {
          throw new Error("Catalog request failed");
        }

        const categoryData: Category[] = await categoriesResponse.json();
        const productData: ProductListResponse = await productsResponse.json();
        setCategories(categoryData);
        setProducts(productData.results);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, []);

  return <div className="app-shell">
    <div className="announcement">ارسال رایگان برای سفارش‌های بالای ۲ میلیون تومان <span>✦</span> تا ۷ روز ضمانت بازگشت کالا</div>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="خانه نوکسا"><span className="brand-mark">n</span><span>نوکسا</span></a>
      <nav className="desktop-nav" aria-label="ناوبری اصلی"><a href="#products">فروشگاه</a><a href="#categories">دسته‌بندی‌ها</a><a href="#offers">پیشنهادها</a><a href="#about">درباره‌ی ما</a></nav>
      <div className="header-actions"><button className="icon-button" aria-label="جست‌وجو"><Icon name="search" /></button><button className="icon-button" aria-label="علاقه‌مندی‌ها"><Icon name="heart" /></button><button className="cart-button" aria-label="سبد خرید"><Icon name="bag" /><span>۰</span></button>{authUser ? <button className="account-button signed-in" type="button" onClick={signOut}><Icon name="user" size={17} /><span>{authUser.role === "admin" ? "مدیر" : "حساب من"}</span><small>خروج</small></button> : <button className="account-button" type="button" onClick={() => setIsAuthOpen(true)}><Icon name="user" size={17} /><span>ورود | ثبت‌نام</span></button>}<button className="menu-button" aria-label="منو"><Icon name="menu" /></button></div>
    </header>

    <main id="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow">انتخاب‌های تازه، هر روز</p><h1 id="hero-title">هر آنچه دوست داری،<br /><em>همین‌جا پیدا کن.</em></h1><p className="hero-description">از برندهای محبوب تا کشف‌های تازه؛ خریدی مطمئن و ساده، برای لحظه‌های مهم زندگی.</p><div className="hero-actions"><a className="button button-primary" href="#products">مشاهده‌ی محصولات <Icon name="arrow" size={18} /></a><a className="text-link" href="#categories">مشاهده‌ی دسته‌بندی‌ها</a></div><div className="hero-proof"><div className="avatar-stack"><span>م</span><span>س</span><span>ن</span></div><p>انتخاب بیش از <strong>۵۰٬۰۰۰</strong> مشتری</p></div></div>
        <div className="hero-visual"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-image-wrap"><img src="https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1100&q=85" alt="مجموعه‌ای از محصولات منتخب" /></div><div className="floating-card product-float"><span className="float-icon">✦</span><div><small>محبوب این هفته</small><strong>استایل شخصی تو</strong></div></div><div className="floating-card rating-float"><span className="rating-star">★</span><div><strong>۴.۹ از ۵</strong><small>رضایت کاربران</small></div></div></div>
      </section>

      <section className="benefits" aria-label="مزیت‌های خرید"><div><span className="benefit-icon"><Icon name="truck" /></span><p><strong>ارسال سریع</strong><small>تحویل در کوتاه‌ترین زمان</small></p></div><div><span className="benefit-icon"><Icon name="shield" /></span><p><strong>خرید مطمئن</strong><small>ضمانت اصالت و بازگشت</small></p></div><div><span className="benefit-icon"><Icon name="support" /></span><p><strong>پشتیبانی همراه شما</strong><small>پاسخ‌گویی ۲۴ ساعته</small></p></div></section>

      <section className="section categories-section" id="categories" aria-labelledby="categories-title"><div className="section-heading"><div><p className="eyebrow">یک انتخاب برای هر سلیقه</p><h2 id="categories-title">دسته‌بندی‌های محبوب</h2></div><a className="text-link" href="#products">مشاهده همه <Icon name="arrow" size={17} /></a></div><div className="category-grid">{isLoading && <p className="catalog-status">در حال دریافت دسته‌بندی‌ها…</p>}{!isLoading && !error && categories.map((category, index) => <a href={`#${category.slug}`} className={`category-card ${categoryTones[index % categoryTones.length]}`} key={category.id}><span>{categoryIcons[index % categoryIcons.length]}</span><div><h3>{category.name}</h3><p>{category.description || "مشاهده‌ی محصولات"}</p></div><Icon name="arrow" size={17} /></a>)}</div></section>

      <section className="section product-section" id="products" aria-labelledby="products-title"><div className="section-heading"><div><p className="eyebrow">انتخاب‌شده برای شما</p><h2 id="products-title">محصولات تازه</h2></div><a className="text-link" href="#products">مشاهده همه <Icon name="arrow" size={17} /></a></div>{error ? <p className="catalog-status error">دریافت محصولات ممکن نشد. اتصال backend را بررسی کن.</p> : <div className="product-grid">{isLoading && <p className="catalog-status">در حال دریافت محصولات…</p>}{!isLoading && products.length === 0 && <p className="catalog-status">هنوز محصولی برای نمایش وجود ندارد.</p>}{products.map((product) => <article className="product-card" key={product.id}><div className="product-image">{product.primary_image ? <img src={product.primary_image} alt={product.name} /> : <div className="image-fallback">{product.name.slice(0, 1)}</div>}<span className="product-badge">{product.category.name}</span><button className="wish-button" aria-label={`افزودن ${product.name} به علاقه‌مندی‌ها`}><Icon name="heart" size={18} /></button></div><div className="product-content"><div className="product-meta"><span>{product.category.name}</span><span className={product.in_stock ? "in-stock" : "out-of-stock"}>{product.in_stock ? "موجود" : "ناموجود"}</span></div><h3>{product.name}</h3><div className="price-row"><div>{product.compare_at_price && <del>{formatPrice(product.compare_at_price)}</del>}<strong>{formatPrice(product.price)} <small>تومان</small></strong></div>{product.discount_percent > 0 && <b>{product.discount_percent}٪</b>}</div></div></article>)}</div>}</section>

      <section className="member-banner" id="offers"><div><p className="eyebrow">پیشنهاد ویژه‌ی اعضا</p><h2>به جمع نوکسا کلاب بپیوند.</h2><p>از تخفیف‌های شخصی‌سازی‌شده و خبرهای تازه زودتر باخبر شو.</p><a className="button button-dark" href="#join">عضویت در باشگاه <Icon name="arrow" size={18} /></a></div><div className="banner-shape">N<span>+</span></div></section>
    </main>
    <footer id="about"><a className="brand" href="#home"><span className="brand-mark">n</span><span>نوکسا</span></a><p>یک تجربه‌ی ساده‌تر برای انتخاب و خرید بهتر.</p><small>© ۱۴۰۵ نوکسا. تمامی حقوق محفوظ است.</small></footer>
    {isAuthOpen && <AuthDialog onClose={() => setIsAuthOpen(false)} onAuthenticated={handleAuthenticated} />}
  </div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
