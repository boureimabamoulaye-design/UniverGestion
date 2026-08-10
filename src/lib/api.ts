/**
 * Safe fetch wrapper that handles non-JSON responses and network errors gracefully
 * without throwing raw SyntaxError ("Unexpected token '<'...").
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; message?: string; error?: string; [key: string]: any }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await res.json();
      return json;
    } else {
      const text = await res.text();
      return {
        success: res.ok,
        error: "NON_JSON_RESPONSE",
        message: res.ok ? "Requête traitée avec succès." : `Erreur serveur (HTTP ${res.status}).`,
        details: text.slice(0, 200)
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: "NETWORK_ERROR",
      message: err?.message || "Erreur de communication réseau avec le serveur."
    };
  }
}
