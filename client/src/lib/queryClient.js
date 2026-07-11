import { QueryClient } from "@tanstack/react-query";

// Every customer-visible error goes through this one place. The contract:
// err.message is always a clean, plain-language string — never raw JSON,
// never an implementation detail — safe to render directly in a toast,
// banner, or inline field message with no further parsing. Callers that
// need the full structured error body (e.g. rowErrors, hint,
// validationErrors) read err.body instead of re-parsing err.message.
//
// Previously err.message was the raw response text, so about half the
// app's ~20 mutation error handlers had to remember to JSON.parse it
// before display and about half didn't — the ones that didn't leaked
// literal JSON to customers (most visibly on Login: a wrong password
// rendered as `{"message":"Invalid credentials"}`). Centralizing this
// closes every existing instance in one place and removes the trap for
// every future call site, since apiRequest/getQueryFn are the sole choke
// point every request goes through.
function extractMessage(body, fallback) {
  if (body && typeof body === "object") {
    if (typeof body.message === "string" && body.message) return body.message;
    // MAINT-002: response-shape isn't fully consistent across endpoints
    // (e.g. some return { error } instead of { message }) — fall back to
    // it rather than surfacing "Something went wrong" when a perfectly
    // good plain-language string is sitting right there under a
    // different key.
    if (typeof body.error === "string" && body.error) return body.error;
  }
  return fallback;
}

async function throwIfResNotOk(res) {
  if (!res.ok) {
    const text = (await res.text().catch(() => "")) || res.statusText;
    let body = null;
    try { body = JSON.parse(text); } catch {}
    const message = extractMessage(body, text || "Something went wrong. Please try again.");
    const err = new Error(message);
    err.status = res.status;
    err.body = body; // full structured payload, when the response was JSON
    throw err;
  }
}

export async function apiRequest(method, url, data) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export const getQueryFn = ({ on401: unauthorizedBehavior }) => async ({ queryKey }) => {
  const res = await fetch(queryKey.join("/"), {
    credentials: "include",
  });

  if (unauthorizedBehavior === "returnNull" && res.status === 401) {
    return null;
  }

  await throwIfResNotOk(res);
  return await res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
