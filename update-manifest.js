const fs = require("fs");
const util = require("util");
const path = require("path");

const shaCmd = (() => {
  let cmd = "";
  switch (process.platform) {
    case "linux":
      return `sha256sum`;
    case "darwin":
      return `shasum`;
    default:
      throw new Error(
        `Platform ${process.platform} does not have a way to compute sha256 digests.`
      );
  }
})();

const makeEntry = async (dir, parsedFileName) => {
  const pathRelativeToRoot = path.join(dir, parsedFileName[0]);
  const absolutePath = path.join(__dirname, pathRelativeToRoot);
  const exec = util.promisify(require("child_process").exec);
  const { stdout } = await exec(`${shaCmd} ${absolutePath}`);
  const sha256 = stdout.split(/\s+/)[0];

  return {
    path: parsedFileName[0],
    version: parsedFileName[1],
    hardwareSupport: [
      {
        model: "HP100",
        version: "1.0",
      },
    ],
    sha256,
  };
};

const RELEASES_DIR = path.join(__dirname, "hp100");
fs.readdir(RELEASES_DIR, { withFileTypes: true }, async (err, files) => {
  if (err) {
    throw err;
  }
  
  console.log(files);

  const binaryPrefix = "hp100-firmware";
  const binaryExtensions = [".hex"];

  // Descending order, recent first
  const releases = (
    await Promise.all(
      files
        .map((file) => {
          return file.name;
        })
        .map((file) => {
          const escapedExtensions = binaryExtensions.map((binaryExtension) => {
            return binaryExtension.replace(".", "\\.");
          });
          return file.match(
            new RegExp(
              "^" +
                binaryPrefix +
                "-v([0-9.]*)(" +
                escapedExtensions.join("|") +
                ")$"
            )
          );
        })
        .filter(Boolean)
        .map(async (pars) => {
          return await makeEntry(RELEASES_DIR, pars);
        })
    )
  ).sort((a, b) => {
    if (a.version === b.version) {
      return 0;
    }

    // Slightly modified from https://github.com/substack/semver-compare/blob/master/index.js
    const simpleSemverCompare = (a, b) => {
      const pa = a.split(".");
      const pb = b.split(".");
      for (let i = 0; i < 2; i++) {
        const na = Number(pa[i]);
        const nb = Number(pb[i]);
        if (na > nb) return 1;
        if (nb > na) return -1;
        if (!isNaN(na) && isNaN(nb)) return 1;
        if (isNaN(na) && !isNaN(nb)) return -1;
      }
      return 0;
    };

    return simpleSemverCompare(b.version, a.version);
  });

  const manifest = {
    latestRelease: releases[0].version,
    releases: releases.reduce((r, i) => {
      r[i.version] = i;
      return r;
    }, {}),
  };
  fs.writeFile(
    path.join(__dirname, dir, "/manifest.json"),
    JSON.stringify(manifest, null, 2),
    (err) => {
      if (err) {
        throw err;
      }
      console.log("Updated " + dir + "/manifest.json");
    }
  );
});
