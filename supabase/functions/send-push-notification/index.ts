import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Auth guard: only the service_role_key (sent by the DB trigger) is accepted ---
function isServiceRole(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!serviceRoleKey && token === serviceRoleKey;
}

// Cache du token OAuth2 FCM
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && now < tokenExpiresAt - 60) {
    return cachedAccessToken;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signedToken = `${unsignedToken}.${btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")}`;

  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedToken}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`OAuth2 token exchange failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = now + (tokenData.expires_in || 3600);

  return cachedAccessToken!;
}

async function sendToFCM(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string; unregistered?: boolean }> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const stringData: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    stringData[key] =
      typeof value === "string" ? value : JSON.stringify(value);
  }

  const message = {
    message: {
      token: deviceToken,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high" as const,
        notification: { sound: "default", channel_id: "winenote_default" },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1,
          },
        },
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      return { success: true };
    }

    const errorBody = await response.json();
    const errorCode = errorBody?.error?.details?.[0]?.errorCode;

    if (
      errorCode === "UNREGISTERED" ||
      errorCode === "INVALID_ARGUMENT" ||
      response.status === 404
    ) {
      return { success: false, error: errorCode, unregistered: true };
    }

    return {
      success: false,
      error: `FCM error ${response.status}: ${JSON.stringify(errorBody)}`,
    };
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

// Types de notifications configurables
const CONFIGURABLE_TYPES = [
  "post_like", "post_comment", "mention", "follow_request",
  "new_follower", "follow_accepted", "event_join",
  "event_access_request", "event_invitation",
  "cellar_invitation", "refund_request",
];

/**
 * Vérifie si un type de notification est activé pour un token donné.
 * Fallback : préférences globales (token_id IS NULL), puis true par défaut.
 */
function isTypeEnabled(
  type: string,
  devicePrefs: Record<string, boolean> | null,
  globalPrefs: Record<string, boolean> | null
): boolean {
  if (!CONFIGURABLE_TYPES.includes(type)) return true;

  // Priorité : prefs device > prefs globales > true
  const prefs = devicePrefs ?? globalPrefs;
  if (!prefs) return true;

  return prefs[type] !== false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Reject requests that don't carry the service_role_key
  if (!isServiceRole(req)) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: "user_id et title sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationType = data?.type || "";

    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT_KEY non configuré");
      return new Response(
        JSON.stringify({ error: "Push notifications non configurées" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer tous les tokens de l'utilisateur
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("push_notification_token")
      .select("id, device_token, platform")
      .eq("user_id", user_id);

    if (tokensError) {
      console.error("Erreur récupération tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Erreur récupération tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Aucun token enregistré" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer les préférences de notification (globales + par device)
    const tokenIds = tokens.map((t) => t.id);
    const { data: allPrefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("token_id, post_like, post_comment, mention, follow_request, new_follower, follow_accepted, event_join, event_access_request, event_invitation, cellar_invitation, refund_request")
      .eq("user_id", user_id);

    // Séparer prefs globales et par device
    let globalPrefs: Record<string, boolean> | null = null;
    const devicePrefsMap = new Map<string, Record<string, boolean>>();

    if (allPrefs) {
      for (const pref of allPrefs) {
        const prefObj: Record<string, boolean> = {};
        for (const key of CONFIGURABLE_TYPES) {
          if (key in pref) {
            prefObj[key] = (pref as any)[key];
          }
        }
        if (pref.token_id === null) {
          globalPrefs = prefObj;
        } else {
          devicePrefsMap.set(pref.token_id, prefObj);
        }
      }
    }

    const accessToken = await getAccessToken(serviceAccount);

    const results = [];
    const tokensToDelete: string[] = [];

    for (const token of tokens) {
      // Vérifier les préférences pour ce device
      const devicePrefs = devicePrefsMap.get(token.id) || null;
      if (!isTypeEnabled(notificationType, devicePrefs, globalPrefs)) {
        results.push({ token_id: token.id, platform: token.platform, success: false, skipped: true, reason: "disabled_by_preferences" });
        continue;
      }

      const result = await sendToFCM(
        accessToken,
        projectId,
        token.device_token,
        title,
        body || "",
        data || {}
      );

      results.push({ token_id: token.id, platform: token.platform, ...result });

      if (result.unregistered) {
        tokensToDelete.push(token.id);
      }
    }

    // Nettoyer les tokens invalides
    if (tokensToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("push_notification_token")
        .delete()
        .in("id", tokensToDelete);

      if (deleteError) {
        console.error("Erreur nettoyage tokens:", deleteError);
      } else {
        console.log(`${tokensToDelete.length} token(s) invalide(s) supprimé(s)`);
      }
    }

    const sent = results.filter((r) => r.success).length;
    const skipped = results.filter((r) => (r as any).skipped).length;
    console.log(
      `Push envoyé à ${sent}/${tokens.length} appareil(s) pour user ${user_id} (${skipped} ignoré(s) par préférences)`
    );

    return new Response(
      JSON.stringify({ success: true, sent, skipped, total: tokens.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erreur send-push-notification:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
