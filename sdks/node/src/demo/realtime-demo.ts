import assert from "assert";
import { KadoaClient } from "../kadoa-client";

const apiKey = process.env.KADOA_TEAM_API_KEY || process.env.KADOA_API_KEY;
assert(apiKey, "KADOA_API_KEY or KADOA_TEAM_API_KEY is not set");
assert(apiKey.startsWith("tk-"), "API key must be a team API key");

const client = new KadoaClient({
	apiKey,
	enableRealtime: true,
	realtimeConfig: {
		autoConnect: true,
		reconnectDelay: 5000,
		heartbeatInterval: 10000,
	},
});

console.log("Listening to realtime events...");
client.realtime?.onEvent((event) => {
	console.log(event);
});

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	client.dispose();
	process.exit(0);
});
