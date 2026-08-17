import {
  StrictMode,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
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
type ProductDetail = Product & {
  description: string;
  sku: string;
  images: { id: number; image_url: string | null; alt_text: string }[];
};
type CartItem = {
  id: number;
  product: Product;
  quantity: number;
  line_total: string;
};
type Cart = {
  id: number;
  items: CartItem[];
  item_count: number;
  subtotal: string;
};
type Address = {
  id: number;
  full_name: string;
  phone: string;
  province: string;
  city: string;
  address_line: string;
  postal_code: string;
  is_default: boolean;
};
type AuthUser = { id: number; phone: string; role: "customer" | "admin" };
type AuthResponse = { access: string; refresh: string; user: AuthUser };
type OrderItem = {
  id: number;
  product_name: string;
  product_sku: string;
  unit_price: string;
  quantity: number;
  line_total: string;
};
type OrderStatusEvent = {
  from_status: string;
  to_status: string;
  created_at: string;
};
type Order = {
  number: string;
  status: string;
  subtotal: string;
  expires_at: string | null;
  created_at: string;
  items: OrderItem[];
  status_events: OrderStatusEvent[];
};
type OrdersResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
};
type AdminOrder = Order & {
  customer_phone: string;
  shipping_full_name: string;
  shipping_city: string;
};
type AdminOrdersResponse = Omit<OrdersResponse, "results"> & {
  results: AdminOrder[];
};
type OrderSummary = {
  total: number;
  by_status: Record<string, number>;
};
type ConversationSummary = {
  total: number;
  by_status: Record<Conversation["status"], number>;
  unassigned_open: number;
  unread_customer_messages: number;
};
type Conversation = {
  id: string;
  customer_phone: string;
  last_message_at: string | null;
  status: "open" | "resolved" | "closed";
  assigned_admin: number | null;
  assigned_admin_phone: string | null;
  unread_count: number;
  created_at: string;
};
type ChatMessage = {
  id: number;
  body: string;
  sender_role: "customer" | "admin";
  client_message_id: string | null;
  created_at: string;
  read_at: string | null;
  delivery_status?: "sending" | "failed";
};
type ChatMessagesResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ChatMessage[];
};
type ConversationsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Conversation[];
};
type Route =
  | { name: "home" }
  | { name: "catalog"; category: string | null }
  | { name: "product"; slug: string }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "payment-result" }
  | { name: "profile" }
  | { name: "admin-dashboard" }
  | { name: "admin-orders" }
  | { name: "chat" }
  | { name: "admin-chat" }
  | { name: "not-found" };
const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const categoryIcons = ["⌁", "◒", "⌂", "✦"];
const categoryTones = ["blue", "peach", "mint", "lilac"];

