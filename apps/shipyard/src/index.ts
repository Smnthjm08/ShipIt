import { redisQueue } from "@workspace/shared/redis/queue";
import { redisPub } from "@workspace/shared/redis/publisher";
import prisma from "@workspace/db";

async function startWorker() {
  while (true) {
    console.log("starting shipyard...");

    const job = await redisQueue.brPop("deployment-id", 0);

    if (job) {
      console.log("job from redis queue", job);

      const deploymentId = job?.element;

      // TODO needs fix for here 
      //       ReferenceError: exports is not defined
      //     at file:///Users/smnthjm08/Desktop/ship-it/packages/db/src/generated/prisma/client.ts:48:23
      //     at ModuleJobSync.runSync (node:internal/modules/esm/module_job:400:35)
      //     at ModuleLoader.importSyncForRequire (node:internal/modules/esm/loader:427:47)
      //     at loadESMFromCJS (node:internal/modules/cjs/loader:1565:24)
      //     at Module.<anonymous> (node:internal/modules/cjs/loader:1716:5)
      //     at Module._compile (/Users/smnthjm08/Desktop/ship-it/node_modules/.pnpm/source-map-support@0.5.21/node_modules/source-map-support/source-map-support.js:568:25)
      //     at Module.m._compile (/private/tmp/ts-node-dev-hook-8800394743235367.js:69:33)
      //     at loadTS (node:internal/modules/cjs/loader:1826:10)
      //     at require.extensions.<computed> (/private/tmp/ts-node-dev-hook-8800394743235367.js:71:20)
      //     at Object.nodeDevHook [as .ts] (/Users/smnthjm08/Desktop/ship-it/node_modules/.pnpm/ts-node-dev@2.0.0_@types+node@20.19.9_typescript@5.9.2/node_modules/ts-node-dev/lib/hook.js:63:13)
      // [ERROR] 02:07:20 ReferenceError: exports is not defined
      // const deployment = await prisma.deployment.update({
      //   where: { id: deploymentId },
      //   data: { status: "building" },
      //   // include: {}
      // });

      // console.log("deployment", deployment);

      await redisPub.publish(`logs-${deploymentId}`, "Deployment Started...");

      // clone the repo
      // install dependencies
      // build
      // upload build
      // finish
    }

    return;
  }
}

startWorker();
