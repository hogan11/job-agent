import { ApifyClient } from "apify-client";

const client = new ApifyClient({
  token: process.env.APIFY_TOKEN
});

export async function runActor(actorId, input) {
  console.log(`Running Apify actor: ${actorId}`);

  const run = await client.actor(actorId).call(input, {
    waitSecs: 300 // 5 minute timeout
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  console.log(`Actor ${actorId} returned ${items.length} items`);
  return items;
}

export async function runActorAsync(actorId, input) {
  console.log(`Starting Apify actor (async): ${actorId}`);

  const run = await client.actor(actorId).start(input);
  return run.id;
}

export async function getRunResults(runId) {
  const run = await client.run(runId).get();

  if (run.status !== "SUCCEEDED") {
    if (run.status === "RUNNING") {
      return { status: "RUNNING", items: [] };
    }
    throw new Error(`Run ${runId} failed with status: ${run.status}`);
  }

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return { status: "SUCCEEDED", items };
}

export default client;
