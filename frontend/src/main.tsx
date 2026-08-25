import {
  StrictMode,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import heroTechImage from "./assets/hero-tech-v1.png";
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
  product_type: "laptop" | "mobile";
  brand: string;
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
  specifications: {
    processor?: string;
    ram_gb: number;
    storage_gb: number;
    display_size_inches?: string;
    graphics?: string;
    camera_megapixels?: number;
    network?: "4g" | "5g";
    battery_mah?: number;
  } | null;
  rating_summary: { average: number; count: number };
  images: { id: number; image_url: string | null; alt_text: string }[];
};
type ProductReviewReply = {
  id: number;
  body: string;
  author_label: string;
  created_at: string;
};
type ProductReview = {
  id: number;
  body: string;
  author_label: string;
  created_at: string;
  replies: ProductReviewReply[];
};
type ProductReviewsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductReview[];
};
type ProductRatingResponse = ProductDetail["rating_summary"] & {
  my_score: number | null;
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
type AuthUser = {
  id: number;
  phone: string;
  display_name: string;
  email: string;
  birth_date: string | null;
  province: string;
  city: string;
  home_address: string;
  postal_code: string;
  role: "customer" | "admin";
  joined_at: string;
};
type AdminReview = {
  id: number;
  product_name: string;
  product_slug: string;
  customer_phone: string;
  customer_name: string;
  body: string;
  parent: number | null;
  moderation_status: "approved" | "rejected";
  created_at: string;
};
type AdminProduct = {
  id: number;
  category: number;
  category_name: string;
  product_type: "laptop" | "mobile";
  name: string;
  slug: string;
  sku: string;
  brand: string;
  short_description: string;
  price: string;
  stock_quantity: number;
  status: "draft" | "published" | "archived";
  review_count: number;
  primary_image: string | null;
};
type AuthResponse = { access: string; refresh: string; user: AuthUser };
type OrderItem = {
  id: number;
  product_name: string;
  product_sku: string;
  product_primary_image: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
};
type OrderStatusEvent = {
  from_status: string;
  to_status: string;
  changed_by_phone: string | null;
  created_at: string;
};
type Order = {
  number: string;
  order_code: string;
  status: string;
  subtotal: string;
  discount_amount: string;
  shipping_cost: string;
  tax_amount: string;
  total: string;
  coupon_code: string;
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
  revenue: string;
  completed_orders: number;
  best_sellers: {
    product_sku: string;
    product_name: string;
    quantity: number;
  }[];
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
  | { name: "order-detail"; orderCode: string; adminView: boolean }
  | { name: "admin-dashboard" }
  | { name: "admin-orders" }
  | { name: "admin-catalog" }
  | { name: "admin-products" }
  | { name: "admin-reviews" }
  | { name: "chat" }
  | { name: "admin-chat" }
  | { name: "not-found" };
const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const categoryIcons = ["⌁", "◒", "⌂", "✦"];
const categoryTones = ["blue", "peach", "mint", "lilac"];
const specificationLabels: Record<string, string> = {
  processor: "پردازنده",
  ram_gb: "حافظه رم",
  storage_gb: "حافظه داخلی",
  display_size_inches: "اندازه نمایشگر",
  graphics: "پردازنده گرافیکی",
  camera_megapixels: "دوربین اصلی",
  network: "شبکه",
  battery_mah: "ظرفیت باتری",
};

function formatPrice(value: string) {
  return new Intl.NumberFormat("fa-IR").format(Number(value));
}

function resolveMediaUrl(url: string | null) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

function orderItemCount(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
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
  if (parts[0] === "orders" && parts.length === 2)
    return {
      name: "order-detail",
      orderCode: decodeURIComponent(parts[1]),
      adminView: false,
    };
  if (parts[0] === "admin" && parts.length === 1)
    return { name: "admin-dashboard" };
  if (parts[0] === "admin" && parts[1] === "orders" && parts.length === 2)
    return { name: "admin-orders" };
  if (parts[0] === "admin" && parts[1] === "orders" && parts.length === 3)
    return {
      name: "order-detail",
      orderCode: decodeURIComponent(parts[2]),
      adminView: true,
    };
  if (parts[0] === "admin" && parts[1] === "catalog" && parts.length === 2)
    return { name: "admin-catalog" };
  if (parts[0] === "admin" && parts[1] === "products" && parts.length === 2)
    return { name: "admin-products" };
  if (parts[0] === "admin" && parts[1] === "reviews" && parts.length === 2)
    return { name: "admin-reviews" };
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
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}
async function getError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      const data = body as Record<string, unknown>;
      if (typeof data.detail === "string") return data.detail;
      const messages = Object.entries(data).flatMap(([field, value]) => {
        const items = Array.isArray(value) ? value : [value];
        return items
          .filter((item): item is string => typeof item === "string")
          .map((item) => `${field}: ${item}`);
      });
      if (messages.length) return messages.join(" — ");
    }
    return "عملیات انجام نشد.";
  } catch {
    return "ارتباط با سرور برقرار نشد.";
  }
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
    setMenuOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <div className="announcement" role="status">
        <span>ارسال رایگان برای سفارش‌های بالای ۲ میلیون تومان</span>
        <b>✦</b>
        <span>۷ روز ضمانت بازگشت کالا</span>
      </div>
      <header className="site-header">
        <div className="header-main">
          <AppLink href="/" className="brand">
            <span className="brand-mark">n</span>
            <span>نوکسا</span>
          </AppLink>
          <form className="header-search" onSubmit={submitSearch} role="search">
            <Icon name="search" size={19} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="جست‌وجوی کالا، برند یا دسته‌بندی"
              aria-label="جست‌وجوی کالا"
            />
            <button type="submit">جست‌وجو</button>
          </form>
          <div className="header-actions">
            <button
              className="cart-button"
              type="button"
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
                <span>{user.role === "admin" ? "پنل مدیریت" : "پروفایل"}</span>
              </button>
            ) : (
              <button className="account-button" type="button" onClick={signIn}>
                <Icon name="user" size={17} />
                <span>ورود یا ثبت‌نام</span>
              </button>
            )}
            <button
              className="menu-button"
              type="button"
              aria-label="باز کردن منو"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
        <div className="header-nav-row">
          <nav className="desktop-nav" aria-label="ناوبری اصلی">
            <AppLink href="/products">همهٔ کالاها</AppLink>
            <AppLink href="/products?type=laptop">لپ‌تاپ</AppLink>
            <AppLink href="/products?type=mobile">موبایل</AppLink>
          </nav>
          <span className="delivery-note">
            <Icon name="truck" size={17} /> تحویل سریع و مطمئن
          </span>
        </div>
      </header>
      {menuOpen && (
        <div
          className="menu-backdrop"
          role="presentation"
          onMouseDown={closeMenu}
        >
          <aside
            className="menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="منوی سایت"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="menu-drawer-head">
              <AppLink href="/" className="brand" onClick={closeMenu}>
                <span className="brand-mark">n</span>
                <span>نوکسا</span>
              </AppLink>
              <button type="button" onClick={closeMenu} aria-label="بستن منو">
                <Icon name="close" />
              </button>
            </div>
            <form className="drawer-search" onSubmit={submitSearch}>
              <Icon name="search" size={18} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="جست‌وجوی کالا"
              />
            </form>
            <nav className="drawer-links">
              <AppLink href="/products" onClick={closeMenu}>
                همهٔ کالاها
              </AppLink>
              <AppLink href="/products?type=laptop" onClick={closeMenu}>
                لپ‌تاپ و لوازم جانبی
              </AppLink>
              <AppLink href="/products?type=mobile" onClick={closeMenu}>
                موبایل و لوازم جانبی
              </AppLink>
              <AppLink href="/cart" onClick={closeMenu}>
                سبد خرید
              </AppLink>
              <AppLink href="/profile" onClick={closeMenu}>
                حساب کاربری
              </AppLink>
            </nav>
            <div className="drawer-promo">
              <Icon name="shield" size={21} />
              <span>خرید امن با ضمانت اصالت و بازگشت کالا</span>
            </div>
          </aside>
        </div>
      )}
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
          <span className="product-badge">
            {product.product_type === "laptop" ? "لپ‌تاپ" : "موبایل"}
          </span>
        </div>
        <div className="product-content">
          <div className="product-meta">
            <span>{product.brand || product.category.name}</span>
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
          <p className="eyebrow">فروشگاه تخصصی لپ‌تاپ و موبایل</p>
          <h1>
            تکنولوژیِ مناسبِ تو،
            <br />
            <em>همین‌جا پیدا کن.</em>
          </h1>
          <p className="hero-description">
            لپ‌تاپ و موبایل را بر اساس نیاز واقعی‌ات انتخاب کن؛ از کار و دانشگاه
            تا بازی و تولید محتوا، با مشخصات شفاف و خرید مطمئن.
          </p>
          <div className="hero-actions">
            <AppLink
              className="button button-primary"
              href="/products?type=laptop"
            >
              خرید لپ‌تاپ <Icon name="arrow" size={18} />
            </AppLink>
            <AppLink className="text-link" href="/products?type=mobile">
              مشاهدهٔ موبایل‌ها
            </AppLink>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-image-wrap">
            <img src={heroTechImage} alt="لپ‌تاپ و گوشی هوشمند" />
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
            <p className="eyebrow">از ابزار کار تا همراه روزانه</p>
            <h2>دسته‌بندی‌های فناوری</h2>
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
              {category.image_url ? (
                <img
                  className="category-image"
                  src={resolveMediaUrl(category.image_url) ?? undefined}
                  alt={category.name}
                />
              ) : (
                <span>{categoryIcons[index % categoryIcons.length]}</span>
              )}
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
          <p className="eyebrow">راهنمای انتخاب هوشمند</p>
          <h2>لپ‌تاپ و موبایل، بدون انتخاب اشتباه.</h2>
          <p>مشخصات دقیق، مقایسهٔ ساده و پشتیبانی برای انتخاب مطمئن‌تر.</p>
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
  const filters = new URLSearchParams(location.search);
  const productType = filters.get("type") as Product["product_type"] | null;
  const queryString = filters.toString();
  const catalog = useProducts(
    queryString ? `?${queryString}` : "?ordering=newest",
  );
  const selected = categories.find((item) => item.slug === category);

  function catalogPath(nextFilters: URLSearchParams) {
    const nextQuery = nextFilters.toString();
    return nextQuery ? `/products?${nextQuery}` : "/products";
  }

  function updateFilter(name: string, value: string | boolean) {
    const nextFilters = new URLSearchParams(location.search);
    if (!value) nextFilters.delete(name);
    else nextFilters.set(name, String(value));
    if (name === "type") {
      [
        "ram_min",
        "storage_min",
        "processor",
        "display_size_min",
        "graphics",
        "network",
        "camera_min",
        "battery_min",
      ].forEach((key) => nextFilters.delete(key));
    }
    navigate(catalogPath(nextFilters));
  }

  function categoryPath(slug: string | null) {
    const nextFilters = new URLSearchParams(location.search);
    if (slug) nextFilters.set("category", slug);
    else nextFilters.delete("category");
    return catalogPath(nextFilters);
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = new URLSearchParams(location.search);
    const data = new FormData(event.currentTarget);
    [
      "q",
      "brand",
      "min_price",
      "max_price",
      "ram_min",
      "storage_min",
      "processor",
      "display_size_min",
      "graphics",
      "network",
      "camera_min",
      "battery_min",
    ].forEach((name) => {
      const value = String(data.get(name) ?? "").trim();
      if (value) nextFilters.set(name, value);
      else nextFilters.delete(name);
    });
    navigate(catalogPath(nextFilters));
  }

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
        <AppLink
          href={categoryPath(null)}
          className={!category ? "active" : undefined}
        >
          همه
        </AppLink>
        {categories.map((item) => (
          <AppLink
            href={categoryPath(item.slug)}
            className={item.slug === category ? "active" : undefined}
            key={item.id}
          >
            {item.name}
          </AppLink>
        ))}
      </nav>
      <div className="catalog-layout">
        <aside className="catalog-filters" aria-label="فیلتر محصولات">
          <div className="catalog-filters-heading">
            <div>
              <p className="eyebrow">جست‌وجو و فیلتر</p>
              <h2>انتخاب دقیق‌تر</h2>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(
                  category
                    ? `/products?category=${encodeURIComponent(category)}`
                    : "/products",
                )
              }
            >
              پاک‌سازی
            </button>
          </div>
          <div
            className="product-type-filter"
            role="group"
            aria-label="نوع کالا"
          >
            <button
              className={!productType ? "active" : undefined}
              type="button"
              onClick={() => updateFilter("type", "")}
            >
              همه
            </button>
            <button
              className={productType === "laptop" ? "active" : undefined}
              type="button"
              onClick={() => updateFilter("type", "laptop")}
            >
              لپ‌تاپ
            </button>
            <button
              className={productType === "mobile" ? "active" : undefined}
              type="button"
              onClick={() => updateFilter("type", "mobile")}
            >
              موبایل
            </button>
          </div>
          <form key={queryString} onSubmit={submitFilters}>
            <label>
              <span>جست‌وجو</span>
              <input
                name="q"
                defaultValue={filters.get("q") ?? ""}
                placeholder="نام، برند یا توضیحات کالا"
              />
            </label>
            <label>
              <span>برند</span>
              <input
                name="brand"
                defaultValue={filters.get("brand") ?? ""}
                placeholder="مثلاً Apple"
              />
            </label>
            <div className="price-filter-row">
              <label>
                <span>حداقل قیمت</span>
                <input
                  name="min_price"
                  inputMode="numeric"
                  defaultValue={filters.get("min_price") ?? ""}
                />
              </label>
              <label>
                <span>حداکثر قیمت</span>
                <input
                  name="max_price"
                  inputMode="numeric"
                  defaultValue={filters.get("max_price") ?? ""}
                />
              </label>
            </div>
            {productType && (
              <>
                <div className="price-filter-row">
                  <label>
                    <span>حداقل رم</span>
                    <select
                      name="ram_min"
                      defaultValue={filters.get("ram_min") ?? ""}
                    >
                      <option value="">همه</option>
                      <option value="8">۸ گیگابایت</option>
                      <option value="12">۱۲ گیگابایت</option>
                      <option value="16">۱۶ گیگابایت</option>
                      <option value="32">۳۲ گیگابایت</option>
                    </select>
                  </label>
                  <label>
                    <span>حداقل حافظه</span>
                    <select
                      name="storage_min"
                      defaultValue={filters.get("storage_min") ?? ""}
                    >
                      <option value="">همه</option>
                      <option value="128">۱۲۸ گیگابایت</option>
                      <option value="256">۲۵۶ گیگابایت</option>
                      <option value="512">۵۱۲ گیگابایت</option>
                      <option value="1024">۱ ترابایت</option>
                    </select>
                  </label>
                </div>
                {productType === "laptop" ? (
                  <>
                    <div className="price-filter-row">
                      <label>
                        <span>پردازنده</span>
                        <input
                          name="processor"
                          defaultValue={filters.get("processor") ?? ""}
                          placeholder="مثلاً Core Ultra"
                        />
                      </label>
                      <label>
                        <span>حداقل اندازه نمایشگر</span>
                        <select
                          name="display_size_min"
                          defaultValue={filters.get("display_size_min") ?? ""}
                        >
                          <option value="">همه</option>
                          <option value="13">۱۳ اینچ</option>
                          <option value="14">۱۴ اینچ</option>
                          <option value="15">۱۵ اینچ</option>
                          <option value="16">۱۶ اینچ</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      <span>گرافیک</span>
                      <input
                        name="graphics"
                        defaultValue={filters.get("graphics") ?? ""}
                        placeholder="مثلاً RTX یا Arc"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="price-filter-row">
                      <label>
                        <span>حداقل دوربین</span>
                        <select
                          name="camera_min"
                          defaultValue={filters.get("camera_min") ?? ""}
                        >
                          <option value="">همه</option>
                          <option value="12">۱۲ مگاپیکسل</option>
                          <option value="48">۴۸ مگاپیکسل</option>
                          <option value="50">۵۰ مگاپیکسل</option>
                          <option value="108">۱۰۸ مگاپیکسل</option>
                        </select>
                      </label>
                      <label>
                        <span>حداقل باتری</span>
                        <select
                          name="battery_min"
                          defaultValue={filters.get("battery_min") ?? ""}
                        >
                          <option value="">همه</option>
                          <option value="4000">۴۰۰۰ میلی‌آمپرساعت</option>
                          <option value="4500">۴۵۰۰ میلی‌آمپرساعت</option>
                          <option value="5000">۵۰۰۰ میلی‌آمپرساعت</option>
                          <option value="6000">۶۰۰۰ میلی‌آمپرساعت</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      <span>نسل شبکه</span>
                      <select
                        name="network"
                        defaultValue={filters.get("network") ?? ""}
                      >
                        <option value="">همه</option>
                        <option value="5g">۵G</option>
                        <option value="4g">۴G</option>
                      </select>
                    </label>
                  </>
                )}
              </>
            )}
            <label className="stock-filter">
              <input
                type="checkbox"
                checked={filters.get("in_stock") === "true"}
                onChange={(event) =>
                  updateFilter("in_stock", event.target.checked)
                }
              />
              <span>فقط کالاهای موجود</span>
            </label>
            <button className="catalog-filter-submit" type="submit">
              اعمال فیلترها
            </button>
          </form>
        </aside>
        <section className="catalog-results">
          <div className="catalog-results-heading">
            <span>{catalog.products.length} کالا در این صفحه</span>
            <label>
              <span>مرتب‌سازی</span>
              <select
                value={filters.get("ordering") ?? "newest"}
                onChange={(event) =>
                  updateFilter("ordering", event.target.value)
                }
              >
                <option value="newest">جدیدترین</option>
                <option value="price">ارزان‌ترین</option>
                <option value="-price">گران‌ترین</option>
              </select>
            </label>
          </div>
          <ProductGrid {...catalog} />
        </section>
      </div>
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
  const [cartMessage, setCartMessage] = useState("");
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);

  function getCartActionMessage(reason: unknown, fallback: string) {
    const message = reason instanceof Error ? reason.message : fallback;
    return message.toLowerCase().includes("pending payment")
      ? "برای تغییر سبد، سفارش در انتظار پرداخت را پرداخت کن یا تا پایان مهلت رزرو صبر کن."
      : message;
  }

  async function changeQuantity(item: CartItem, quantity: number) {
    setPendingItemId(item.id);
    setCartMessage("");
    try {
      await updateItem(item.id, quantity);
    } catch (reason) {
      setCartMessage(getCartActionMessage(reason, "تغییر تعداد ناموفق بود."));
    } finally {
      setPendingItemId(null);
    }
  }

  async function deleteItem(itemId: number) {
    setPendingItemId(itemId);
    setCartMessage("");
    try {
      await removeItem(itemId);
    } catch (reason) {
      setCartMessage(getCartActionMessage(reason, "حذف کالا ناموفق بود."));
    } finally {
      setPendingItemId(null);
    }
  }

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
          {cartMessage && <p className="cart-action-message">{cartMessage}</p>}
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
                <small className="cart-unit-price">
                  قیمت هر کالا: {formatPrice(item.product.price)} تومان
                </small>
                <div className="quantity-controls">
                  <button
                    type="button"
                    aria-label="کم کردن تعداد"
                    disabled={item.quantity === 1 || pendingItemId === item.id}
                    onClick={() => void changeQuantity(item, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{formatPrice(String(item.quantity))}</span>
                  <button
                    type="button"
                    aria-label="زیاد کردن تعداد"
                    disabled={pendingItemId === item.id}
                    onClick={() => void changeQuantity(item, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                className="remove-cart-item"
                type="button"
                disabled={pendingItemId === item.id}
                onClick={() => void deleteItem(item.id)}
              >
                حذف
              </button>
            </article>
          ))}
        </div>
        <aside className="cart-summary">
          <h2>خلاصه خرید</h2>
          <ul className="cart-summary-items" aria-label="اقلام سبد خرید">
            {cart.items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.product.name}</strong>
                  <span>
                    {formatPrice(String(item.quantity))} ×{" "}
                    {formatPrice(item.product.price)} تومان
                  </span>
                </div>
                <b>{formatPrice(item.line_total)} تومان</b>
              </li>
            ))}
          </ul>
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
  const [couponCode, setCouponCode] = useState("");
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
        body: JSON.stringify({ address_id: selected, coupon_code: couponCode }),
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
          <label>
            کد تخفیف
            <input
              value={couponCode}
              maxLength={40}
              onChange={(event) =>
                setCouponCode(event.target.value.toUpperCase())
              }
              placeholder="اختیاری"
            />
          </label>
          <hr />
          {paymentOrder && (
            <>
              <div>
                <span>تخفیف</span>
                <strong>
                  {formatPrice(paymentOrder.discount_amount)} تومان
                </strong>
              </div>
              <div>
                <span>هزینه ارسال</span>
                <strong>{formatPrice(paymentOrder.shipping_cost)} تومان</strong>
              </div>
              <div>
                <span>مالیات</span>
                <strong>{formatPrice(paymentOrder.tax_amount)} تومان</strong>
              </div>
            </>
          )}
          <div className="cart-total">
            <span>مبلغ سفارش</span>
            <strong>
              {paymentOrder
                ? `${formatPrice(paymentOrder.total)} تومان`
                : cart
                  ? `${formatPrice(cart.subtotal)} تومان`
                  : "—"}
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
  onUserUpdated,
}: {
  user: AuthUser | null;
  onSignOut: () => void;
  onUserUpdated: (user: AuthUser) => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [ordersResponse, setOrdersResponse] = useState<OrdersResponse | null>(
    null,
  );
  const [profile, setProfile] = useState({
    display_name: user?.display_name ?? "",
    email: user?.email ?? "",
    birth_date: user?.birth_date ?? "",
    province: user?.province ?? "",
    city: user?.city ?? "",
    home_address: user?.home_address ?? "",
    postal_code: user?.postal_code ?? "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profilePending, setProfilePending] = useState(false);
  const [profileTab, setProfileTab] = useState<
    "overview" | "orders" | "details"
  >("overview");
  useEffect(() => {
    setProfile({
      display_name: user?.display_name ?? "",
      email: user?.email ?? "",
      birth_date: user?.birth_date ?? "",
      province: user?.province ?? "",
      city: user?.city ?? "",
      home_address: user?.home_address ?? "",
      postal_code: user?.postal_code ?? "",
    });
  }, [user]);
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    Promise.all([
      fetchAuthenticated(`/api/v1/orders/?${params.toString()}`),
      fetchAuthenticated("/api/v1/orders/summary/"),
    ])
      .then(async ([ordersApiResponse, summaryApiResponse]) => {
        if (!ordersApiResponse.ok)
          throw new Error(await getError(ordersApiResponse));
        if (!summaryApiResponse.ok)
          throw new Error(await getError(summaryApiResponse));
        const [ordersData, summaryData] = await Promise.all([
          ordersApiResponse.json() as Promise<OrdersResponse>,
          summaryApiResponse.json() as Promise<OrderSummary>,
        ]);
        return [ordersData, summaryData] as const;
      })
      .then(([ordersData, summaryData]) => {
        setOrders(ordersData.results);
        setOrdersResponse(ordersData);
        setSummary(summaryData);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "دریافت سفارش‌ها ناموفق بود.",
        ),
      )
      .finally(() => setLoading(false));
  }, [page, statusFilter, user?.id]);
  if (!user)
    return (
      <PageState
        title="برای مشاهده پروفایل وارد شو"
        text="اطلاعات حساب و سفارش‌ها به حساب کاربری شما متصل هستند."
      />
    );

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfilePending(true);
    setProfileMessage("");
    try {
      const response = await fetchAuthenticated("/api/v1/auth/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error(await getError(response));
      const nextUser = (await response.json()) as AuthUser;
      onUserUpdated(nextUser);
      setProfileMessage("مشخصات پروفایل ذخیره شد.");
    } catch (reason) {
      setProfileMessage(
        reason instanceof Error ? reason.message : "ذخیرهٔ پروفایل ناموفق بود.",
      );
    } finally {
      setProfilePending(false);
    }
  }

  return (
    <main className="profile-page">
      <div className="page-heading">
        <p className="eyebrow">
          {user.role === "admin" ? "حساب مدیریت" : "حساب کاربری"}
        </p>
        <h1>{user.role === "admin" ? "پروفایل مدیر" : "پروفایل من"}</h1>
        <p>اطلاعات حساب و سفارش‌های ثبت‌شدهٔ خودت را اینجا ببین.</p>
      </div>
      <div className="profile-dashboard-layout">
        <aside className="profile-sidebar">
          <div className="profile-sidebar-user">
            <div className="profile-avatar">
              <Icon name="user" size={29} />
            </div>
            <div>
              <strong>{user.display_name || "کاربر"}</strong>
              <span dir="ltr">{user.phone}</span>
              <small>{user.role === "admin" ? "مدیر سامانه" : "کاربر"}</small>
            </div>
          </div>
          <form
            className="profile-name-form profile-sidebar-form"
            onSubmit={updateProfile}
          >
            <label>
              نام و نام خانوادگی
              <input
                value={profile.display_name}
                maxLength={80}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    display_name: event.target.value,
                  }))
                }
                placeholder="مثلاً سعید زیدآبادی"
              />
            </label>
            <label>
              ایمیل
              <input
                type="email"
                value={profile.email}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="name@example.com"
                dir="ltr"
              />
            </label>
            <label>
              تاریخ تولد
              <input
                type="date"
                value={profile.birth_date}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    birth_date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              استان
              <input
                value={profile.province}
                maxLength={80}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    province: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              شهر
              <input
                value={profile.city}
                maxLength={80}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              کد پستی
              <input
                value={profile.postal_code}
                maxLength={10}
                inputMode="numeric"
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    postal_code: event.target.value,
                  }))
                }
                dir="ltr"
              />
            </label>
            <label>
              نشانی منزل
              <textarea
                value={profile.home_address}
                maxLength={1000}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    home_address: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit" disabled={profilePending}>
              {profilePending ? "در حال ذخیره…" : "ذخیرهٔ مشخصات"}
            </button>
            {profileMessage && <small>{profileMessage}</small>}
          </form>
          <nav className="profile-navigation" aria-label="بخش‌های پروفایل">
            <button
              className={profileTab === "overview" ? "active" : undefined}
              type="button"
              onClick={() => {
                setProfileTab("overview");
                setPage(1);
                setStatusFilter("");
              }}
            >
              نمای کلی حساب
            </button>
            <button
              className={profileTab === "orders" ? "active" : undefined}
              type="button"
              onClick={() => {
                setProfileTab("orders");
                setPage(1);
                setStatusFilter("");
              }}
            >
              سفارش‌های من
            </button>
            <button
              className={profileTab === "details" ? "active" : undefined}
              type="button"
              onClick={() => {
                setProfileTab("details");
              }}
            >
              اطلاعات حساب
            </button>
          </nav>
          {user.role === "admin" ? (
            <div className="profile-admin-actions">
              <AppLink className="admin-dashboard-link" href="/admin">
                نمای کلی مدیریت
              </AppLink>
              <AppLink className="admin-dashboard-link" href="/admin/orders">
                مدیریت سفارش‌ها
              </AppLink>
              <AppLink className="admin-dashboard-link" href="/admin/catalog">
                ایجاد کالا
              </AppLink>
              <AppLink className="admin-dashboard-link" href="/admin/products">
                مدیریت کالاها
              </AppLink>
              <AppLink className="admin-dashboard-link" href="/admin/reviews">
                مدیریت نظرها
              </AppLink>
              <AppLink className="admin-dashboard-link" href="/admin/chat">
                گفت‌وگوهای پشتیبانی
              </AppLink>
            </div>
          ) : (
            <AppLink className="admin-dashboard-link" href="/chat">
              گفت‌وگو با پشتیبانی
            </AppLink>
          )}
          <button className="signout-button" type="button" onClick={onSignOut}>
            خروج از حساب
          </button>
        </aside>
        <div className="profile-dashboard-content">
          <section className="profile-account-card">
            <div className="profile-account-avatar">
              <Icon name="user" size={25} />
            </div>
            <div>
              <p>{user.role === "admin" ? "حساب مدیر" : "حساب کاربری"}</p>
              <h2>{user.display_name || "کاربر نوکسا"}</h2>
              <span dir="ltr">{user.phone}</span>
            </div>
            <button type="button" onClick={() => setProfileTab("details")}>
              ویرایش مشخصات
            </button>
          </section>
          {profileTab === "details" ? (
            <section className="profile-details-card">
              <div className="profile-card-heading">
                <div>
                  <p className="eyebrow">اطلاعات کاربری</p>
                  <h2>مشخصات حساب</h2>
                </div>
                <span>شماره موبایل قابل تغییر نیست</span>
              </div>
              <form className="profile-details-form" onSubmit={updateProfile}>
                <label>
                  نام و نام خانوادگی
                  <input
                    value={profile.display_name}
                    maxLength={80}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        display_name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  ایمیل
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    dir="ltr"
                  />
                </label>
                <label>
                  شماره موبایل
                  <input value={user.phone} readOnly dir="ltr" />
                </label>
                <label>
                  تاریخ تولد
                  <input
                    type="date"
                    value={profile.birth_date}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        birth_date: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  استان
                  <input
                    value={profile.province}
                    maxLength={80}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        province: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  شهر
                  <input
                    value={profile.city}
                    maxLength={80}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  کد پستی
                  <input
                    value={profile.postal_code}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        postal_code: event.target.value,
                      }))
                    }
                    dir="ltr"
                  />
                </label>
                <label className="wide">
                  نشانی منزل
                  <textarea
                    value={profile.home_address}
                    maxLength={1000}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        home_address: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="profile-form-actions">
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={profilePending}
                  >
                    {profilePending ? "در حال ذخیره…" : "ذخیره تغییرات"}
                  </button>
                  {profileMessage && <span>{profileMessage}</span>}
                </div>
              </form>
            </section>
          ) : (
            <>
              <section
                className="profile-overview-cards"
                aria-label="خلاصه سفارش‌ها"
              >
                <div>
                  <span>کل سفارش‌ها</span>
                  <strong>{summary?.total ?? "—"}</strong>
                </div>
                <div>
                  <span>در انتظار پرداخت</span>
                  <strong>{summary?.by_status.pending ?? "—"}</strong>
                </div>
                <div>
                  <span>در حال ارسال</span>
                  <strong>{summary?.by_status.processing ?? "—"}</strong>
                </div>
                <div>
                  <span>ارسال‌شده</span>
                  <strong>{summary?.by_status.shipped ?? "—"}</strong>
                </div>
              </section>
              <section className="orders-section profile-orders-card">
                <div className="orders-heading">
                  <div>
                    <p className="eyebrow">پیگیری خرید</p>
                    <h2>سفارش‌های من</h2>
                  </div>
                  <span>{ordersResponse?.count ?? 0} سفارش</span>
                </div>
                <nav className="profile-order-tabs" aria-label="فیلتر سفارش‌ها">
                  <button
                    className={!statusFilter ? "active" : undefined}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setStatusFilter("");
                    }}
                  >
                    همه
                  </button>
                  <button
                    className={
                      statusFilter === "pending" ? "active" : undefined
                    }
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setStatusFilter("pending");
                    }}
                  >
                    در انتظار پرداخت
                  </button>
                  <button
                    className={
                      statusFilter === "processing" ? "active" : undefined
                    }
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setStatusFilter("processing");
                    }}
                  >
                    در حال پردازش
                  </button>
                  <button
                    className={
                      statusFilter === "shipped" ? "active" : undefined
                    }
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setStatusFilter("shipped");
                    }}
                  >
                    ارسال‌شده
                  </button>
                </nav>
                {loading ? (
                  <p className="orders-state">در حال دریافت سفارش‌ها…</p>
                ) : error ? (
                  <p className="orders-state error">{error}</p>
                ) : !orders.length ? (
                  <p className="orders-state">
                    سفارشی با این وضعیت وجود ندارد.
                  </p>
                ) : (
                  <div className="orders-list">
                    {orders.map((order) => (
                      <article
                        className="order-card detailed-order-card"
                        key={order.number}
                      >
                        <div className="order-card-header">
                          <div>
                            <span>کد سفارش</span>
                            <strong dir="ltr">{order.order_code}</strong>
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
                            <dt>مبلغ نهایی</dt>
                            <dd>{formatPrice(order.total)} تومان</dd>
                          </div>
                          <div>
                            <dt>تعداد آیتم‌ها</dt>
                            <dd>{orderItemCount(order)} کالا</dd>
                          </div>
                          {order.status === "pending" && order.expires_at && (
                            <div>
                              <dt>مهلت پرداخت</dt>
                              <dd>{formatDate(order.expires_at)}</dd>
                            </div>
                          )}
                        </dl>
                        <ul className="order-line-items">
                          {order.items.map((item) => (
                            <li key={item.id}>
                              <div>
                                <strong>{item.product_name}</strong>
                                <small dir="ltr">{item.product_sku}</small>
                              </div>
                              <span>{item.quantity} عدد</span>
                              <span>
                                قیمت واحد: {formatPrice(item.unit_price)} تومان
                              </span>
                              <strong>
                                {formatPrice(item.line_total)} تومان
                              </strong>
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
                                  {event.changed_by_phone
                                    ? ` — ${event.changed_by_phone}`
                                    : ""}
                                </span>
                                <time dateTime={event.created_at}>
                                  {formatDate(event.created_at)}
                                </time>
                              </li>
                            ))}
                          </ol>
                        )}
                        <AppLink
                          className="order-detail-link"
                          href={`/orders/${encodeURIComponent(order.order_code)}`}
                        >
                          مشاهدهٔ جزئیات سفارش
                        </AppLink>
                      </article>
                    ))}
                  </div>
                )}
                {!loading &&
                  !error &&
                  ordersResponse &&
                  (ordersResponse.next || ordersResponse.previous) && (
                    <nav
                      className="orders-pagination"
                      aria-label="صفحه‌بندی سفارش‌ها"
                    >
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
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function OrderDetailPage({
  user,
  orderCode,
  adminView,
}: {
  user: AuthUser | null;
  orderCode: string;
  adminView: boolean;
}) {
  const [order, setOrder] = useState<
    | (Order & {
        shipping_full_name: string;
        shipping_phone: string;
        shipping_province: string;
        shipping_city: string;
        shipping_address_line: string;
        shipping_postal_code: string;
        payment_reference: string;
      })
    | null
  >(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || (adminView && user.role !== "admin")) return;
    const controller = new AbortController();
    setOrder(null);
    setError("");
    fetchAuthenticated(`/api/v1/orders/${encodeURIComponent(orderCode)}/`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json();
      })
      .then((data) => setOrder(data))
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setError(
            reason instanceof Error
              ? reason.message
              : "دریافت جزئیات سفارش ناموفق بود.",
          );
      });
    return () => controller.abort();
  }, [adminView, orderCode, user?.id, user?.role]);

  if (!user)
    return (
      <PageState
        title="برای مشاهدهٔ سفارش وارد شوید"
        text="جزئیات خرید فقط برای صاحب سفارش در دسترس است."
      />
    );
  if (adminView && user.role !== "admin")
    return (
      <PageState title="دسترسی ندارید" text="این سفارش برای مدیران است." />
    );
  if (error)
    return <PageState title="جزئیات سفارش در دسترس نیست" text={error} />;
  if (!order)
    return (
      <main className="page-state">
        <span className="detail-loader" />
        <p>در حال دریافت جزئیات سفارش…</p>
      </main>
    );

  const paidOrder = ["paid", "processing", "shipped"].includes(order.status);
  const backHref = adminView ? "/admin/orders" : "/profile";

  return (
    <main className="order-detail-page">
      <div className="order-detail-topbar">
        <AppLink href={backHref}>بازگشت به سفارش‌ها</AppLink>
        <span className={`order-status ${order.status}`}>
          {orderStatusLabels[order.status] ?? order.status}
        </span>
      </div>
      <section className="order-detail-hero">
        <div>
          <p className="eyebrow">جزئیات خرید</p>
          <h1>
            سفارش <span dir="ltr">{order.order_code}</span>
          </h1>
          <p>{formatDate(order.created_at)} ثبت شده است.</p>
        </div>
        <div className="order-detail-total">
          <span>{paidOrder ? "مبلغ پرداخت‌شده" : "مبلغ قابل پرداخت"}</span>
          <strong>{formatPrice(order.total)} تومان</strong>
          <small>{orderItemCount(order)} قلم کالا</small>
        </div>
      </section>
      <div className="order-detail-layout">
        <section className="order-detail-products">
          <div className="order-detail-section-heading">
            <h2>کالاهای این سفارش</h2>
            <span>{orderItemCount(order)} کالا</span>
          </div>
          <div className="order-detail-product-list">
            {order.items.map((item) => (
              <article className="order-detail-product" key={item.id}>
                <div className="order-detail-product-image">
                  {item.product_primary_image ? (
                    <img
                      src={item.product_primary_image}
                      alt={item.product_name}
                    />
                  ) : (
                    <span>{item.product_name.slice(0, 1)}</span>
                  )}
                </div>
                <div className="order-detail-product-copy">
                  <h3>{item.product_name}</h3>
                  <span dir="ltr">{item.product_sku}</span>
                  <p>
                    {item.quantity} عدد × {formatPrice(item.unit_price)} تومان
                  </p>
                </div>
                <strong>{formatPrice(item.line_total)} تومان</strong>
              </article>
            ))}
          </div>
        </section>
        <aside className="order-detail-sidebar">
          <section>
            <h2>تحویل گیرنده</h2>
            <strong>{order.shipping_full_name}</strong>
            <span dir="ltr">{order.shipping_phone}</span>
            <p>
              {order.shipping_province}، {order.shipping_city}
            </p>
            <p>{order.shipping_address_line}</p>
            <small>
              کد پستی: <span dir="ltr">{order.shipping_postal_code}</span>
            </small>
          </section>
          <section>
            <h2>پرداخت و پیگیری</h2>
            <div>
              <span>تاریخ ثبت</span>
              <strong>{formatDate(order.created_at)}</strong>
            </div>
            <div>
              <span>وضعیت</span>
              <strong>{orderStatusLabels[order.status] ?? order.status}</strong>
            </div>
            {order.payment_reference && (
              <div>
                <span>کد پیگیری پرداخت</span>
                <strong dir="ltr">{order.payment_reference}</strong>
              </div>
            )}
            {order.status === "pending" && order.expires_at && (
              <div>
                <span>مهلت پرداخت</span>
                <strong>{formatDate(order.expires_at)}</strong>
              </div>
            )}
          </section>
        </aside>
      </div>
      {!!order.status_events.length && (
        <section className="order-detail-history">
          <h2>روند سفارش</h2>
          <ol>
            {order.status_events.map((event, index) => (
              <li key={`${event.created_at}-${index}`}>
                <strong>
                  {orderStatusLabels[event.to_status] ?? event.to_status}
                </strong>
                <span>{formatDate(event.created_at)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
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
                <dt>درآمد ثبت‌شده</dt>
                <dd>{formatPrice(orders.revenue)} تومان</dd>
              </div>
              <div>
                <dt>سفارش تکمیل‌شده</dt>
                <dd>{orders.completed_orders}</dd>
              </div>
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
            {orders.best_sellers.length > 0 && (
              <div className="admin-overview-metrics">
                <strong>پرفروش‌ها</strong>
                {orders.best_sellers.map((product) => (
                  <span key={product.product_sku}>
                    {product.product_name} — {product.quantity} عدد
                  </span>
                ))}
              </div>
            )}
            <AppLink className="admin-dashboard-link" href="/admin/orders">
              مدیریت سفارش‌ها
            </AppLink>
            <AppLink className="admin-dashboard-link" href="/admin/catalog">
              ایجاد کالا
            </AppLink>
            <AppLink className="admin-dashboard-link" href="/admin/products">
              مدیریت کالاها
            </AppLink>
            <AppLink className="admin-dashboard-link" href="/admin/reviews">
              مدیریت نظرها
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

function AdminCatalogPage({ user }: { user: AuthUser | null }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [categoryPending, setCategoryPending] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  const categoryImageInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imageAltText, setImageAltText] = useState("");
  const [product, setProduct] = useState({
    category: "",
    product_type: "laptop",
    name: "",
    brand: "",
    short_description: "",
    description: "",
    price: "",
    discount_percent: "0",
    stock_quantity: "0",
    status: "draft",
    processor: "",
    ram_gb: "",
    storage_gb: "",
    display_size_inches: "",
    graphics: "",
    camera_megapixels: "",
    network: "5g",
    battery_mah: "",
  });

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchAuthenticated("/api/v1/catalog/admin/categories/")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Category[]) => {
        setCategories(data);
        setProduct((current) => ({
          ...current,
          category: current.category || String(data[0]?.id ?? ""),
        }));
      })
      .catch(() => setMessage("دریافت دسته‌بندی‌ها ناموفق بود."));
  }, [user?.id, user?.role]);

  if (user?.role !== "admin")
    return (
      <PageState title="دسترسی ندارید" text="این بخش فقط برای مدیران است." />
    );

  function updateProduct(field: keyof typeof product, value: string) {
    setProduct((current) => ({ ...current, [field]: value }));
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;

    setCategoryPending(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("is_active", String(categoryIsActive));
      if (categoryImage) formData.set("image", categoryImage);
      const response = await fetchAuthenticated(
        "/api/v1/catalog/admin/categories/",
        {
          method: "POST",
          body: formData,
        },
      );
      if (!response.ok) throw new Error(await getError(response));

      const category = (await response.json()) as Category;
      setCategories((current) => [...current, category]);
      setProduct((current) => ({ ...current, category: String(category.id) }));
      setCategoryName("");
      setCategoryImage(null);
      setCategoryIsActive(true);
      if (categoryImageInputRef.current)
        categoryImageInputRef.current.value = "";
      setMessage("دسته‌بندی جدید ایجاد و برای کالای در حال ثبت انتخاب شد.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "ایجاد دسته‌بندی ناموفق بود.",
      );
    } finally {
      setCategoryPending(false);
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const discountPercent = Number(product.discount_percent);
    if (
      !Number.isInteger(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 99
    ) {
      setMessage("درصد تخفیف باید یک عدد صحیح بین صفر تا نود و نه باشد.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("category", product.category);
      formData.set("product_type", product.product_type);
      formData.set("name", product.name);
      formData.set("brand", product.brand);
      formData.set("short_description", product.short_description);
      formData.set("description", product.description);
      formData.set("price", product.price);
      formData.set("stock_quantity", product.stock_quantity);
      formData.set("status", product.status);
      formData.set("discount_percent", product.discount_percent);
      if (product.product_type === "laptop") {
        formData.set("laptop_specification.processor", product.processor);
        formData.set("laptop_specification.ram_gb", product.ram_gb);
        formData.set("laptop_specification.storage_gb", product.storage_gb);
        formData.set(
          "laptop_specification.display_size_inches",
          product.display_size_inches,
        );
        formData.set("laptop_specification.graphics", product.graphics);
      } else {
        formData.set("mobile_specification.ram_gb", product.ram_gb);
        formData.set("mobile_specification.storage_gb", product.storage_gb);
        formData.set(
          "mobile_specification.camera_megapixels",
          product.camera_megapixels,
        );
        formData.set("mobile_specification.network", product.network);
        formData.set("mobile_specification.battery_mah", product.battery_mah);
      }
      formData.set("image_alt_text", imageAltText);
      images.forEach((image) => formData.append("images", image));
      const response = await fetchAuthenticated(
        "/api/v1/catalog/admin/products/",
        {
          method: "POST",
          body: formData,
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      setMessage("کالا با موفقیت ایجاد شد.");
      setProduct((current) => ({
        ...current,
        name: "",
        brand: "",
        short_description: "",
        description: "",
        price: "",
        discount_percent: "0",
        stock_quantity: "0",
        processor: "",
        ram_gb: "",
        storage_gb: "",
        display_size_inches: "",
        graphics: "",
        camera_megapixels: "",
        network: "5g",
        battery_mah: "",
      }));
      setImages([]);
      setImageAltText("");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "ایجاد کالا ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="profile-page admin-catalog-page">
      <div className="page-heading">
        <p className="eyebrow">مدیریت کاتالوگ</p>
        <h1>ایجاد کالا</h1>
        <p>تمام فیلدهای اصلی، مشخصات نوع کالا و تصویرهای محصول را ثبت کن.</p>
      </div>
      {message && <p className="orders-state error">{message}</p>}
      <div className="admin-catalog-grid">
        <section className="orders-section admin-category-section">
          <div className="orders-heading">
            <div>
              <h2>دسته‌بندی جدید</h2>
            </div>
          </div>
          <form className="admin-category-form" onSubmit={createCategory}>
            <label>
              نام دسته‌بندی
              <input
                required
                maxLength={120}
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
              />
            </label>
            <label>
              تصویر دسته‌بندی
              <input
                ref={categoryImageInputRef}
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setCategoryImage(event.target.files?.[0] ?? null)
                }
              />
            </label>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={categoryIsActive}
                onChange={(event) => setCategoryIsActive(event.target.checked)}
              />
              فعال باشد
            </label>
            <button type="submit" disabled={categoryPending}>
              {categoryPending ? "در حال ایجاد..." : "افزودن دسته‌بندی"}
            </button>
          </form>
        </section>
        <section className="orders-section">
          <div className="orders-heading">
            <h2>کالای جدید</h2>
          </div>
          <form className="admin-product-form" onSubmit={createProduct}>
            <label>
              نام کالا
              <input
                required
                value={product.name}
                onChange={(event) => updateProduct("name", event.target.value)}
              />
            </label>
            <label>
              دسته‌بندی
              <select
                required
                value={product.category}
                onChange={(event) =>
                  updateProduct("category", event.target.value)
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              نوع کالا
              <select
                value={product.product_type}
                onChange={(event) =>
                  updateProduct("product_type", event.target.value)
                }
              >
                <option value="laptop">لپ‌تاپ</option>
                <option value="mobile">موبایل</option>
              </select>
            </label>
            <label>
              برند
              <input
                value={product.brand}
                onChange={(event) => updateProduct("brand", event.target.value)}
              />
            </label>
            <label>
              قیمت
              <input
                required
                type="number"
                min="0"
                value={product.price}
                onChange={(event) => updateProduct("price", event.target.value)}
              />
            </label>
            <label>
              درصد تخفیف
              <input
                type="number"
                min="0"
                max="99"
                step="1"
                value={product.discount_percent}
                onChange={(event) =>
                  updateProduct("discount_percent", event.target.value)
                }
              />
              <small className="field-hint">
                قیمت پیش از تخفیف به‌صورت خودکار از قیمت فروش محاسبه می‌شود.
              </small>
            </label>
            <label>
              موجودی
              <input
                required
                type="number"
                min="0"
                value={product.stock_quantity}
                onChange={(event) =>
                  updateProduct("stock_quantity", event.target.value)
                }
              />
            </label>
            <label>
              وضعیت
              <select
                value={product.status}
                onChange={(event) =>
                  updateProduct("status", event.target.value)
                }
              >
                <option value="draft">پیش‌نویس</option>
                <option value="published">منتشرشده</option>
              </select>
            </label>
            {product.product_type === "laptop" ? (
              <>
                <label>
                  پردازنده
                  <input
                    required
                    value={product.processor}
                    onChange={(event) =>
                      updateProduct("processor", event.target.value)
                    }
                  />
                </label>
                <label>
                  رم
                  <input
                    required
                    type="number"
                    min="1"
                    value={product.ram_gb}
                    onChange={(event) =>
                      updateProduct("ram_gb", event.target.value)
                    }
                  />
                </label>
                <label>
                  حافظه داخلی
                  <input
                    required
                    type="number"
                    min="1"
                    value={product.storage_gb}
                    onChange={(event) =>
                      updateProduct("storage_gb", event.target.value)
                    }
                  />
                </label>
                <label>
                  اندازهٔ نمایشگر
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.1"
                    value={product.display_size_inches}
                    onChange={(event) =>
                      updateProduct("display_size_inches", event.target.value)
                    }
                  />
                </label>
                <label className="wide">
                  گرافیک
                  <input
                    value={product.graphics}
                    onChange={(event) =>
                      updateProduct("graphics", event.target.value)
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  رم
                  <input
                    required
                    type="number"
                    min="1"
                    value={product.ram_gb}
                    onChange={(event) =>
                      updateProduct("ram_gb", event.target.value)
                    }
                  />
                </label>
                <label>
                  حافظه داخلی
                  <input
                    required
                    type="number"
                    min="1"
                    value={product.storage_gb}
                    onChange={(event) =>
                      updateProduct("storage_gb", event.target.value)
                    }
                  />
                </label>
                <label>
                  دوربین اصلی
                  <input
                    required
                    type="number"
                    min="1"
                    value={product.camera_megapixels}
                    onChange={(event) =>
                      updateProduct("camera_megapixels", event.target.value)
                    }
                  />
                </label>
                <label>
                  شبکه
                  <select
                    value={product.network}
                    onChange={(event) =>
                      updateProduct("network", event.target.value)
                    }
                  >
                    <option value="4g">4G</option>
                    <option value="5g">5G</option>
                  </select>
                </label>
                <label className="wide">
                  ظرفیت باتری
                  <input
                    required
                    type="number"
                    min="1"
                    value={product.battery_mah}
                    onChange={(event) =>
                      updateProduct("battery_mah", event.target.value)
                    }
                  />
                </label>
              </>
            )}
            <label className="wide">
              توضیح کوتاه
              <input
                value={product.short_description}
                maxLength={280}
                onChange={(event) =>
                  updateProduct("short_description", event.target.value)
                }
              />
            </label>
            <label className="wide">
              توضیحات
              <textarea
                value={product.description}
                onChange={(event) =>
                  updateProduct("description", event.target.value)
                }
              />
            </label>
            <label className="wide">
              تصویرهای کالا
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  setImages(Array.from(event.target.files ?? []))
                }
              />
            </label>
            <label className="wide">
              متن جایگزین تصویرها
              <input
                value={imageAltText}
                maxLength={180}
                onChange={(event) => setImageAltText(event.target.value)}
                placeholder="مثلاً نمای روبه‌روی محصول"
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={pending || !categories.length}
            >
              ایجاد کالا
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function AdminProductsPage({ user }: { user: AuthUser | null }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function loadProducts(search = query) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const response = await fetchAuthenticated(
      `/api/v1/catalog/admin/products/list/${params.size ? `?${params}` : ""}`,
    );
    if (!response.ok) throw new Error(await getError(response));
    setProducts((await response.json()) as AdminProduct[]);
  }

  useEffect(() => {
    if (user?.role !== "admin") return;
    Promise.all([
      loadProducts(""),
      fetchAuthenticated("/api/v1/catalog/admin/categories/").then(
        async (response) => {
          if (!response.ok) throw new Error(await getError(response));
          return response.json() as Promise<Category[]>;
        },
      ),
    ])
      .then(([, categoryData]) => setCategories(categoryData))
      .catch((reason) =>
        setMessage(
          reason instanceof Error
            ? reason.message
            : "دریافت کالاها ناموفق بود.",
        ),
      );
  }, [user?.id, user?.role]);

  if (user?.role !== "admin")
    return (
      <PageState title="دسترسی ندارید" text="این بخش فقط برای مدیران است." />
    );

  async function searchProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      await loadProducts();
      setSelectedProduct(null);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "جست‌وجوی کالا ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetchAuthenticated(
        `/api/v1/catalog/admin/products/${encodeURIComponent(selectedProduct.slug)}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: selectedProduct.category,
            name: selectedProduct.name,
            brand: selectedProduct.brand,
            short_description: selectedProduct.short_description,
            price: selectedProduct.price,
            stock_quantity: selectedProduct.stock_quantity,
            status: selectedProduct.status,
          }),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      const updated = (await response.json()) as Partial<AdminProduct>;
      const categoryName =
        categories.find((category) => category.id === selectedProduct.category)
          ?.name ?? selectedProduct.category_name;
      const nextProduct = {
        ...selectedProduct,
        ...updated,
        category_name: categoryName,
      } as AdminProduct;
      setSelectedProduct(nextProduct);
      setProducts((items) =>
        items.map((item) => (item.id === nextProduct.id ? nextProduct : item)),
      );
      setMessage("تغییرات کالا ذخیره شد.");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "ویرایش کالا ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!confirm(`کالای «${product.name}» حذف شود؟`)) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetchAuthenticated(
        `/api/v1/catalog/admin/products/${encodeURIComponent(product.slug)}/`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(await getError(response));
      setProducts((items) => items.filter((item) => item.id !== product.id));
      if (selectedProduct?.id === product.id) setSelectedProduct(null);
      setMessage("کالا حذف شد.");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "حذف کالا ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="profile-page admin-catalog-page">
      <div className="page-heading">
        <p className="eyebrow">مدیریت کاتالوگ</p>
        <h1>مدیریت کالاها</h1>
        <p>کالاها را جست‌وجو، ویرایش یا حذف کن.</p>
      </div>
      {message && <p className="orders-state error">{message}</p>}
      <section className="orders-section admin-products-section">
        <form className="admin-product-search" onSubmit={searchProducts}>
          <label>
            جست‌وجوی کالا
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="نام، برند، کد کالا یا توضیح کوتاه"
            />
          </label>
          <button
            className="button button-primary"
            type="submit"
            disabled={pending}
          >
            جست‌وجو
          </button>
        </form>
        <div className="admin-products-list">
          {products.map((product) => (
            <article className="admin-product-row" key={product.id}>
              {product.primary_image ? (
                <img
                  src={resolveMediaUrl(product.primary_image) ?? undefined}
                  alt={product.name}
                />
              ) : (
                <div className="admin-product-image-placeholder">کالا</div>
              )}
              <div>
                <strong>{product.name}</strong>
                <span>{product.brand || product.category_name}</span>
                <small>{formatPrice(product.price)} تومان</small>
              </div>
              <div className="admin-product-row-meta">
                <span>{product.stock_quantity} عدد موجود</span>
                <span>
                  {product.status === "published" ? "منتشرشده" : "پیش‌نویس"}
                </span>
              </div>
              <div className="admin-product-row-actions">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                >
                  ویرایش
                </button>
                <button
                  className="danger"
                  type="button"
                  disabled={pending}
                  onClick={() => void deleteProduct(product)}
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
          {!products.length && <p className="orders-state">کالایی پیدا نشد.</p>}
        </div>
      </section>
      {selectedProduct && (
        <section className="orders-section admin-product-edit-section">
          <div className="orders-heading">
            <h2>ویرایش کالا</h2>
            <button type="button" onClick={() => setSelectedProduct(null)}>
              بستن
            </button>
          </div>
          <form className="admin-product-form" onSubmit={saveProduct}>
            <label>
              نام کالا
              <input
                required
                value={selectedProduct.name}
                onChange={(event) =>
                  setSelectedProduct((current) =>
                    current
                      ? { ...current, name: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label>
              دسته‌بندی
              <select
                value={selectedProduct.category}
                onChange={(event) =>
                  setSelectedProduct((current) =>
                    current
                      ? { ...current, category: Number(event.target.value) }
                      : current,
                  )
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              برند
              <input
                value={selectedProduct.brand}
                onChange={(event) =>
                  setSelectedProduct((current) =>
                    current
                      ? { ...current, brand: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label>
              قیمت
              <input
                required
                min="0"
                type="number"
                value={selectedProduct.price}
                onChange={(event) =>
                  setSelectedProduct((current) =>
                    current
                      ? { ...current, price: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label>
              موجودی
              <input
                required
                min="0"
                type="number"
                value={selectedProduct.stock_quantity}
                onChange={(event) =>
                  setSelectedProduct((current) =>
                    current
                      ? {
                          ...current,
                          stock_quantity: Number(event.target.value),
                        }
                      : current,
                  )
                }
              />
            </label>
            <label>
              وضعیت
              <select
                value={selectedProduct.status}
                onChange={(event) =>
                  setSelectedProduct((current) =>
                    current
                      ? {
                          ...current,
                          status: event.target.value as AdminProduct["status"],
                        }
                      : current,
                  )
                }
              >
                <option value="draft">پیش‌نویس</option>
                <option value="published">منتشرشده</option>
                <option value="archived">بایگانی‌شده</option>
              </select>
            </label>
            <label className="wide">
              توضیح کوتاه
              <textarea
                value={selectedProduct.short_description}
                onChange={(event) =>
                  setSelectedProduct((current) =>
                    current
                      ? { ...current, short_description: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={pending}
            >
              ذخیرهٔ تغییرات
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function AdminReviewsPage({ user }: { user: AuthUser | null }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(
    null,
  );
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewStatus, setReviewStatus] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchAuthenticated("/api/v1/catalog/admin/products/list/")
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json() as Promise<AdminProduct[]>;
      })
      .then(setProducts)
      .catch((reason) =>
        setMessage(
          reason instanceof Error
            ? reason.message
            : "دریافت کالاها ناموفق بود.",
        ),
      );
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!selectedProduct) {
      setReviews([]);
      return;
    }
    const params = reviewStatus ? `?status=${reviewStatus}` : "";
    fetchAuthenticated(
      `/api/v1/catalog/admin/products/${encodeURIComponent(selectedProduct.slug)}/reviews/${params}`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return response.json() as Promise<{ results: AdminReview[] }>;
      })
      .then((data) => setReviews(data.results))
      .catch((reason) =>
        setMessage(
          reason instanceof Error ? reason.message : "دریافت نظرها ناموفق بود.",
        ),
      );
  }, [selectedProduct?.slug, reviewStatus]);

  if (user?.role !== "admin")
    return (
      <PageState title="دسترسی ندارید" text="این بخش فقط برای مدیران است." />
    );

  async function moderateReview(
    review: AdminReview,
    moderation_status: "approved" | "rejected",
  ) {
    setPending(true);
    try {
      const response = await fetchAuthenticated(
        `/api/v1/catalog/admin/reviews/${review.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moderation_status }),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      const updated = (await response.json()) as AdminReview;
      setReviews((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "به‌روزرسانی نظر ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="profile-page admin-catalog-page">
      <div className="page-heading">
        <p className="eyebrow">مدیریت نظرها</p>
        <h1>نظرهای هر محصول</h1>
        <p>
          ابتدا کالا را انتخاب کن؛ فقط commentهای همان کالا نمایش داده می‌شوند.
        </p>
      </div>
      {message && <p className="orders-state error">{message}</p>}
      <section className="orders-section">
        <div className="admin-product-picker">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className={
                selectedProduct?.id === product.id ? "active" : undefined
              }
              onClick={() => setSelectedProduct(product)}
            >
              <strong>{product.name}</strong>
              <span>{product.review_count} نظر</span>
            </button>
          ))}
        </div>
      </section>
      {selectedProduct && (
        <section className="orders-section admin-product-reviews-section">
          <div className="orders-heading">
            <h2>نظرهای {selectedProduct.name}</h2>
            <select
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value)}
            >
              <option value="">همه</option>
              <option value="approved">نمایش‌داده‌شده</option>
              <option value="rejected">ردشده</option>
            </select>
          </div>
          <div className="admin-reviews-list">
            {reviews.map((review) => (
              <article className="order-card" key={review.id}>
                <div className="order-card-header">
                  <div>
                    <strong>{review.customer_name}</strong>
                    <span dir="ltr">{review.customer_phone}</span>
                  </div>
                  <span className={`review-status ${review.moderation_status}`}>
                    {review.moderation_status === "approved"
                      ? "نمایش داده می‌شود"
                      : "رد شده"}
                  </span>
                </div>
                <p>{review.body}</p>
                <div className="admin-review-actions">
                  <button
                    type="button"
                    disabled={
                      pending || review.moderation_status === "approved"
                    }
                    onClick={() => void moderateReview(review, "approved")}
                  >
                    تأیید
                  </button>
                  <button
                    type="button"
                    disabled={
                      pending || review.moderation_status === "rejected"
                    }
                    onClick={() => void moderateReview(review, "rejected")}
                  >
                    رد
                  </button>
                </div>
              </article>
            ))}
            {!reviews.length && (
              <p className="orders-state">نظری برای این کالا وجود ندارد.</p>
            )}
          </div>
        </section>
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
                      <strong dir="ltr">{order.order_code}</strong>
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
                      <dd>{formatPrice(order.total)} تومان</dd>
                    </div>
                  </dl>
                  <div className="admin-order-footer">
                    <span>{orderItemCount(order)} قلم کالا</span>
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
                    <AppLink
                      className="order-detail-link"
                      href={`/admin/orders/${encodeURIComponent(order.order_code)}`}
                    >
                      جزئیات سفارش
                    </AppLink>
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

function ProductReviews({
  slug,
  initialSummary,
  user,
  onSignIn,
}: {
  slug: string;
  initialSummary: ProductDetail["rating_summary"];
  user: AuthUser | null;
  onSignIn: () => void;
}) {
  const [reviews, setReviews] = useState<ProductReviewsResponse | null>(null);
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [selectedScore, setSelectedScore] = useState(5);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pending, setPending] = useState(false);
  const [ratingPending, setRatingPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  useEffect(() => {
    if (!user) {
      setMyScore(null);
      return;
    }
    const controller = new AbortController();
    fetchAuthenticated(
      `/api/v1/catalog/products/${encodeURIComponent(slug)}/rating/`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: ProductRatingResponse) => {
        setSummary({ average: data.average, count: data.count });
        setMyScore(data.my_score);
        if (data.my_score !== null) setSelectedScore(data.my_score);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [slug, user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `${apiBaseUrl}/api/v1/catalog/products/${encodeURIComponent(slug)}/reviews/`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: ProductReviewsResponse) => setReviews(data))
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError("دریافت نظرها ناموفق بود.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, refreshKey]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetchAuthenticated(
        `/api/v1/catalog/products/${encodeURIComponent(slug)}/reviews/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      setBody("");
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "ثبت نظر ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitRating() {
    if (!user) {
      onSignIn();
      return;
    }
    setRatingPending(true);
    setError("");
    try {
      const response = await fetchAuthenticated(
        `/api/v1/catalog/products/${encodeURIComponent(slug)}/rating/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: selectedScore }),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      const data = (await response.json()) as ProductRatingResponse;
      setSummary({ average: data.average, count: data.count });
      setMyScore(data.my_score);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "ثبت امتیاز ناموفق بود.",
      );
    } finally {
      setRatingPending(false);
    }
  }

  async function submitReply(
    event: FormEvent<HTMLFormElement>,
    parent: number,
  ) {
    event.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetchAuthenticated(
        `/api/v1/catalog/products/${encodeURIComponent(slug)}/reviews/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: replyBody, parent }),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      setReplyTo(null);
      setReplyBody("");
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "ثبت پاسخ ناموفق بود.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="product-reviews"
      aria-labelledby="product-reviews-title"
    >
      <header className="product-reviews-header">
        <div>
          <p className="eyebrow">تجربه خریداران</p>
          <h2 id="product-reviews-title">نظرها و امتیاز کاربران</h2>
        </div>
        <div
          className="rating-summary"
          aria-label={`میانگین امتیاز ${summary.average} از ۵`}
        >
          <strong>{summary.average.toLocaleString("fa-IR")}</strong>
          <span>★ از ۵</span>
          <small>{summary.count.toLocaleString("fa-IR")} نظر</small>
        </div>
      </header>

      {!user ? (
        <div className="review-auth-prompt">
          <p>برای ثبت نظر، پاسخ یا امتیاز، ابتدا وارد حساب کاربری شوید.</p>
          <button
            className="button button-primary"
            type="button"
            onClick={onSignIn}
          >
            ورود و ثبت نظر
          </button>
        </div>
      ) : (
        <>
          <div className="user-rating-control">
            <div className="rating-picker" aria-label="امتیاز شما">
              <span>
                {myScore === null ? "امتیاز شما" : "امتیاز ثبت‌شدهٔ شما"}
              </span>
              <div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    className={value <= selectedScore ? "selected" : undefined}
                    type="button"
                    key={value}
                    aria-label={`${value} ستاره`}
                    aria-pressed={value === selectedScore}
                    onClick={() => setSelectedScore(value)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <button
              className="button button-secondary"
              type="button"
              disabled={ratingPending}
              onClick={() => void submitRating()}
            >
              {ratingPending ? "در حال ثبت…" : "ثبت امتیاز"}
            </button>
          </div>
          <form className="review-form" onSubmit={submitReview}>
            <label>
              تجربهٔ شما از این محصول
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={1500}
                placeholder="نکات مثبت، نقاط قابل بهبود و تجربهٔ استفاده را بنویسید…"
                required
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={pending}
            >
              {pending ? "در حال ثبت…" : "ثبت نظر"}
            </button>
          </form>
        </>
      )}
      {error && <p className="review-message error">{error}</p>}
      {loading ? (
        <p className="reviews-state">در حال دریافت نظرها…</p>
      ) : reviews?.results.length ? (
        <div className="reviews-list">
          {reviews.results.map((review) => (
            <article className="review-card" key={review.id}>
              <header>
                <div>
                  <strong>{review.author_label}</strong>
                  <time>{formatDate(review.created_at)}</time>
                </div>
              </header>
              <p>{review.body}</p>
              <button
                className="reply-trigger"
                type="button"
                onClick={() => {
                  if (!user) onSignIn();
                  else setReplyTo(replyTo === review.id ? null : review.id);
                }}
              >
                پاسخ
              </button>
              {review.replies.length > 0 && (
                <div className="review-replies">
                  {review.replies.map((reply) => (
                    <article key={reply.id}>
                      <header>
                        <strong>{reply.author_label}</strong>
                        <time>{formatDate(reply.created_at)}</time>
                      </header>
                      <p>{reply.body}</p>
                    </article>
                  ))}
                </div>
              )}
              {replyTo === review.id && user && (
                <form
                  className="reply-form"
                  onSubmit={(event) => void submitReply(event, review.id)}
                >
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    maxLength={1500}
                    placeholder="پاسخ خود را بنویسید…"
                    required
                  />
                  <div>
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={pending}
                    >
                      {pending ? "در حال ثبت…" : "ثبت پاسخ"}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => setReplyTo(null)}
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="reviews-state">هنوز نظری برای این محصول ثبت نشده است.</p>
      )}
    </section>
  );
}

function ProductPage({
  slug,
  addToCart,
  user,
  onSignIn,
}: {
  slug: string;
  addToCart: (productId: number) => Promise<void>;
  user: AuthUser | null;
  onSignIn: () => void;
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
          {product.specifications && (
            <dl className="product-specifications">
              {Object.entries(product.specifications).map(([key, value]) => {
                if (value === "" || value === undefined) return null;
                const suffix =
                  key === "ram_gb" || key === "storage_gb"
                    ? " گیگابایت"
                    : key === "camera_megapixels"
                      ? " مگاپیکسل"
                      : key === "battery_mah"
                        ? " میلی‌آمپرساعت"
                        : key === "display_size_inches"
                          ? " اینچ"
                          : "";
                return (
                  <div key={key}>
                    <dt>{specificationLabels[key] ?? key}</dt>
                    <dd>{`${value}${suffix}`}</dd>
                  </div>
                );
              })}
            </dl>
          )}
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
      <ProductReviews
        slug={product.slug}
        initialSummary={product.rating_summary}
        user={user}
        onSignIn={onSignIn}
      />
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

function SiteFooter() {
  return (
    <footer id="about" className="site-footer">
      <div className="footer-top">
        <AppLink href="/" className="brand">
          <span className="brand-mark">n</span>
          <span>نوکسا</span>
        </AppLink>
        <p>انتخاب آگاهانه برای خرید روزمرهٔ تکنولوژی.</p>
        <button
          type="button"
          className="back-to-top"
          onClick={() => scrollTo({ top: 0, behavior: "smooth" })}
        >
          بازگشت به بالا <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="footer-grid">
        <section>
          <h3>خرید از نوکسا</h3>
          <AppLink href="/products">همهٔ کالاها</AppLink>
          <AppLink href="/products?type=laptop">لپ‌تاپ</AppLink>
          <AppLink href="/products?type=mobile">موبایل</AppLink>
        </section>
        <section>
          <h3>حساب کاربری</h3>
          <AppLink href="/profile">پروفایل من</AppLink>
          <AppLink href="/cart">سبد خرید</AppLink>
          <AppLink href="/checkout">پیگیری سفارش</AppLink>
        </section>
        <section>
          <h3>چرا نوکسا</h3>
          <span>ضمانت اصالت کالا</span>
          <span>ارسال سریع و مطمئن</span>
          <span>پشتیبانی پاسخ‌گو</span>
        </section>
        <section className="footer-support">
          <Icon name="support" size={24} />
          <div>
            <strong>پشتیبانی نوکسا</strong>
            <span>هر روز، از ۹ تا ۲۱</span>
          </div>
        </section>
      </div>
      <div className="footer-bottom">
        <span>© ۱۴۰۵ نوکسا. تمامی حقوق محفوظ است.</span>
        <span>حریم خصوصی · شرایط استفاده</span>
      </div>
    </footer>
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
  function updateStoredUser(nextUser: AuthUser) {
    const auth = getStoredAuth();
    if (auth) {
      sessionStorage.setItem(
        "nexora-auth",
        JSON.stringify({ ...auth, user: nextUser }),
      );
    }
    setUser(nextUser);
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
        user={user}
        onSignIn={() => setAuthOpen(true)}
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
        onUserUpdated={updateStoredUser}
        onSignOut={() => {
          sessionStorage.removeItem("nexora-auth");
          setUser(null);
          setCart(null);
          setChatOpen(false);
          navigate("/");
        }}
      />
    ) : route.name === "order-detail" ? (
      <OrderDetailPage
        user={user}
        orderCode={route.orderCode}
        adminView={route.adminView}
      />
    ) : route.name === "admin-dashboard" ? (
      <AdminDashboardPage user={user} />
    ) : route.name === "admin-orders" ? (
      <AdminOrdersPage user={user} />
    ) : route.name === "admin-catalog" ? (
      <AdminCatalogPage user={user} />
    ) : route.name === "admin-products" ? (
      <AdminProductsPage user={user} />
    ) : route.name === "admin-reviews" ? (
      <AdminReviewsPage user={user} />
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
      <SiteFooter />
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
