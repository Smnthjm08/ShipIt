import fs from "fs";
import path from "path";

/**
 * Never publish these, even if they sit inside the output directory. A project
 * whose output dir is the repo root (a plain static site with no build step)
 * would otherwise upload the `.env` we inject and serve it to the world.
 */
const isSecretFile = (name: string) => name === ".env" || name.startsWith(".env.");
const isVcsDir = (name: string) => name === ".git";

export const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (isVcsDir(file)) return;
      getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (isSecretFile(file)) return;
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
};