function formatPrice(value: string) {
  return new Intl.NumberFormat("fa-IR").format(Number(value));
}
function getRoute(): Route {
  const parts = location.pathname.split("/").filter(Boolean);
  if (!parts.length) return { name: "home" };
  if (parts[0] === "cart" && parts.length === 1) return { name: "cart" };
  if (parts[0] === "checkout" && parts.length === 1)
    return { name: "checkout" };
  if (parts[0] === "payment-result" && parts.length === 1)
    return { name: "payment-result" };
  if (parts[0] === "profile" && parts.length === 1) return { name: "profile" };
  if (parts[0] === "admin" && parts.length === 1)
    return { name: "admin-dashboard" };
  if (parts[0] === "admin" && parts[1] === "orders" && parts.length === 2)
    return { name: "admin-orders" };
  if (parts[0] === "chat" && parts.length === 1) return { name: "chat" };
  if (parts[0] === "admin" && parts[1] === "chat" && parts.length === 2)
    return { name: "admin-chat" };
  if (parts[0] !== "products") return { name: "not-found" };
  if (parts.length === 1)
    return {
      name: "catalog",
      category: new URLSearchParams(location.search).get("category"),
    };
  return parts.length === 2
    ? { name: "product", slug: decodeURIComponent(parts[1]) }
    : { name: "not-found" };
}
function navigate(path: string) {
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
  scrollTo({ top: 0, behavior: "auto" });
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    bag: (
      <>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="18" cy="18" r="1.5" />
      </>
    ),
    shield: <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />,
    support: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M4 13v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
        <path d="M17 19c0 2-2 2-5 2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function AppLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
function getError(response: Response) {
  return response
    .json()
    .then((body: { detail?: string }) => body.detail ?? "عملیات انجام نشد.")
    .catch(() => "ارتباط با سرور برقرار نشد.");
}
function getStoredAuth() {
  try {
    const raw = sessionStorage.getItem("nexora-auth");
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  } catch {
    return null;
  }
}
function getAccessToken() {
  return getStoredAuth()?.access ?? null;
}
function clearStoredAuth() {
  sessionStorage.removeItem("nexora-auth");
  dispatchEvent(new Event("nexora-auth-expired"));
}
let refreshPromise: Promise<AuthResponse | null> | null = null;
function refreshAccessToken(): Promise<AuthResponse | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const auth = getStoredAuth();
    if (!auth) return null;

    const refreshResponse = await fetch(
      `${apiBaseUrl}/api/v1/auth/token/refresh/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: auth.refresh }),
      },
    );
    if (!refreshResponse.ok) return null;

    const refreshed = (await refreshResponse.json()) as {
      access: string;
      refresh?: string;
    };
    const nextAuth = {
      ...auth,
      access: refreshed.access,
      refresh: refreshed.refresh ?? auth.refresh,
    };
    sessionStorage.setItem("nexora-auth", JSON.stringify(nextAuth));
    return nextAuth;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
function chatSocketUrl(conversationId: string) {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/chat/${conversationId}/`;
  url.search = "";
  return url.toString();
}
async function fetchAuthenticated(path: string, init: RequestInit = {}) {
  const auth = getStoredAuth();
  if (!auth) throw new Error("برای ادامه ابتدا وارد حساب کاربری شو.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${auth.access}`);
  const url = path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
  let response = await fetch(url, { ...init, headers });
  if (response.status !== 401) return response;

  const nextAuth = await refreshAccessToken();
  if (!nextAuth) {
    clearStoredAuth();
    throw new Error("نشست شما منقضی شده است. دوباره وارد حساب کاربری شو.");
  }

  headers.set("Authorization", `Bearer ${nextAuth.access}`);
  response = await fetch(url, { ...init, headers });
  return response;
}

function AuthDialog({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: (response: AuthResponse) => void;
}) {
  const [admin, setAdmin] = useState(false);
  const [codePanel, setCodePanel] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const url = admin
      ? "/api/v1/auth/admin/login/"
      : codePanel
        ? "/api/v1/auth/otp/verify/"
        : "/api/v1/auth/otp/request/";
    const body = admin
      ? { phone, password }
      : codePanel
        ? { phone, code }
        : { phone };
    try {
      const response = await fetch(`${apiBaseUrl}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await getError(response));
      if (!admin && !codePanel) {
        setCodePanel(true);
        setMessage("کد تأیید برای شمارهٔ شما ارسال شد.");
      } else onAuthenticated((await response.json()) as AuthResponse);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "عملیات ناموفق بود.");
    } finally {
      setPending(false);
    }
  }
  const title = admin
    ? "ورود مدیر"
    : codePanel
      ? "کد تأیید را وارد کن"
      : "ورود یا ثبت‌نام";
  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="auth-close"
          type="button"
          onClick={onClose}
          aria-label="بستن پنجره ورود"
        >
          <Icon name="close" />
        </button>
        <div className="auth-brand">
          <span className="brand-mark">n</span>
          <span>نوکسا</span>
        </div>
        <div className="auth-heading">
          <p className="eyebrow">{admin ? "دسترسی مدیریت" : "خوش آمدی"}</p>
          <h2>{title}</h2>
          <p>
            {admin
              ? "ورود مدیر فقط با شمارهٔ ثبت‌شده و رمز عبور انجام می‌شود."
              : codePanel
                ? "کد شش‌رقمی ارسال‌شده را وارد کن."
                : "با شمارهٔ موبایل وارد شو؛ در صورت نیاز حساب ساخته می‌شود."}
          </p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="phone">شمارهٔ موبایل</label>
          <input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            required
          />
          {codePanel && (
            <>
              <label htmlFor="code">کد تأیید</label>
              <input
                id="code"
                className="otp-input"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </>
          )}
          {admin && (
            <>
              <label htmlFor="password">رمز عبور</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </>
          )}
          <button
            className="auth-submit"
            type="submit"
            disabled={pending || (codePanel && code.length !== 6)}
          >
            {pending
              ? "در حال انجام…"
              : admin
                ? "ورود به حساب مدیر"
                : codePanel
                  ? "تأیید و ورود"
                  : "دریافت کد تأیید"}
            <Icon name={admin ? "lock" : "arrow"} size={17} />
          </button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <div className="auth-switch">
          <span>{admin ? "مشتری هستی؟" : "مدیر هستی؟"}</span>
          <button
            type="button"
            onClick={() => {
              setAdmin(!admin);
              setCodePanel(false);
              setMessage("");
            }}
          >
            {admin ? "ورود با موبایل" : "ورود مدیر"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Header({
  user,
  signIn,
  profile,
  cartCount,
}: {
  user: AuthUser | null;
  signIn: () => void;
  profile: () => void;
  cartCount: number;
}) {
  return (
    <>
      <div className="announcement">
        ارسال رایگان برای سفارش‌های بالای ۲ میلیون تومان <span>✦</span> تا ۷ روز
        ضمانت بازگشت کالا
      </div>
      <header className="site-header">
        <AppLink href="/" className="brand">
          <span className="brand-mark">n</span>
          <span>نوکسا</span>
        </AppLink>
        <nav className="desktop-nav">
          <AppLink href="/products">فروشگاه</AppLink>
          <AppLink href="/products">دسته‌بندی‌ها</AppLink>
          <a href="/#offers">پیشنهادها</a>
          <a href="/#about">درباره‌ی ما</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="جست‌وجو">
            <Icon name="search" />
          </button>
          <button className="icon-button" aria-label="علاقه‌مندی‌ها">
            <Icon name="heart" />
          </button>
          <button
            className="cart-button"
            aria-label="سبد خرید"
            onClick={() => navigate("/cart")}
          >
            <Icon name="bag" />
            <span>{formatPrice(String(cartCount))}</span>
          </button>
          {user ? (
            <button
              className="account-button signed-in"
              type="button"
              onClick={profile}
            >
              <Icon name="user" size={17} />
              <span>{user.role === "admin" ? "مدیر" : "پروفایل"}</span>
            </button>
          ) : (
            <button className="account-button" type="button" onClick={signIn}>
              <Icon name="user" size={17} />
              <span>ورود | ثبت‌نام</span>
            </button>
          )}
          <button className="menu-button" aria-label="منو">
            <Icon name="menu" />
          </button>
        </div>
      </header>
    </>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <AppLink
        className="product-card-button"
        href={`/products/${encodeURIComponent(product.slug)}`}
      >
        <div className="product-image">
          {product.primary_image ? (
            <img src={product.primary_image} alt={product.name} />
          ) : (
            <div className="image-fallback">{product.name.slice(0, 1)}</div>
          )}
          <span className="product-badge">{product.category.name}</span>
        </div>
        <div className="product-content">
          <div className="product-meta">
            <span>{product.category.name}</span>
            <span className={product.in_stock ? "in-stock" : "out-of-stock"}>
              {product.in_stock ? "موجود" : "ناموجود"}
            </span>
          </div>
          <h3>{product.name}</h3>
          <div className="price-row">
            <div>
              {product.compare_at_price && (
                <del>{formatPrice(product.compare_at_price)}</del>
              )}
              <strong>
                {formatPrice(product.price)} <small>تومان</small>
              </strong>
            </div>
            {product.discount_percent > 0 && <b>{product.discount_percent}٪</b>}
          </div>
        </div>
      </AppLink>
      <button
        className="wish-button"
        type="button"
        aria-label={`افزودن ${product.name} به علاقه‌مندی‌ها`}
      >
        <Icon name="heart" size={18} />
      </button>
    </article>
  );
}
function useProducts(query: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`${apiBaseUrl}/api/v1/catalog/products/${query}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { results: Product[] }) => setProducts(data.results))
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);
  return { products, loading, error };
}
function ProductGrid({
  products,
  loading,
  error,
}: ReturnType<typeof useProducts>) {
  if (error)
    return (
      <p className="catalog-status error">
        دریافت محصولات ممکن نشد. اتصال `backend` را بررسی کن.
      </p>
    );
  if (loading) return <p className="catalog-status">در حال دریافت محصولات…</p>;
  if (!products.length)
    return (
      <p className="catalog-status">محصولی در این دسته‌بندی وجود ندارد.</p>
    );
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard product={product} key={product.id} />
      ))}
    </div>
  );
}

