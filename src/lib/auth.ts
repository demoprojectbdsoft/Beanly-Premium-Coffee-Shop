import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";

const client = new MongoClient(process.env.MONGODB_URI as string);
const db = client.db(process.env.DATABASE as string);

// The store API owns the SMTP mailbox, so the reset email is sent there.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

/**
 * Adds one line to the admin activity feed.
 *
 * Sign-ups and account deletions happen here in the app, not in the store API,
 * so this writes straight into the same `activities` collection the API reads.
 * It never throws: a notification problem must not fail a sign-up.
 */
const recordActivity = async (activity: {
  type: "user" | "user_deleted";
  title: string;
  detail?: string;
  ref?: string;
}) => {
  try {
    await db.collection("activities").insertOne({
      type: activity.type,
      title: activity.title,
      detail: activity.detail || "",
      ref: activity.ref || "",
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[activity] Could not save activity:", (err as Error).message);
  }
};

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL, 
  database: mongodbAdapter(db, {
    client,
  }),
  plugins: [jwt()],
  databaseHooks: {
    user: {
      create: {
        // A new account, whether the customer signed up with a password or
        // with Google.
        after: async (user) => {
          await recordActivity({
            type: "user",
            title: `New user ${user.name || user.email}`,
            detail: user.email,
            // The account id, so the bell opens exactly this customer instead
            // of every address that merely contains the same text.
            ref: user.id,
          });
        },
      },
      delete: {
        // The customer deleted their own account from Settings. An admin
        // deleting somebody goes through the store API instead.
        after: async (user) => {
          await recordActivity({
            type: "user_deleted",
            title: `${user.name || user.email} deleted their account`,
            detail: user.email,
          });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Must match "one hour" in the email: passwordResetEmail() on the server.
    resetPasswordTokenExpiresIn: 60 * 60,
    // A reset signs the account out everywhere, so a session stolen before the
    // reset cannot be used after it.
    revokeSessionsOnPasswordReset: true,
    /**
     * Called by better-auth with a link that already carries the token. The
     * email itself is sent by the API, which owns the mailbox, the template
     * and the store branding.
     */
    sendResetPassword: async ({ user, url }) => {
      if (!API_URL || !INTERNAL_API_KEY) {
        throw new Error(
          "Password reset is not configured: set NEXT_PUBLIC_API_URL and INTERNAL_API_KEY."
        );
      }

      const res = await fetch(`${API_URL}/mail/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": INTERNAL_API_KEY,
        },
        body: JSON.stringify({ email: user.email, name: user.name, url }),
      });

      // The API reports the mail server's own reason, such as a rejected login.
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message || `The reset email could not be sent (status ${res.status}).`
        );
      }
    },
  },
  socialProviders: {
        google: { 
            clientId: process.env.GOOGLE_CLIENT_ID as string, 
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
        }, 
    },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      role: {
        type: "string",
        input: false,
        defaultValue: "customer",
      },
      plan: {
        type: "string",
        input: false,
        defaultValue: "free",
      },
      status: {
        type: "string",
        input: false,
        defaultValue: "active",
      },
      member: {
        type: "string",
        input: false,
        defaultValue: "silver",
      },
      points: {
        type: "number",
        input: false,
        defaultValue: 0,
      },
      phone: {
        type: "string",
        required: false,
      },
      bio: {
        type: "string",
        required: false,
      },
      department: {
        type: "string",
        required: false,
      },
      /**
       * The marketplace state of the account. It is readable from the session
       * so the shell can show "Become a Vendor" or an application status, but
       * it is never writable from the browser: only the store API changes it,
       * and only an approval turns the account into a vendor.
       */
      vendorStatus: {
        type: "string",
        input: false,
        defaultValue: "none",
      },
      /**
       * The rider counterpart of `vendorStatus`. Same rule: readable from the
       * session so the shell can surface the "Become a Rider" entry or the
       * application banner, writable only through the store API.
       */
      riderStatus: {
        type: "string",
        input: false,
        defaultValue: "none",
      },
      /**
       * The dashboard the account is currently looking at.
       *
       * The store API mirrors this into the legacy `role` string. The session
       * only carries the hint — the actual authority comes from `roles`, and
       * the backend re-reads both on every request so a spoofed cookie can
       * never widen access.
       */
      activeRole: {
        type: "string",
        input: false,
        defaultValue: "customer",
      },
      /**
       * Every role the account has been approved for.
       *
       * A single user may hold `customer`, `rider` and `vendor` at the same
       * time. The array is the source of truth for authority — the switcher
       * in the profile menu only offers entries that appear here, and the
       * shopping rule requires `customer` to be present. Only the store API
       * writes it, after an admin approves an application.
       *
       * `type: "string[]"` with `input: false` keeps the field out of the
       * sign-up form; the migration in the store API fills it for existing
       * rows and the default covers a fresh customer registration.
       */
      roles: {
        type: "string[]",
        input: false,
        defaultValue: ["customer"],
      },
      /**
       * Roles the store team parked without closing the account.
       *
       * A JSON list of `{ role, reason, suspendedAt }` rows written only by
       * the store API's suspension desk. The session carries it so the
       * switcher can show a parked dashboard greyed out instead of offering a
       * switch the API would refuse.
       */
      roleSuspensions: {
        type: "json",
        input: false,
        defaultValue: [],
      },
    },
  },
});