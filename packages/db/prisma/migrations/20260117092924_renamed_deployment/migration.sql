/*
  Warnings:

  - You are about to drop the `Deployment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Deployment" DROP CONSTRAINT "Deployment_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Log" DROP CONSTRAINT "Log_deploymentId_fkey";

-- DropTable
DROP TABLE "Deployment";

-- DropTable
DROP TABLE "Log";

-- CreateTable
CREATE TABLE "deployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_log" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "deployment" ADD CONSTRAINT "deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_log" ADD CONSTRAINT "deployment_log_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