function HomePage({ categories }: { categories: Category[] }) {
  const catalog = useProducts("?ordering=newest");
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">انتخاب‌های تازه، هر روز</p>
          <h1>
            هر آنچه دوست داری،
            <br />
            <em>همین‌جا پیدا کن.</em>
          </h1>
          <p className="hero-description">
            از برندهای محبوب تا کشف‌های تازه؛ خریدی مطمئن و ساده، برای لحظه‌های
            مهم زندگی.
          </p>
          <div className="hero-actions">
            <AppLink className="button button-primary" href="/products">
              مشاهده‌ی محصولات <Icon name="arrow" size={18} />
            </AppLink>
            <AppLink className="text-link" href="/products">
              مشاهده‌ی دسته‌بندی‌ها
            </AppLink>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-image-wrap">
            <img
              src="https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1100&q=85"
              alt="مجموعه‌ای از محصولات منتخب"
            />
          </div>
        </div>
      </section>
      <section className="benefits">
        <div>
          <Icon name="truck" />
          <p>
            <strong>ارسال سریع</strong>
            <small>تحویل در کوتاه‌ترین زمان</small>
          </p>
        </div>
        <div>
          <Icon name="shield" />
          <p>
            <strong>خرید مطمئن</strong>
            <small>ضمانت اصالت و بازگشت</small>
          </p>
        </div>
        <div>
          <Icon name="support" />
          <p>
            <strong>پشتیبانی همراه شما</strong>
            <small>پاسخ‌گویی ۲۴ ساعته</small>
          </p>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">یک انتخاب برای هر سلیقه</p>
            <h2>دسته‌بندی‌های محبوب</h2>
          </div>
          <AppLink className="text-link" href="/products">
            مشاهده همه <Icon name="arrow" size={17} />
          </AppLink>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <AppLink
              href={`/products?category=${encodeURIComponent(category.slug)}`}
              className={`category-card ${categoryTones[index % categoryTones.length]}`}
              key={category.id}
            >
              <span>{categoryIcons[index % categoryIcons.length]}</span>
              <div>
                <h3>{category.name}</h3>
                <p>{category.description || "مشاهده‌ی محصولات"}</p>
              </div>
              <Icon name="arrow" size={17} />
            </AppLink>
          ))}
        </div>
      </section>
      <section className="section product-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">انتخاب‌شده برای شما</p>
            <h2>محصولات تازه</h2>
          </div>
          <AppLink className="text-link" href="/products">
            مشاهده همه <Icon name="arrow" size={17} />
          </AppLink>
        </div>
        <ProductGrid {...catalog} />
      </section>
      <section className="member-banner" id="offers">
        <div>
          <p className="eyebrow">پیشنهاد ویژه‌ی اعضا</p>
          <h2>به جمع نوکسا کلاب بپیوند.</h2>
          <p>از تخفیف‌های شخصی‌سازی‌شده و خبرهای تازه زودتر باخبر شو.</p>
        </div>
        <div className="banner-shape">
          N<span>+</span>
        </div>
      </section>
    </main>
  );
}
function CatalogPage({
  categories,
  category,
}: {
  categories: Category[];
  category: string | null;
}) {
  const catalog = useProducts(
    category ? `?category=${encodeURIComponent(category)}` : "?ordering=newest",
  );
  const selected = categories.find((item) => item.slug === category);
  return (
    <main className="catalog-page">
      <div className="page-heading">
        <p className="eyebrow">فروشگاه نوکسا</p>
        <h1>{selected ? `محصولات ${selected.name}` : "همه محصولات"}</h1>
        <p>
          {selected?.description ||
            "تمامی محصولات منتشرشده را از این بخش مشاهده و مقایسه کن."}
        </p>
      </div>
      <nav className="category-filter" aria-label="فیلتر دسته‌بندی">
        <AppLink href="/products" className={!category ? "active" : undefined}>
          همه
        </AppLink>
        {categories.map((item) => (
          <AppLink
            href={`/products?category=${encodeURIComponent(item.slug)}`}
            className={item.slug === category ? "active" : undefined}
            key={item.id}
          >
            {item.name}
          </AppLink>
        ))}
      </nav>
      <ProductGrid {...catalog} />
    </main>
  );
}
function CartPage({
  user,
  cart,
  updateItem,
  removeItem,
}: {
  user: AuthUser | null;
  cart: Cart | null;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
}) {
  if (!user) {
    return (
      <PageState
        title="سبد خرید شما خالی است"
        text="برای نگهداری سبد خرید، ابتدا وارد حساب کاربری شو."
      />
    );
  }
  if (!cart) {
    return (
      <main className="page-state">
        <span className="detail-loader" />
        <p>در حال دریافت سبد خرید…</p>
      </main>
    );
  }
  if (!cart.items.length) {
    return (
      <main className="page-state">
        <h1>سبد خرید خالی است</h1>
        <p>هنوز محصولی به سبد خرید اضافه نکرده‌ای.</p>
        <AppLink className="button button-primary" href="/products">
          مشاهده محصولات
        </AppLink>
      </main>
    );
  }
  return (
    <main className="cart-page">
      <div className="page-heading">
        <p className="eyebrow">سبد خرید</p>
        <h1>انتخاب‌های شما</h1>
        <p>{formatPrice(String(cart.item_count))} کالا در سبد خرید داری.</p>
      </div>
      <section className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item) => (
            <article className="cart-item" key={item.id}>
              <AppLink
                href={`/products/${encodeURIComponent(item.product.slug)}`}
                className="cart-image"
              >
                {item.product.primary_image ? (
                  <img
                    src={item.product.primary_image}
                    alt={item.product.name}
                  />
                ) : (
                  <div className="image-fallback">
                    {item.product.name.slice(0, 1)}
                  </div>
                )}
              </AppLink>
              <div className="cart-item-content">
                <p>{item.product.category.name}</p>
                <h2>{item.product.name}</h2>
                <strong>
                  {formatPrice(item.line_total)} <small>تومان</small>
                </strong>
                <div className="quantity-controls">
                  <button
                    type="button"
                    aria-label="کم کردن تعداد"
                    disabled={item.quantity === 1}
                    onClick={() => updateItem(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{formatPrice(String(item.quantity))}</span>
                  <button
                    type="button"
                    aria-label="زیاد کردن تعداد"
                    onClick={() => updateItem(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                className="remove-cart-item"
                type="button"
                onClick={() => removeItem(item.id)}
              >
                حذف
              </button>
            </article>
          ))}
        </div>
        <aside className="cart-summary">
          <h2>خلاصه خرید</h2>
          <div>
            <span>جمع کالاها</span>
            <strong>{formatPrice(cart.subtotal)} تومان</strong>
          </div>
          <div>
            <span>هزینه ارسال</span>
            <strong>در مرحله بعد</strong>
          </div>
          <hr />
          <div className="cart-total">
            <span>مبلغ قابل پرداخت</span>
            <strong>{formatPrice(cart.subtotal)} تومان</strong>
          </div>
          <button
            className="checkout-button"
            type="button"
            onClick={() => navigate("/checkout")}
          >
            ادامه ثبت سفارش
          </button>
          <p>در مرحله بعد، آدرس تحویل را انتخاب می‌کنی.</p>
        </aside>
      </section>
    </main>
  );
}

function CheckoutPage({
  user,
  cart,
}: {
  user: AuthUser | null;
  cart: Cart | null;
}) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    province: "",
    city: "",
    address_line: "",
    postal_code: "",
  });
  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setSelected(null);
      setMessage("");
      return;
    }
    fetchAuthenticated("/api/v1/orders/addresses/")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Address[]) => {
        setAddresses(data);
        setSelected(
          data.find((item) => item.is_default)?.id ?? data[0]?.id ?? null,
        );
      })
      .catch(() => setMessage("دریافت آدرس‌ها ناموفق بود."));
  }, [user?.id]);
  async function createAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetchAuthenticated("/api/v1/orders/addresses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_default: !addresses.length }),
      });
      if (!response.ok) throw new Error(await getError(response));
      const address = (await response.json()) as Address;
      setAddresses((items) => [address, ...items]);
      setSelected(address.id);
      setMessage("آدرس ذخیره شد.");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "ذخیره آدرس ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }
  async function checkout() {
    if (!selected) {
      setMessage("یک آدرس تحویل انتخاب کن.");
      return;
    }
    setPending(true);
    setMessage("");
    let order: Order | null = null;
    try {
      const response = await fetchAuthenticated("/api/v1/orders/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address_id: selected }),
      });
      if (!response.ok) throw new Error(await getError(response));
      order = (await response.json()) as Order;
      setPaymentOrder(order);
      await startPayment(order);
    } catch (reason) {
      setMessage(
        order
          ? `سفارش ثبت شد، اما شروع پرداخت ناموفق بود: ${reason instanceof Error ? reason.message : "خطای ناشناخته"}`
          : reason instanceof Error
            ? reason.message
            : "ثبت سفارش ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }
  async function startPayment(order: Order) {
    const response = await fetchAuthenticated(
      `/api/v1/orders/${order.number}/payment/`,
      { method: "POST" },
    );
    if (!response.ok) throw new Error(await getError(response));
    const payment = (await response.json()) as { authorization_url: string };
    location.assign(payment.authorization_url);
  }
  async function retryPayment() {
    if (!paymentOrder) return;
    setPending(true);
    setMessage("");
    try {
      await startPayment(paymentOrder);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "شروع پرداخت ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }
  if (!user)
    return (
      <PageState
        title="برای ثبت سفارش وارد شو"
        text="آدرس‌ها و سفارش‌ها به حساب کاربری شما متصل می‌شوند."
      />
    );
  if (!cart?.items.length && !message)
    return (
      <PageState
        title="سبد خرید خالی است"
        text="برای ثبت سفارش ابتدا محصولی به سبد اضافه کن."
      />
    );
  return (
    <main className="checkout-page">
      <div className="page-heading">
        <p className="eyebrow">تکمیل خرید</p>
        <h1>نشانی تحویل</h1>
        <p>یک آدرس ذخیره‌شده را انتخاب کن یا نشانی جدیدی بساز.</p>
      </div>
      <div className="checkout-layout">
        <section className="address-section">
          <h2>آدرس‌های شما</h2>
          {addresses.map((address) => (
            <label
              className={
                selected === address.id
                  ? "address-card selected"
                  : "address-card"
              }
              key={address.id}
            >
              <input
                type="radio"
                checked={selected === address.id}
                onChange={() => setSelected(address.id)}
              />
              <span>
                <strong>{address.full_name}</strong>
                <small>
                  {address.province}، {address.city} — {address.address_line}
                </small>
                <small dir="ltr">{address.phone}</small>
              </span>
            </label>
          ))}
          <form className="address-form" onSubmit={createAddress}>
            <h2>افزودن آدرس جدید</h2>
            <input
              placeholder="نام و نام خانوادگی"
              value={form.full_name}
              onChange={(event) =>
                setForm({ ...form, full_name: event.target.value })
              }
              required
            />
            <input
              placeholder="شماره موبایل"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              required
            />
            <div>
              <input
                placeholder="استان"
                value={form.province}
                onChange={(event) =>
                  setForm({ ...form, province: event.target.value })
                }
                required
              />
              <input
                placeholder="شهر"
                value={form.city}
                onChange={(event) =>
                  setForm({ ...form, city: event.target.value })
                }
                required
              />
            </div>
            <textarea
              placeholder="نشانی کامل"
              value={form.address_line}
              onChange={(event) =>
                setForm({ ...form, address_line: event.target.value })
              }
              required
            />
            <input
              placeholder="کد پستی"
              value={form.postal_code}
              onChange={(event) =>
                setForm({ ...form, postal_code: event.target.value })
              }
              required
            />
            <button type="submit" disabled={pending}>
              ذخیره آدرس
            </button>
          </form>
        </section>
        <aside className="cart-summary">
          <h2>جمع سفارش</h2>
          <div>
            <span>جمع کالاها</span>
            <strong>
              {cart ? `${formatPrice(cart.subtotal)} تومان` : "—"}
            </strong>
          </div>
          <hr />
          <div className="cart-total">
            <span>مبلغ سفارش</span>
            <strong>
              {cart ? `${formatPrice(cart.subtotal)} تومان` : "—"}
            </strong>
          </div>
          <button
            className="checkout-button"
            type="button"
            disabled={pending || (!cart?.items.length && !paymentOrder)}
            onClick={() => void (paymentOrder ? retryPayment() : checkout())}
          >
            {paymentOrder ? "تلاش دوباره برای پرداخت" : "ثبت سفارش و پرداخت"}
          </button>
          <p>پس از ثبت سفارش به درگاه پرداخت هدایت می‌شوی.</p>
          {message && <p className="cart-message">{message}</p>}
        </aside>
      </div>
    </main>
  );
}

function PaymentResultPage() {
  const query = new URLSearchParams(location.search);
  const paid = query.get("status") === "paid";
  const order = query.get("order");
  const referenceId = query.get("ref_id");
  return (
    <main className="page-state">
      <h1>{paid ? "پرداخت با موفقیت تأیید شد" : "پرداخت ناموفق بود"}</h1>
      <p>
        {paid
          ? "سفارش شما ثبت و پرداخت آن تأیید شد."
          : "پرداخت تأیید نشد؛ در صورت باقی‌بودن زمان سفارش، دوباره تلاش کن."}
      </p>
      {order && <p>شماره سفارش: {order}</p>}
      {paid && referenceId && <p>شماره پیگیری: {referenceId}</p>}
      <AppLink className="button button-primary" href="/products">
        بازگشت به محصولات
      </AppLink>
    </main>
  );
}

const orderStatusLabels: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال پردازش",
  shipped: "ارسال‌شده",
  expired: "منقضی‌شده",
  cancelled: "لغوشده",
};
const adminStatusTargets: Record<string, string[]> = {
  pending: ["cancelled"],
  paid: ["processing", "shipped"],
  processing: ["shipped"],
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ProfilePage({
  user,
  onSignOut,
}: {
  user: AuthUser | null;
  onSignOut: () => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [ordersResponse, setOrdersResponse] = useState<OrdersResponse | null>(
    null,
  );
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetchAuthenticated(`/api/v1/orders/?page=${page}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json() as Promise<OrdersResponse>;
      })
      .then((data) => {
        setOrders(data.results);
        setOrdersResponse(data);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "دریافت سفارش‌ها ناموفق بود.",
        ),
      )
      .finally(() => setLoading(false));
  }, [page, user?.id]);
  if (!user)
    return (
      <PageState
        title="برای مشاهده پروفایل وارد شو"
        text="اطلاعات حساب و سفارش‌ها به حساب کاربری شما متصل هستند."
      />
    );
  return (
    <main className="profile-page">
      <div className="page-heading">
        <p className="eyebrow">
          {user.role === "admin" ? "حساب مدیریت" : "حساب کاربری"}
        </p>
        <h1>{user.role === "admin" ? "پروفایل مدیر" : "پروفایل من"}</h1>
        <p>اطلاعات حساب و سفارش‌های ثبت‌شدهٔ خودت را اینجا ببین.</p>
      </div>
      <section className="profile-summary">
        <div className="profile-avatar">
          <Icon name="user" size={29} />
        </div>
        <dl className="profile-details">
          <div>
            <dt>شمارهٔ موبایل</dt>
            <dd dir="ltr">{user.phone}</dd>
          </div>
          <div>
            <dt>نوع حساب</dt>
            <dd>{user.role === "admin" ? "مدیر" : "مشتری"}</dd>
          </div>
        </dl>
        <button className="signout-button" type="button" onClick={onSignOut}>
          خروج از حساب
        </button>
        {user.role === "admin" && (
          <div className="profile-admin-actions">
            <AppLink className="admin-dashboard-link" href="/admin">
              نمای کلی مدیریت
            </AppLink>
            <AppLink className="admin-dashboard-link" href="/admin/orders">
              مدیریت سفارش‌ها
            </AppLink>
            <AppLink className="admin-dashboard-link" href="/admin/chat">
              گفت‌وگوهای پشتیبانی
            </AppLink>
          </div>
        )}
        {user.role === "customer" && (
          <AppLink className="admin-dashboard-link" href="/chat">
            گفت‌وگو با پشتیبانی
          </AppLink>
        )}
      </section>
      <section className="orders-section">
        <div className="orders-heading">
          <div>
            <p className="eyebrow">پیگیری خرید</p>
            <h2>سفارش‌های من</h2>
          </div>
          <span>{ordersResponse?.count ?? 0} سفارش</span>
        </div>
        {loading ? (
          <p className="orders-state">در حال دریافت سفارش‌ها…</p>
        ) : error ? (
          <p className="orders-state error">{error}</p>
        ) : !orders.length ? (
          <p className="orders-state">هنوز سفارشی ثبت نکرده‌ای.</p>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.number}>
                <div className="order-card-header">
                  <div>
                    <span>کد سفارش</span>
                    <strong dir="ltr">{order.number}</strong>
                  </div>
                  <span className={`order-status ${order.status}`}>
                    {orderStatusLabels[order.status] ?? order.status}
                  </span>
                </div>
                <dl className="order-meta">
                  <div>
                    <dt>زمان ثبت</dt>
                    <dd>{formatDate(order.created_at)}</dd>
                  </div>
                  <div>
                    <dt>مبلغ</dt>
                    <dd>{formatPrice(order.subtotal)} تومان</dd>
                  </div>
                  {order.status === "pending" && order.expires_at && (
                    <div>
                      <dt>مهلت پرداخت</dt>
                      <dd>{formatDate(order.expires_at)}</dd>
                    </div>
                  )}
                </dl>
                <ul className="order-items">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.product_name}</span>
                      <span>
                        {item.quantity} × {formatPrice(item.unit_price)} تومان
                      </span>
                    </li>
                  ))}
                </ul>
                {!!order.status_events.length && (
                  <ol className="order-status-history">
                    {order.status_events.map((event, index) => (
                      <li key={`${event.created_at}-${index}`}>
                        <span>
                          {orderStatusLabels[event.to_status] ??
                            event.to_status}
                        </span>
                        <time dateTime={event.created_at}>
                          {formatDate(event.created_at)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        )}
        {!loading &&
          !error &&
          ordersResponse &&
          (ordersResponse.next || ordersResponse.previous) && (
            <nav className="orders-pagination" aria-label="صفحه‌بندی سفارش‌ها">
              <button
                type="button"
                disabled={!ordersResponse.next}
                onClick={() => setPage((current) => current + 1)}
              >
                سفارش‌های قدیمی‌تر
              </button>
              <span>صفحه {page}</span>
              <button
                type="button"
                disabled={!ordersResponse.previous}
                onClick={() => setPage((current) => current - 1)}
              >
                سفارش‌های جدیدتر
              </button>
            </nav>
          )}
      </section>
    </main>
  );
}

function AdminDashboardPage({ user }: { user: AuthUser | null }) {
  const [orders, setOrders] = useState<OrderSummary | null>(null);
  const [conversations, setConversations] =
    useState<ConversationSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") return;
    setError("");
    Promise.all([
      fetchAuthenticated("/api/v1/orders/admin/summary/"),
      fetchAuthenticated("/api/v1/chat/conversations/summary/"),
    ])
      .then(async ([ordersResponse, conversationsResponse]) => {
        if (!ordersResponse.ok) throw new Error(await getError(ordersResponse));
        if (!conversationsResponse.ok)
          throw new Error(await getError(conversationsResponse));
        const [orderData, conversationData] = await Promise.all([
          ordersResponse.json() as Promise<OrderSummary>,
          conversationsResponse.json() as Promise<ConversationSummary>,
        ]);
        setOrders(orderData);
        setConversations(conversationData);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "دریافت نمای کلی مدیریت ناموفق بود.",
        ),
      );
  }, [user?.id, user?.role]);

  if (user?.role !== "admin")
    return (
      <PageState
        title="دسترسی ندارید"
        text="این صفحه فقط برای حساب‌های مدیر در دسترس است."
      />
    );

  if (error) return <PageState title="نمای کلی در دسترس نیست" text={error} />;

  return (
    <main className="profile-page admin-dashboard-page">
      <div className="page-heading">
        <p className="eyebrow">مرکز عملیات</p>
        <h1>نمای کلی مدیریت</h1>
        <p>وضعیت سفارش‌ها و صف پشتیبانی را در یک نگاه پیگیری کن.</p>
      </div>
      {!orders || !conversations ? (
        <p className="orders-state">در حال دریافت نمای کلی…</p>
      ) : (
        <div className="admin-overview-grid">
          <section className="admin-overview-card">
            <div className="admin-overview-heading">
              <div>
                <p className="eyebrow">فروش</p>
                <h2>سفارش‌ها</h2>
              </div>
              <strong>{orders.total}</strong>
            </div>
            <dl className="admin-overview-metrics">
              <div>
                <dt>در انتظار پرداخت</dt>
                <dd>{orders.by_status.pending ?? 0}</dd>
              </div>
              <div>
                <dt>آمادهٔ رسیدگی</dt>
                <dd>{orders.by_status.paid ?? 0}</dd>
              </div>
              <div>
                <dt>در حال ارسال</dt>
                <dd>{orders.by_status.processing ?? 0}</dd>
              </div>
              <div>
                <dt>ارسال‌شده</dt>
                <dd>{orders.by_status.shipped ?? 0}</dd>
              </div>
            </dl>
            <AppLink className="admin-dashboard-link" href="/admin/orders">
              مدیریت سفارش‌ها
            </AppLink>
          </section>
          <section className="admin-overview-card">
            <div className="admin-overview-heading">
              <div>
                <p className="eyebrow">پشتیبانی</p>
                <h2>گفت‌وگوها</h2>
              </div>
              <strong>{conversations.total}</strong>
            </div>
            <dl className="admin-overview-metrics">
              <div>
                <dt>گفت‌وگوی باز</dt>
                <dd>{conversations.by_status.open ?? 0}</dd>
              </div>
              <div>
                <dt>بدون مسئول</dt>
                <dd>{conversations.unassigned_open}</dd>
              </div>
              <div>
                <dt>پیام خوانده‌نشده</dt>
                <dd>{conversations.unread_customer_messages}</dd>
              </div>
              <div>
                <dt>حل‌شده</dt>
                <dd>{conversations.by_status.resolved ?? 0}</dd>
              </div>
            </dl>
            <AppLink className="admin-dashboard-link" href="/admin/chat">
              گفت‌وگوهای پشتیبانی
            </AppLink>
          </section>
        </div>
      )}
    </main>
  );
}

function AdminOrdersPage({ user }: { user: AuthUser | null }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersResponse, setOrdersResponse] =
    useState<AdminOrdersResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    if (query) params.set("query", query);
    setLoading(true);
    setError("");
    fetchAuthenticated(`/api/v1/orders/admin/?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json() as Promise<AdminOrdersResponse>;
      })
      .then((data) => {
        setOrders(data.results);
        setOrdersResponse(data);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "دریافت سفارش‌ها ناموفق بود.",
        ),
      )
      .finally(() => setLoading(false));
  }, [page, query, statusFilter, user?.id, user?.role]);

  async function updateStatus(order: AdminOrder, nextStatus: string) {
    setUpdating(order.number);
    setError("");
    try {
      const response = await fetchAuthenticated(
        `/api/v1/orders/admin/${order.number}/status/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      const updated = (await response.json()) as AdminOrder;
      setOrders((current) =>
        current.map((item) =>
          item.number === updated.number ? updated : item,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تغییر وضعیت ناموفق بود.",
      );
    } finally {
      setUpdating(null);
    }
  }

  if (user?.role !== "admin")
    return (
      <PageState
        title="دسترسی ندارید"
        text="این بخش فقط برای حساب‌های مدیر در دسترس است."
      />
    );

  return (
    <main className="profile-page admin-orders-page">
      <div className="page-heading">
        <p className="eyebrow">مدیریت فروش</p>
        <h1>سفارش‌ها</h1>
        <p>
          سفارش‌های پرداخت‌شده را بررسی کن و فقط در مسیر ارسال آن‌ها را جلو ببر.
        </p>
      </div>
      <section className="orders-section">
        <form
          className="admin-orders-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(queryInput.trim());
          }}
        >
          <input
            aria-label="جست‌وجوی سفارش"
            placeholder="کد سفارش یا شمارهٔ مشتری"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
          />
          <select
            aria-label="وضعیت سفارش"
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="">همهٔ وضعیت‌ها</option>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit">جست‌وجو</button>
        </form>
        <div className="orders-heading">
          <div>
            <p className="eyebrow">صف سفارش</p>
            <h2>مدیریت چرخهٔ ارسال</h2>
          </div>
          <span>{ordersResponse?.count ?? 0} سفارش</span>
        </div>
        {loading ? (
          <p className="orders-state">در حال دریافت سفارش‌ها…</p>
        ) : error ? (
          <p className="orders-state error">{error}</p>
        ) : !orders.length ? (
          <p className="orders-state">سفارشی با این فیلتر پیدا نشد.</p>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const allowedTargets = adminStatusTargets[order.status] ?? [];
              return (
                <article
                  className="order-card admin-order-card"
                  key={order.number}
                >
                  <div className="order-card-header">
                    <div>
                      <span>کد سفارش</span>
                      <strong dir="ltr">{order.number}</strong>
                    </div>
                    <span className={`order-status ${order.status}`}>
                      {orderStatusLabels[order.status] ?? order.status}
                    </span>
                  </div>
                  <dl className="order-meta">
                    <div>
                      <dt>مشتری</dt>
                      <dd>{order.shipping_full_name}</dd>
                    </div>
                    <div>
                      <dt>شمارهٔ تماس</dt>
                      <dd dir="ltr">{order.customer_phone}</dd>
                    </div>
                    <div>
                      <dt>شهر مقصد</dt>
                      <dd>{order.shipping_city}</dd>
                    </div>
                    <div>
                      <dt>مبلغ</dt>
                      <dd>{formatPrice(order.subtotal)} تومان</dd>
                    </div>
                  </dl>
                  <div className="admin-order-footer">
                    <span>{order.items.length} قلم کالا</span>
                    <label className="admin-status-control">
                      <span>تغییر وضعیت</span>
                      <select
                        value={order.status}
                        disabled={
                          !allowedTargets.length || updating === order.number
                        }
                        onChange={(event) => {
                          if (event.target.value !== order.status)
                            void updateStatus(order, event.target.value);
                        }}
                      >
                        <option value={order.status}>
                          {orderStatusLabels[order.status] ?? order.status}
                        </option>
                        {allowedTargets.map((target) => (
                          <option key={target} value={target}>
                            {orderStatusLabels[target] ?? target}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!loading &&
          !error &&
          ordersResponse &&
          (ordersResponse.next || ordersResponse.previous) && (
            <nav className="orders-pagination" aria-label="صفحه‌بندی سفارش‌ها">
              <button
                type="button"
                disabled={!ordersResponse.next}
                onClick={() => setPage((current) => current + 1)}
              >
                سفارش‌های قدیمی‌تر
              </button>
              <span>صفحه {page}</span>
              <button
                type="button"
                disabled={!ordersResponse.previous}
                onClick={() => setPage((current) => current - 1)}
              >
                سفارش‌های جدیدتر
              </button>
            </nav>
          )}
      </section>
    </main>
  );
}

function ChatThread({
  conversation,
  user,
}: {
  conversation: Conversation;
  user: AuthUser;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  function appendMessage(message: ChatMessage) {
    setMessages((current) => {
      const optimisticIndex = message.client_message_id
        ? current.findIndex(
            (item) => item.client_message_id === message.client_message_id,
          )
        : -1;
      if (optimisticIndex >= 0) {
        const next = [...current];
        next[optimisticIndex] = message;
        return next;
      }
      return current.some((item) => item.id === message.id)
        ? current
        : [...current, message];
    });
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    setMessages([]);
    setNextPage(null);
    fetchAuthenticated(
      `/api/v1/chat/conversations/${conversation.id}/messages/`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json() as Promise<ChatMessagesResponse>;
      })
      .then((data) => {
        setMessages([...data.results].reverse());
        setNextPage(data.next);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "دریافت پیام‌ها ناموفق بود.",
        ),
      )
      .finally(() => setLoading(false));
  }, [conversation.id]);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    let disposed = false;
    const connect = () => {
      let socket: WebSocket;
      try {
        socket = new WebSocket(chatSocketUrl(conversation.id), [
          "access_token",
          accessToken,
        ]);
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;
      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setConnected(true);
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type: string;
            message?: ChatMessage;
            detail?: string;
          };
          if (payload.type === "message" && payload.message)
            appendMessage(payload.message);
          if (payload.type === "error")
            setError(payload.detail ?? "ارسال پیام ناموفق بود.");
        } catch {
          setError("پاسخ نامعتبر از سرویس گفت‌وگو دریافت شد.");
        }
      };
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        setConnected(false);
        scheduleReconnect();
      };
      socket.onerror = () => socket.close();
    };
    const scheduleReconnect = () => {
      if (disposed || reconnectTimerRef.current !== null) return;
      const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 30000);
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };
    connect();
    return () => {
      disposed = true;
      if (reconnectTimerRef.current !== null)
        window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [conversation.id]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text || pending) return;
    setPending(true);
    setError("");
    setBody("");
    const clientMessageId = crypto.randomUUID();
    const optimisticMessage: ChatMessage = {
      id: -Date.now(),
      body: text,
      sender_role: user.role,
      client_message_id: clientMessageId,
      created_at: new Date().toISOString(),
      read_at: null,
      delivery_status: "sending",
    };
    appendMessage(optimisticMessage);
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({ body: text, client_message_id: clientMessageId }),
      );
      setPending(false);
      return;
    }
    try {
      const response = await fetchAuthenticated(
        `/api/v1/chat/conversations/${conversation.id}/messages/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: text,
            client_message_id: clientMessageId,
          }),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      appendMessage((await response.json()) as ChatMessage);
    } catch (reason) {
      setMessages((current) =>
        current.map((message) =>
          message.client_message_id === clientMessageId
            ? { ...message, delivery_status: "failed" }
            : message,
        ),
      );
      setError(
        reason instanceof Error ? reason.message : "ارسال پیام ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }

  async function loadOlderMessages() {
    if (!nextPage || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const response = await fetchAuthenticated(nextPage);
      if (!response.ok) throw new Error(await getError(response));
      const data = (await response.json()) as ChatMessagesResponse;
      setMessages((current) => [...data.results.reverse(), ...current]);
      setNextPage(data.next);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "دریافت پیام‌های قدیمی ناموفق بود.",
      );
    } finally {
      setLoadingOlder(false);
    }
  }

  return (
    <section className="chat-thread">
      <div className="chat-thread-header">
        <div>
          <p className="eyebrow">
            {user.role === "admin" ? "گفت‌وگوی مشتری" : "پشتیبانی آنلاین"}
          </p>
          <h2>
            {user.role === "admin"
              ? conversation.customer_phone
              : "گفت‌وگو با پشتیبانی"}
          </h2>
        </div>
        <span
          className={connected ? "chat-connection online" : "chat-connection"}
        >
          {connected ? "متصل" : "اتصال در حال بازیابی"}
        </span>
      </div>
      <div className="chat-messages" aria-live="polite">
        {nextPage && !loading && (
          <button
            className="chat-load-older"
            type="button"
            disabled={loadingOlder}
            onClick={loadOlderMessages}
          >
            {loadingOlder ? "در حال دریافت…" : "پیام‌های قدیمی‌تر"}
          </button>
        )}
        {loading ? (
          <p className="orders-state">در حال دریافت پیام‌ها…</p>
        ) : !messages.length ? (
          <p className="orders-state">اولین پیام را ارسال کن.</p>
        ) : (
          messages.map((message) => (
            <article
              className={
                message.sender_role === user.role
                  ? "chat-message own"
                  : "chat-message"
              }
              key={message.id}
            >
              <p>{message.body}</p>
              <time dateTime={message.created_at}>
                {formatDate(message.created_at)}
              </time>
              {message.delivery_status && (
                <span
                  className={`chat-message-status ${message.delivery_status}`}
                >
                  {message.delivery_status === "sending"
                    ? "در حال ارسال"
                    : "ارسال ناموفق"}
                </span>
              )}
            </article>
          ))
        )}
      </div>
      <form className="chat-composer" onSubmit={sendMessage}>
        <input
          aria-label="متن پیام"
          placeholder="پیام خود را بنویس…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
        />
        <button type="submit" disabled={pending || !body.trim()}>
          {pending ? "در حال ارسال…" : "ارسال پیام"}
        </button>
      </form>
      {error && <p className="orders-state error">{error}</p>}
    </section>
  );
}

function ChatPage({ user }: { user: AuthUser | null }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user?.role !== "customer") return;
    fetchAuthenticated("/api/v1/chat/conversation/")
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json() as Promise<Conversation>;
      })
      .then(setConversation)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "شروع گفت‌وگو ناموفق بود.",
        ),
      );
  }, [user?.id, user?.role]);
  if (user?.role !== "customer")
    return (
      <PageState
        title="دسترسی ندارید"
        text="این صفحه برای حساب‌های مشتری است."
      />
    );
  return (
    <main className="profile-page chat-page">
      <div className="page-heading">
        <p className="eyebrow">پشتیبانی</p>
        <h1>گفت‌وگو با پشتیبانی</h1>
        <p>پیام‌های شما ذخیره می‌شوند و مدیران فروشگاه پاسخ می‌دهند.</p>
      </div>
      {conversation ? (
        <ChatThread conversation={conversation} user={user} />
      ) : error ? (
        <p className="orders-state error">{error}</p>
      ) : (
        <p className="orders-state">در حال آماده‌سازی گفت‌وگو…</p>
      )}
    </main>
  );
}

