#!/usr/bin/env node

"use strict";

const fs = require("fs");
const util = require("util");
const path = require("path");

async function makeEntry(dir, parsedFileName) {
  const pathRelativeToRoot = path.join(dir, parsedFileName[0]);
  const absolutePath = path.join(__dirname, pathRelativeToRoot);
  const exec = util.promisify(require("child_process").exec);
  const { stdout } = await exec(`shasum ${absolutePath}`);
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
}

function processDir(dir) {
  fs.readdir(
    path.join(__dirname, dir),
    { withFileTypes: true },
    async (err, files) => {
      if (err) {
        throw err;
      }

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
              const escapedExtensions = binaryExtensions.map(
                (binaryExtension) => {
                  return binaryExtension.replace(".", "\\.");
                }
              );
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
              return await makeEntry(dir, pars);
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
    }
  );
}

processDir("/hp100");
