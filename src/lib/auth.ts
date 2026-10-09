import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";

const client = new MongoClient(process.env.MONGODB_URI as string);
const db = client.db(process.env.DATABASE as string);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL, 
  database: mongodbAdapter(db, {
    client,
  }),
  plugins: [jwt()],
  emailAndPassword: {
    enabled: true,
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
    },
  },
});