function CustomerChatWidget({
  user,
  onClose,
}: {
  user: AuthUser;
  onClose: () => void;
}) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchAuthenticated("/api/v1/chat/conversation/")
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json() as Promise<Conversation>;
      })
      .then(setConversation)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "شروع گفت‌وگو ناموفق بود.",
        ),
      );
  }, [user.id]);
  return (
    <aside className="chat-widget" aria-label="گفت‌وگو با پشتیبانی">
      <button
        className="chat-widget-close"
        type="button"
        onClick={onClose}
        aria-label="بستن گفت‌وگو"
      >
        <Icon name="close" size={19} />
      </button>
      {conversation ? (
        <ChatThread conversation={conversation} user={user} />
      ) : error ? (
        <p className="orders-state error">{error}</p>
      ) : (
        <p className="orders-state">در حال آماده‌سازی گفت‌وگو…</p>
      )}
    </aside>
  );
}

function AdminChatPage({ user }: { user: AuthUser | null }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchAuthenticated("/api/v1/chat/conversations/")
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json() as Promise<ConversationsResponse>;
      })
      .then((data) => {
        setConversations(data.results);
        setSelectedId(data.results[0]?.id ?? null);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "دریافت گفت‌وگوها ناموفق بود.",
        ),
      )
      .finally(() => setLoading(false));
  }, [user?.id, user?.role]);
  async function updateConversation(
    conversation: Conversation,
    patch: Partial<Pick<Conversation, "status" | "assigned_admin">>,
  ) {
    setUpdating(true);
    setError("");
    try {
      const response = await fetchAuthenticated(
        `/api/v1/chat/conversations/${conversation.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      const updated = (await response.json()) as Conversation;
      setConversations((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "به‌روزرسانی ناموفق بود.",
      );
    } finally {
      setUpdating(false);
    }
  }
  if (user?.role !== "admin")
    return (
      <PageState
        title="دسترسی ندارید"
        text="این صفحه فقط برای حساب‌های مدیر است."
      />
    );
  const selected = conversations.find((item) => item.id === selectedId) ?? null;
  return (
    <main className="profile-page admin-chat-page">
      <div className="page-heading">
        <p className="eyebrow">پشتیبانی</p>
        <h1>گفت‌وگوهای مشتریان</h1>
        <p>هر گفت‌وگو به یک مشتری متصل است و همهٔ پیام‌ها تاریخچه دارند.</p>
      </div>
      {loading ? (
        <p className="orders-state">در حال دریافت گفت‌وگوها…</p>
      ) : error ? (
        <p className="orders-state error">{error}</p>
      ) : !conversations.length ? (
        <p className="orders-state">
          هنوز هیچ مشتری گفت‌وگویی را شروع نکرده است.
        </p>
      ) : (
        <div className="admin-chat-layout">
          <aside className="conversation-list" aria-label="فهرست گفت‌وگوها">
            {conversations.map((conversation) => (
              <button
                className={
                  conversation.id === selectedId
                    ? "conversation-list-item active"
                    : "conversation-list-item"
                }
                type="button"
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
              >
                <strong dir="ltr">{conversation.customer_phone}</strong>
                <span>
                  {conversation.unread_count
                    ? `${conversation.unread_count} پیام خوانده‌نشده`
                    : conversation.status === "open"
                      ? "باز"
                      : conversation.status === "resolved"
                        ? "حل‌شده"
                        : "بسته"}
                </span>
                <span>
                  {conversation.last_message_at
                    ? formatDate(conversation.last_message_at)
                    : "بدون پیام"}
                </span>
              </button>
            ))}
          </aside>
          {selected && (
            <div>
              <div className="conversation-management">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() =>
                    updateConversation(selected, {
                      assigned_admin:
                        selected.assigned_admin === user.id ? null : user.id,
                    })
                  }
                >
                  {selected.assigned_admin === user.id
                    ? "برداشتن از من"
                    : "تخصیص به من"}
                </button>
                <select
                  value={selected.status}
                  disabled={updating}
                  onChange={(event) =>
                    updateConversation(selected, {
                      status: event.target.value as Conversation["status"],
                    })
                  }
                >
                  <option value="open">باز</option>
                  <option value="resolved">حل‌شده</option>
                  <option value="closed">بسته</option>
                </select>
              </div>
              <ChatThread conversation={selected} user={user} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function ProductPage({
  slug,
  addToCart,
}: {
  slug: string;
  addToCart: (productId: number) => Promise<void>;
}) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setSelectedImage(null);
    setError(false);
    fetch(
      `${apiBaseUrl}/api/v1/catalog/products/${encodeURIComponent(slug)}/`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: ProductDetail) => {
        setProduct(data);
        setSelectedImage(
          data.images.find((image) => image.image_url)?.image_url ??
            data.primary_image,
        );
      })
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setError(true);
      });
    return () => controller.abort();
  }, [slug]);
  if (error)
    return (
      <PageState
        title="محصول پیدا نشد"
        text="این محصول در دسترس نیست یا انتشار آن متوقف شده است."
      />
    );
  if (!product)
    return (
      <main className="page-state">
        <span className="detail-loader" />
        <p>در حال دریافت اطلاعات محصول…</p>
      </main>
    );
  const images = product.images.filter((image) => image.image_url);
  const image = selectedImage ?? product.primary_image;
  return (
    <main className="product-page">
      <div className="breadcrumbs">
        <AppLink href="/">خانه</AppLink>
        <span>/</span>
        <AppLink
          href={`/products?category=${encodeURIComponent(product.category.slug)}`}
        >
          {product.category.name}
        </AppLink>
        <span>/</span>
        <span>{product.name}</span>
      </div>
      <section className="product-detail-layout">
        <div className="detail-gallery">
          <div className="detail-main-image">
            {image ? (
              <img src={image} alt={product.name} />
            ) : (
              <div className="image-fallback">{product.name.slice(0, 1)}</div>
            )}
            {product.discount_percent > 0 && (
              <span className="detail-discount">
                {product.discount_percent}٪ تخفیف
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="detail-thumbnails">
              {images.map((item) => (
                <button
                  className={
                    item.image_url === image ? "thumbnail active" : "thumbnail"
                  }
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedImage(item.image_url)}
                >
                  <img
                    src={item.image_url ?? ""}
                    alt={item.alt_text || product.name}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-content">
          <p className="eyebrow">{product.category.name}</p>
          <h1>{product.name}</h1>
          <p
            className={
              product.in_stock
                ? "detail-stock available"
                : "detail-stock unavailable"
            }
          >
            {product.in_stock ? "موجود در انبار" : "ناموجود"}
          </p>
          <div className="detail-price">
            {product.compare_at_price && (
              <del>{formatPrice(product.compare_at_price)} تومان</del>
            )}
            <strong>
              {formatPrice(product.price)} <small>تومان</small>
            </strong>
          </div>
          <p className="detail-description">
            {product.description ||
              product.short_description ||
              "توضیحی برای این محصول ثبت نشده است."}
          </p>
          <dl className="detail-meta">
            <div>
              <dt>کد کالا</dt>
              <dd dir="ltr">{product.sku}</dd>
            </div>
            <div>
              <dt>دسته‌بندی</dt>
              <dd>{product.category.name}</dd>
            </div>
          </dl>
          <div className="detail-notice">
            <Icon name="shield" size={19} />
            <span>ضمانت اصالت کالا و امکان بازگشت طبق شرایط فروشگاه</span>
          </div>
          <button
            className="add-to-cart-button"
            type="button"
            disabled={!product.in_stock || adding}
            onClick={async () => {
              setAdding(true);
              setCartMessage("");
              try {
                await addToCart(product.id);
                setCartMessage("محصول به سبد خرید اضافه شد.");
              } catch (reason) {
                setCartMessage(
                  reason instanceof Error
                    ? reason.message
                    : "افزودن به سبد ناموفق بود.",
                );
              } finally {
                setAdding(false);
              }
            }}
          >
            {adding
              ? "در حال افزودن…"
              : product.in_stock
                ? "افزودن به سبد خرید"
                : "ناموجود"}
            <Icon name="bag" size={18} />
          </button>
          {cartMessage && <p className="cart-message">{cartMessage}</p>}
        </div>
      </section>
    </main>
  );
}
function PageState({ title, text }: { title: string; text: string }) {
  return (
    <main className="page-state">
      <h1>{title}</h1>
      <p>{text}</p>
      <AppLink className="button button-primary" href="/products">
        بازگشت به محصولات
      </AppLink>
    </main>
  );
}

function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [openChatAfterAuth, setOpenChatAfterAuth] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [user, setUser] = useState<AuthUser | null>(
    () => getStoredAuth()?.user ?? null,
  );
  useEffect(() => {
    const update = () => setRoute(getRoute());
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    const expireSession = () => {
      setUser(null);
      setCart(null);
      setChatOpen(false);
      setAuthOpen(true);
    };
    addEventListener("nexora-auth-expired", expireSession);
    return () => removeEventListener("nexora-auth-expired", expireSession);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBaseUrl}/api/v1/catalog/categories/`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Category[]) => setCategories(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  async function loadCart() {
    if (!getAccessToken()) {
      setCart(null);
      return;
    }
    const response = await fetchAuthenticated("/api/v1/cart/");
    if (!response.ok) throw new Error(await getError(response));
    setCart((await response.json()) as Cart);
  }
  useEffect(() => {
    void loadCart().catch(() => setCart(null));
  }, [user]);
  async function mutateCart(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: object,
  ) {
    const response = await fetchAuthenticated(`/api/v1/cart/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(await getError(response));
    setCart((await response.json()) as Cart);
  }
  function openChat() {
    if (!user) {
      setOpenChatAfterAuth(true);
      setAuthOpen(true);
      return;
    }
    if (user.role === "admin") {
      navigate("/admin/chat");
      return;
    }
    setChatOpen(true);
  }
  const page =
    route.name === "home" ? (
      <HomePage categories={categories} />
    ) : route.name === "catalog" ? (
      <CatalogPage categories={categories} category={route.category} />
    ) : route.name === "product" ? (
      <ProductPage
        slug={route.slug}
        addToCart={(productId) =>
          mutateCart("items/", "POST", { product_id: productId })
        }
      />
    ) : route.name === "cart" ? (
      <CartPage
        user={user}
        cart={cart}
        updateItem={(itemId, quantity) =>
          mutateCart(`items/${itemId}/`, "PATCH", { quantity })
        }
        removeItem={(itemId) => mutateCart(`items/${itemId}/`, "DELETE")}
      />
    ) : route.name === "checkout" ? (
      <CheckoutPage user={user} cart={cart} />
    ) : route.name === "payment-result" ? (
      <PaymentResultPage />
    ) : route.name === "profile" ? (
      <ProfilePage
        user={user}
        onSignOut={() => {
          sessionStorage.removeItem("nexora-auth");
          setUser(null);
          setCart(null);
          setChatOpen(false);
          navigate("/");
        }}
      />
    ) : route.name === "admin-dashboard" ? (
      <AdminDashboardPage user={user} />
    ) : route.name === "admin-orders" ? (
      <AdminOrdersPage user={user} />
    ) : route.name === "chat" ? (
      <ChatPage user={user} />
    ) : route.name === "admin-chat" ? (
      <AdminChatPage user={user} />
    ) : (
      <PageState title="صفحه پیدا نشد" text="نشانی واردشده معتبر نیست." />
    );
  return (
    <div className="app-shell">
      <Header
        user={user}
        signIn={() => setAuthOpen(true)}
        profile={() => navigate("/profile")}
        cartCount={cart?.item_count ?? 0}
      />
      <button
        className="floating-chat-button"
        type="button"
        onClick={openChat}
        aria-label="گفت‌وگو با پشتیبانی"
      >
        <Icon name="support" size={26} />
      </button>
      {page}
      <footer id="about">
        <AppLink className="brand" href="/">
          <span className="brand-mark">n</span>
          <span>نوکسا</span>
        </AppLink>
        <p>یک تجربه‌ی ساده‌تر برای انتخاب و خرید بهتر.</p>
        <small>© ۱۴۰۵ نوکسا. تمامی حقوق محفوظ است.</small>
      </footer>
      {authOpen && (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          onAuthenticated={(response) => {
            sessionStorage.setItem("nexora-auth", JSON.stringify(response));
            setUser(response.user);
            setAuthOpen(false);
            void loadCart();
            if (openChatAfterAuth && response.user.role === "customer")
              setChatOpen(true);
            setOpenChatAfterAuth(false);
          }}
        />
      )}
      {chatOpen && user?.role === "customer" && (
        <CustomerChatWidget user={user} onClose={() => setChatOpen(false)} />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
