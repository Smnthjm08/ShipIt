export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  owner: string;
  repoName: string;
  branch: string;
  framework: string | null;
  buildCommand: string | null;
  outputDir: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface GitHubInstallation {
  id: string;
  installationId: number;
  accountLogin: string;
  accountId: number;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
