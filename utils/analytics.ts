// Google Analytics 4 Utility Module
// Type-safe event tracking for accurate analytics

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Check if GA is loaded and enabled
export const isGAEnabled = (): boolean => {
  return (
    typeof window !== "undefined" &&
    typeof window.gtag === "function" &&
    !!import.meta.env.VITE_GA_MEASUREMENT_ID
  );
};

// Initialize GA (called automatically by gtag.js in index.html)
export const initGA = () => {
  if (!isGAEnabled()) {
    console.warn(
      "Google Analytics not enabled - missing VITE_GA_MEASUREMENT_ID",
    );
    return;
  }
  console.log("Google Analytics initialized");
};

// Track page views (automatic, but can be called manually for SPA routing)
export const trackPageView = (path: string, title?: string) => {
  if (!isGAEnabled()) return;

  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
  });
};

// E-commerce Events

interface MenuItem {
  id: string;
  name: string;
  price: string;
  category?: string;
}

export const trackViewItem = (item: MenuItem) => {
  if (!isGAEnabled()) return;

  const priceNumber = parseInt(item.price.replace(/\D/g, "")) || 0;

  window.gtag("event", "view_item", {
    currency: "IDR",
    value: priceNumber,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price: priceNumber,
        item_category: item.category || "Coffee",
        quantity: 1,
      },
    ],
  });
};

export const trackAddToCart = (item: MenuItem, quantity: number = 1) => {
  if (!isGAEnabled()) return;

  const priceNumber = parseInt(item.price.replace(/\D/g, "")) || 0;

  window.gtag("event", "add_to_cart", {
    currency: "IDR",
    value: priceNumber * quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price: priceNumber,
        item_category: item.category || "Coffee",
        quantity: quantity,
      },
    ],
  });
};

export const trackRemoveFromCart = (item: MenuItem, quantity: number = 1) => {
  if (!isGAEnabled()) return;

  const priceNumber = parseInt(item.price.replace(/\D/g, "")) || 0;

  window.gtag("event", "remove_from_cart", {
    currency: "IDR",
    value: priceNumber * quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price: priceNumber,
        item_category: item.category || "Coffee",
        quantity: quantity,
      },
    ],
  });
};

interface CartItem extends MenuItem {
  quantity: number;
}

export const trackViewCart = (items: CartItem[], totalPrice: number) => {
  if (!isGAEnabled()) return;

  window.gtag("event", "view_cart", {
    currency: "IDR",
    value: totalPrice,
    items: items.map((item) => {
      const priceNumber = parseInt(item.price.replace(/\D/g, "")) || 0;
      return {
        item_id: item.id,
        item_name: item.name,
        price: priceNumber,
        item_category: item.category || "Coffee",
        quantity: item.quantity,
      };
    }),
  });
};

export const trackBeginCheckout = (
  items: CartItem[],
  totalPrice: number,
  orderType: string,
) => {
  if (!isGAEnabled()) return;

  window.gtag("event", "begin_checkout", {
    currency: "IDR",
    value: totalPrice,
    order_type: orderType,
    items: items.map((item) => {
      const priceNumber = parseInt(item.price.replace(/\D/g, "")) || 0;
      return {
        item_id: item.id,
        item_name: item.name,
        price: priceNumber,
        item_category: item.category || "Coffee",
        quantity: item.quantity,
      };
    }),
  });
};

export const trackCheckoutWhatsApp = (
  items: CartItem[],
  totalPrice: number,
  orderType: string,
  hasDeliveryAddress: boolean,
) => {
  if (!isGAEnabled()) return;

  window.gtag("event", "checkout_whatsapp", {
    currency: "IDR",
    value: totalPrice,
    order_type: orderType,
    has_delivery_address: hasDeliveryAddress,
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    items: items.map((item) => {
      const priceNumber = parseInt(item.price.replace(/\D/g, "")) || 0;
      return {
        item_id: item.id,
        item_name: item.name,
        price: priceNumber,
        item_category: item.category || "Coffee",
        quantity: item.quantity,
      };
    }),
  });
};

// AI Barista Events

export const trackAIBaristaOpen = () => {
  if (!isGAEnabled()) return;

  window.gtag("event", "ai_barista_open", {
    event_category: "engagement",
    event_label: "AI Barista Modal Opened",
  });
};

export const trackAIBaristaQuery = (
  queryLength: number,
  hasResponse: boolean,
) => {
  if (!isGAEnabled()) return;

  window.gtag("event", "ai_barista_query", {
    event_category: "engagement",
    event_label: "AI Barista Query Submitted",
    query_length: queryLength,
    has_response: hasResponse,
  });
};

export const trackAIBaristaClose = () => {
  if (!isGAEnabled()) return;

  window.gtag("event", "ai_barista_close", {
    event_category: "engagement",
    event_label: "AI Barista Modal Closed",
  });
};

// Contact Form Events

export const trackContactFormSubmit = (messageLength: number) => {
  if (!isGAEnabled()) return;

  window.gtag("event", "contact_form_submit", {
    event_category: "engagement",
    event_label: "Contact Form Submitted",
    message_length: messageLength,
  });
};

// Navigation Events

export const trackNavigation = (sectionName: string) => {
  if (!isGAEnabled()) return;

  window.gtag("event", "nav_click", {
    event_category: "navigation",
    event_label: sectionName,
    section: sectionName,
  });
};

// Generic Event Tracking

export const trackEvent = (
  eventName: string,
  eventParams?: { [key: string]: any },
) => {
  if (!isGAEnabled()) return;

  window.gtag("event", eventName, eventParams);
};
