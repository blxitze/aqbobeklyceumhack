import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER
) {
  pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  });
}

export { pusherClient };
